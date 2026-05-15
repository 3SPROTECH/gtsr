import { complaintService } from '../services/complaintService.js';
import { moveComplaintImages } from '../middlewares/uploadMiddleware.js';

const paging = (req) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

export const complaintController = {
  // Tech crée une réclamation (depuis un ticket assigné)
  create: async (req, res, next) => {
    try {
      const complaint = await complaintService.create(
        req.params.id,             // ticketId
        req.body.description,
        req.files,
        req.user,
      );
      // Déplacer les fichiers du dossier _tmp vers le dossier de la complaint
      moveComplaintImages(req, complaint.id);
      res.status(201).json(complaint);
    } catch (e) { next(e); }
  },

  // Admin : liste des réclamations
  list: async (req, res, next) => {
    try {
      const p = paging(req);
      const { status, agencyId } = req.query;
      const data = await complaintService.list(req.user, { status, agencyId, skip: p.skip, take: p.take });
      res.json({ ...data, page: p.page, limit: p.limit });
    } catch (e) { next(e); }
  },

  // Admin : détail d'une réclamation
  getById: async (req, res, next) => {
    try { res.json(await complaintService.getById(req.params.id, req.user)); }
    catch (e) { next(e); }
  },

  // Admin : marque comme traitée (sans réassignation)
  markReviewed: async (req, res, next) => {
    try {
      const updated = await complaintService.markReviewed(req.params.id, req.body.reviewNote, req.user);
      res.json(updated);
    } catch (e) { next(e); }
  },

  // Admin : renvoie la réclamation au technicien choisi (réassigne le ticket)
  forwardToTech: async (req, res, next) => {
    try {
      const updated = await complaintService.forwardToTech(
        req.params.id, req.body.technicianId, req.body.note, req.user,
      );
      res.json(updated);
    } catch (e) { next(e); }
  },

  // Download d'une image
  downloadImage: async (req, res, next) => {
    try {
      const { diskPath, filename, mimetype } = await complaintService.getImageDiskPath(
        req.params.id, req.params.imageId, req.user,
      );
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      res.sendFile(diskPath);
    } catch (e) { next(e); }
  },
};
