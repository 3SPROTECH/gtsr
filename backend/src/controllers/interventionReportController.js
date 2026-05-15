import { interventionReportService } from '../services/interventionReportService.js';
import { moveReportFiles } from '../middlewares/uploadMiddleware.js';

const paging = (req) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

export const interventionReportController = {
  // Technicien (ou admin) crée le rapport pour un ticket
  create: async (req, res, next) => {
    try {
      const report = await interventionReportService.create(
        req.params.ticketId,
        req.body.description,
        req.files,
        req.user,
      );
      moveReportFiles(req, report.id);
      res.status(201).json(report);
    } catch (e) { next(e); }
  },

  // Liste filtrable (admin : tous + filtre technicien ; technicien : les siens)
  list: async (req, res, next) => {
    try {
      const p = paging(req);
      const { technicianId, ticketId, q, from, to } = req.query;
      const data = await interventionReportService.list(req.user, {
        technicianId, ticketId, q, from, to, skip: p.skip, take: p.take,
      });
      res.json({ ...data, page: p.page, limit: p.limit });
    } catch (e) { next(e); }
  },

  getById: async (req, res, next) => {
    try { res.json(await interventionReportService.getById(req.params.id, req.user)); }
    catch (e) { next(e); }
  },

  // Lookup utilitaire : le technicien vérifie si un rapport existe déjà pour un ticket
  getByTicket: async (req, res, next) => {
    try { res.json(await interventionReportService.getByTicketId(req.params.ticketId, req.user)); }
    catch (e) { next(e); }
  },

  downloadFile: async (req, res, next) => {
    try {
      const { diskPath, filename, mimetype } = await interventionReportService.getFileDiskPath(
        req.params.id, req.params.fileId, req.user,
      );
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      res.sendFile(diskPath);
    } catch (e) { next(e); }
  },
};
