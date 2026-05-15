import { userService } from '../services/userService.js';
import { agencyService } from '../services/agencyService.js';
import { categoryService } from '../services/categoryService.js';

const paging = (req) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

export const userController = {
  async list(req, res, next) {
    try {
      const p = paging(req);
      const data = await userService.list(req.user, { role: req.query.role, agencyId: req.query.agencyId, q: req.query.q }, p);
      res.json({ ...data, page: p.page, limit: p.limit });
    } catch (e) { next(e); }
  },
  async onlineCount(req, res, next) {
    try {
      const count = await userService.onlineCount(req.user);
      res.json({ count });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try { res.status(201).json(await userService.create(req.body, req.user)); } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try { res.json(await userService.update(req.params.id, req.body, req.user)); } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await userService.remove(req.params.id, req.user); res.json({ ok: true }); } catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try { res.json(await userService.getById(req.params.id)); } catch (e) { next(e); }
  },
};

export const agencyController = {
  list: async (_req, res, next) => { try { res.json(await agencyService.list()); } catch (e) { next(e); } },
  getById: async (req, res, next) => { try { res.json(await agencyService.getById(req.params.id)); } catch (e) { next(e); } },
  create: async (req, res, next) => { try { res.status(201).json(await agencyService.create(req.body, req.user)); } catch (e) { next(e); } },
  update: async (req, res, next) => { try { res.json(await agencyService.update(req.params.id, req.body, req.user)); } catch (e) { next(e); } },
  remove: async (req, res, next) => { try { await agencyService.remove(req.params.id, req.user); res.json({ ok: true }); } catch (e) { next(e); } },
};

export const categoryController = {
  list: async (_req, res, next) => { try { res.json(await categoryService.list()); } catch (e) { next(e); } },
  create: async (req, res, next) => { try { res.status(201).json(await categoryService.create(req.body, req.user)); } catch (e) { next(e); } },
  update: async (req, res, next) => { try { res.json(await categoryService.update(req.params.id, req.body, req.user)); } catch (e) { next(e); } },
  remove: async (req, res, next) => { try { await categoryService.remove(req.params.id, req.user); res.json({ ok: true }); } catch (e) { next(e); } },
};
