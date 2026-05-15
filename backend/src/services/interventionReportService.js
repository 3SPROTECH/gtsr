import fs from 'fs';
import path from 'path';
import { interventionReportRepository } from '../repositories/interventionReportRepository.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { notificationService } from './notificationService.js';
import { can } from '../domain/permissions.js';
import { BadRequest, Forbidden, NotFound } from '../utils/errors.js';

export const interventionReportService = {
  /**
   * Le technicien (ou ADMIN à sa place) dépose le rapport d'intervention du ticket.
   * Un seul rapport par ticket : nouvelle tentative => 400.
   * Notifie le demandeur + les admins.
   */
  async create(ticketId, description, files, actor) {
    if (!can(actor.role, 'interventionReport.create')) throw Forbidden();
    if (!description || description.trim().length < 3) {
      throw BadRequest('Description requise (min 3 caractères)');
    }

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound('Ticket introuvable');

    // Technicien : doit être l'assigné du ticket
    if (actor.role === 'TECHNICIAN' && ticket.assigneeId !== actor.id) {
      throw Forbidden('Ce ticket ne vous est pas assigné');
    }

    const existing = await interventionReportRepository.findByTicketId(ticketId);
    if (existing) throw BadRequest('Un rapport existe déjà pour ce ticket');

    // Snapshot du technicien (sinon ADMIN qui dépose à la place => l'assigné si présent)
    const technicianId = ticket.assigneeId || actor.id;

    const report = await interventionReportRepository.create({
      ticketId, technicianId, description, files,
    });

    await ticketRepository.recordHistory(ticketId, actor.id, 'interventionReport', '∅', 'created');
    await auditRepository.log({
      actorId: actor.id, action: 'REPORT_CREATE', entity: 'InterventionReport', entityId: report.id,
      metadata: { ticketNumber: ticket.number, files: files?.length || 0 },
    });

    // Notifier le demandeur + admins
    const targets = new Set();
    if (ticket.requesterId) targets.add(ticket.requesterId);
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const a of (admins.items ?? admins)) targets.add(a.id);

    for (const userId of targets) {
      const u = await userRepository.findById(userId);
      if (!u) continue;
      await notificationService.notify({
        userId: u.id, ticketId, email: u.email, channels: ['IN_APP'],
        title: `Rapport d'intervention - Ticket ${ticket.number}`,
        body: `${actor.firstName} ${actor.lastName} a déposé le rapport pour "${ticket.title}".`,
      });
    }

    return report;
  },

  /**
   * Liste des rapports.
   *  - ADMIN : tous + filtrage par technicien
   *  - TECHNICIAN : seulement les siens
   */
  async list(actor, { technicianId, ticketId, q, from, to, skip = 0, take = 50 } = {}) {
    const where = {};

    if (actor.role === 'TECHNICIAN') {
      where.technicianId = actor.id;
    } else if (actor.role === 'ADMIN') {
      if (technicianId) where.technicianId = technicianId;
    } else {
      throw Forbidden();
    }

    if (ticketId) where.ticketId = ticketId;
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { ticket: { number: { contains: q, mode: 'insensitive' } } },
        { ticket: { title:  { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      interventionReportRepository.list({ where, skip, take }),
      interventionReportRepository.count(where),
    ]);
    return { items, total };
  },

  async getById(id, actor) {
    const r = await interventionReportRepository.findById(id);
    if (!r) throw NotFound();
    if (actor.role === 'TECHNICIAN' && r.technicianId !== actor.id) throw Forbidden();
    if (actor.role === 'USER' && r.ticket?.requester?.id !== actor.id) throw Forbidden();
    return r;
  },

  /**
   * Rapport associé à un ticket (utile pour le front technicien qui veut savoir s'il existe déjà).
   * Renvoie null si pas encore de rapport (au lieu de 404).
   */
  async getByTicketId(ticketId, actor) {
    const r = await interventionReportRepository.findByTicketId(ticketId);
    if (!r) return null;
    if (actor.role === 'TECHNICIAN' && r.technicianId !== actor.id) throw Forbidden();
    if (actor.role === 'USER' && r.ticket?.requester?.id !== actor.id) throw Forbidden();
    return r;
  },

  /**
   * Récupère le chemin disque d'un fichier de rapport pour téléchargement.
   * Autorisations : ADMIN, technicien auteur, demandeur du ticket.
   */
  async getFileDiskPath(reportId, fileId, actor) {
    const f = await interventionReportRepository
      .findById(reportId)
      .then((r) => r?.files?.find((x) => x.id === fileId) ? { ...r.files.find((x) => x.id === fileId), report: r } : null);
    if (!f) throw NotFound();

    const r = f.report;
    const allowed =
      actor.role === 'ADMIN' ||
      (actor.role === 'TECHNICIAN' && r.technicianId === actor.id) ||
      (actor.role === 'USER' && r.ticket?.requester?.id === actor.id);
    if (!allowed) throw Forbidden();

    const dir = path.resolve('uploads', 'reports', reportId);
    if (!fs.existsSync(dir)) throw NotFound('Fichier disque introuvable');
    const files = fs.readdirSync(dir);
    const base = path.basename(f.filename).replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const match = files.find((name) => name.includes(base) || name.endsWith(f.filename));
    if (!match) throw NotFound('Fichier disque introuvable');
    return { diskPath: path.join(dir, match), filename: f.filename, mimetype: f.mimetype };
  },
};
