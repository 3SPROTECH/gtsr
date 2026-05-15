import { attachmentService } from '../services/attachmentService.js';

export const attachmentController = {
  async upload(req, res, next) {
    try {
      const created = await attachmentService.upload(req.params.id, req.files, req.user);
      res.status(201).json(created);
    } catch (e) { next(e); }
  },

  async list(req, res, next) {
    try { res.json(await attachmentService.list(req.params.id, req.user)); }
    catch (e) { next(e); }
  },

  async download(req, res, next) {
    try {
      const { diskPath, filename, mimetype } = await attachmentService.download(
        req.params.id, req.params.attachmentId, req.user,
      );
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.sendFile(diskPath);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await attachmentService.remove(req.params.id, req.params.attachmentId, req.user);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
};
