import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { notificationService } from './notificationService.js';
import { can } from '../domain/permissions.js';
import { BadRequest, Forbidden, NotFound } from '../utils/errors.js';

export const complaintService = {
  /**
   * L'utilisateur (créateur du ticket) dépose une réclamation "problème non résolu".
   * Crée une Complaint + upload des images, notifie tous les admins.
   *  - On snapshot le technicien actuellement assigné dans complaint.technicianId
   *    pour garder la trace de qui n'a pas résolu.
   */
  async create(ticketId, description, images, actor) {
    if (!can(actor.role, 'complaint.create')) throw Forbidden('Seul le demandeur peut déposer une réclamation');
    if (!description || description.trim().length < 3) throw BadRequest('Description requise (min 3 caractères)');

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound('Ticket introuvable');
    if (ticket.requesterId !== actor.id) throw Forbidden('Vous n\'êtes pas le demandeur de ce ticket');
    if (!['IN_PROGRESS', 'OPEN'].includes(ticket.status)) {
      throw BadRequest('Vous pouvez signaler un problème uniquement sur un ticket non clôturé.');
    }

    const complaint = await prisma.complaint.create({
      data: {
        ticketId,
        // Snapshot : technicien actuellement assigné (peut être null si pas encore assigné)
        technicianId: ticket.assigneeId ?? actor.id, // fallback sur USER si pas d'assignation
        description,
        status: 'PENDING',
        images: images && images.length
          ? { create: images.map(f => ({ filename: f.originalname, mimetype: f.mimetype, size: f.size })) }
          : undefined,
      },
      include: { images: true },
    });

    await ticketRepository.recordHistory(ticketId, actor.id, 'complaint', '∅', 'created');
    await auditRepository.log({
      actorId: actor.id, action: 'COMPLAINT_CREATE', entity: 'Complaint', entityId: complaint.id,
      metadata: { ticketNumber: ticket.number },
    });

    // Notifier tous les admins
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const admin of (admins.items ?? admins)) {
      await notificationService.notify({
        userId: admin.id, ticketId, email: admin.email,
        channels: ['IN_APP', 'EMAIL'],
        title: `Réclamation - Ticket ${ticket.number}`,
        body: `${actor.firstName} ${actor.lastName} signale un problème non résolu sur "${ticket.title}". ${images?.length || 0} image(s) jointe(s).`,
      });
    }

    return complaint;
  },

  /**
   * L'admin renvoie la réclamation à un technicien (peut être un autre que celui assigné).
   * - Réassigne le ticket au technicien choisi
   * - Marque la réclamation REVIEWED avec note
   * - Notifie le technicien avec les détails de la réclamation
   */
  async forwardToTech(complaintId, technicianId, note, actor) {
    if (!can(actor.role, 'complaint.manage')) throw Forbidden();

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { ticket: true, images: true },
    });
    if (!complaint) throw NotFound('Réclamation introuvable');

    const tech = await userRepository.findById(technicianId);
    if (!tech || tech.role !== 'TECHNICIAN') {
      throw BadRequest('Le technicien sélectionné est invalide');
    }

    const now = new Date();

    // Réassigner le ticket au technicien (peut être le même)
    await ticketRepository.update(complaint.ticketId, {
      assigneeId: technicianId,
      // S'assurer que le ticket reste en cours pour que le tech puisse y travailler
      status: complaint.ticket.status === 'OPEN' ? 'IN_PROGRESS' : complaint.ticket.status,
    });
    await ticketRepository.recordHistory(complaint.ticketId, actor.id, 'assigneeId',
      complaint.ticket.assigneeId || '∅', technicianId);

    // Marquer la réclamation traitée
    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'REVIEWED',
        reviewNote: note || `Renvoyée à ${tech.firstName} ${tech.lastName}`,
        reviewedAt: now,
        reviewedBy: actor.id,
      },
    });

    await auditRepository.log({
      actorId: actor.id, action: 'COMPLAINT_FORWARD', entity: 'Complaint', entityId: complaintId,
      metadata: { technicianId, ticketNumber: complaint.ticket.number },
    });

    // Notifier le technicien
    await notificationService.notify({
      userId: tech.id, ticketId: complaint.ticketId, email: tech.email,
      channels: ['IN_APP', 'EMAIL'],
      title: `Réclamation à traiter - Ticket ${complaint.ticket.number}`,
      body: `Une réclamation vous est confiée par l'administrateur. Problème signalé par le demandeur : "${complaint.description.slice(0, 160)}${complaint.description.length > 160 ? '…' : ''}"${note ? '\n\nNote admin : ' + note : ''}`,
    });

    return updated;
  },

  /**
   * Liste les réclamations (admin uniquement).
   */
  async list(actor, { status, agencyId, skip = 0, take = 50 } = {}) {
    if (!can(actor.role, 'complaint.manage')) throw Forbidden();
    const where = {};
    if (status) where.status = status;
    if (agencyId) where.ticket = { agencyId };

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, firstName: true, lastName: true, email: true } },
          ticket: { select: { id: true, number: true, title: true, status: true, agencyId: true, requesterId: true, requester: { select: { firstName: true, lastName: true } } } },
          images: true,
          _count: { select: { images: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);
    return { items, total };
  },

  /**
   * Détail d'une réclamation (admin).
   */
  async getById(id, actor) {
    if (!can(actor.role, 'complaint.manage')) throw Forbidden();
    const c = await prisma.complaint.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        ticket: { include: { agency: true, requester: true, assignee: true } },
        images: true,
      },
    });
    if (!c) throw NotFound();
    return c;
  },

  /**
   * Marquer la réclamation comme traitée par l'admin (sans réassignation).
   */
  async markReviewed(id, reviewNote, actor) {
    if (!can(actor.role, 'complaint.manage')) throw Forbidden();
    const c = await prisma.complaint.findUnique({ where: { id } });
    if (!c) throw NotFound();
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        reviewedBy: actor.id,
      },
    });
    await auditRepository.log({ actorId: actor.id, action: 'COMPLAINT_REVIEW', entity: 'Complaint', entityId: id });
    return updated;
  },

  /**
   * Récupère le chemin disque d'une image de réclamation pour download.
   * Autorisations : admin OU le technicien à qui la réclamation est confiée OU le demandeur du ticket.
   */
  async getImageDiskPath(complaintId, imageId, actor) {
    const img = await prisma.complaintImage.findUnique({
      where: { id: imageId },
      include: { complaint: { include: { ticket: true } } },
    });
    if (!img || img.complaintId !== complaintId) throw NotFound();
    const c = img.complaint;
    const allowed =
      actor.role === 'ADMIN' ||
      (actor.role === 'TECHNICIAN' && c.ticket?.assigneeId === actor.id) ||
      (actor.role === 'USER' && c.ticket?.requesterId === actor.id);
    if (!allowed) throw Forbidden();

    const dir = path.resolve('uploads', 'complaints', complaintId);
    if (!fs.existsSync(dir)) throw NotFound('Fichier disque introuvable');
    const files = fs.readdirSync(dir);
    const base = path.basename(img.filename).replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const match = files.find((f) => f.includes(base) || f.endsWith(img.filename));
    if (!match) throw NotFound('Fichier disque introuvable');
    return { diskPath: path.join(dir, match), filename: img.filename, mimetype: img.mimetype };
  },
};
