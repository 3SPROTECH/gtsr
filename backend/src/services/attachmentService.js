import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { NotFound, Forbidden, BadRequest } from '../utils/errors.js';

function canAccessTicket(ticket, actor) {
  if (actor.role === 'ADMIN') return true;
  if (actor.role === 'USER' && ticket.requesterId === actor.id) return true;
  if (actor.role === 'TECHNICIAN' && ticket.assigneeId === actor.id) return true;
  return false;
}

export const attachmentService = {
  async upload(ticketId, files, actor) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound('Ticket introuvable');
    if (!canAccessTicket(ticket, actor)) throw Forbidden();
    if (!files || files.length === 0) throw BadRequest('Aucun fichier reçu');

    const created = [];
    for (const f of files) {
      const att = await prisma.attachment.create({
        data: {
          ticketId,
          filename: f.originalname,
          mimetype: f.mimetype,
          size:     f.size,
          url:      `/api/tickets/${ticketId}/attachments/${f.filename}`, // construit après création
          uploadedBy: actor.id,
        },
      });
      // Mettre à jour l'URL avec l'ID définitif (filename = nom physique sur disque)
      const finalUrl = `/api/tickets/${ticketId}/attachments/${att.id}`;
      const updated = await prisma.attachment.update({
        where: { id: att.id },
        data: { url: finalUrl },
      });
      // On stocke le chemin disque dans une métadonnée (filename column déjà utilisée pour le nom original)
      // -> on encode le nom de fichier disque dans `url` historique : ici on simplifie
      // Pour récupérer le fichier on retrouve via fs.readdir
      created.push({ ...updated, _diskPath: f.path });
    }
    return created;
  },

  async list(ticketId, actor) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound();
    if (!canAccessTicket(ticket, actor)) throw Forbidden();
    return prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async download(ticketId, attachmentId, actor) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound();
    if (!canAccessTicket(ticket, actor)) throw Forbidden();
    const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || att.ticketId !== ticketId) throw NotFound('Pièce jointe introuvable');

    // Le fichier est dans uploads/{ticketId}/* dont le nom inclut l'horodatage.
    // On retrouve via fs en cherchant un nom qui se termine par le nom original sanitizé.
    const ticketDir = path.resolve('uploads', ticketId);
    if (!fs.existsSync(ticketDir)) throw NotFound('Fichier disque introuvable');
    const files = fs.readdirSync(ticketDir);
    // Match par taille + nom original (plus simple : on cherche celui qui contient le nom original)
    const baseName = path.basename(att.filename).replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
    const match = files.find((f) => f.includes(baseName) || f.endsWith(att.filename));
    if (!match) throw NotFound('Fichier disque introuvable');

    return {
      diskPath: path.join(ticketDir, match),
      filename: att.filename,
      mimetype: att.mimetype,
    };
  },

  async remove(ticketId, attachmentId, actor) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw NotFound();
    // Seuls ADMIN et l'auteur du ticket (USER) peuvent supprimer
    const isAuthor = actor.role === 'USER' && ticket.requesterId === actor.id;
    if (actor.role !== 'ADMIN' && !isAuthor) throw Forbidden();
    const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || att.ticketId !== ticketId) throw NotFound();

    // Supprimer aussi le fichier disque
    try {
      const ticketDir = path.resolve('uploads', ticketId);
      const files = fs.readdirSync(ticketDir);
      const baseName = path.basename(att.filename).replace(/[^a-zA-Z0-9-_\.]/g, '_').slice(0, 60);
      const match = files.find((f) => f.includes(baseName) || f.endsWith(att.filename));
      if (match) fs.unlinkSync(path.join(ticketDir, match));
    } catch { /* on ignore */ }

    await prisma.attachment.delete({ where: { id: attachmentId } });
  },
};
