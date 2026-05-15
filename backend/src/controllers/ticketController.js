import { ticketService } from '../services/ticketService.js';

const paging = (req) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

export const ticketController = {
  async list(req, res, next) {
    try {
      const p = paging(req);
      const { status, priority, grade, categoryId, assigneeId, agencyId, q, from, to, slaRisk, sort } = req.query;
      const result = await ticketService.list(
        req.user,
        { status, priority, grade, categoryId, assigneeId, agencyId, q, from, to, slaRisk },
        p,
        sort,
      );
      res.json({ ...result, page: p.page, limit: p.limit });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const t = await ticketService.create(req.body, req.user);
      res.status(201).json(t);
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const t = await ticketService.getById(req.params.id, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const t = await ticketService.update(req.params.id, req.body, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async changeStatus(req, res, next) {
    try {
      const t = await ticketService.changeStatus(req.params.id, req.body.status, req.user, {
        resolutionNote: req.body.resolutionNote,
      });
      res.json(t);
    } catch (e) { next(e); }
  },

  async assign(req, res, next) {
    try {
      const t = await ticketService.assign(req.params.id, req.body.assigneeId, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async escalate(req, res, next) {
    try {
      const t = await ticketService.escalate(req.params.id, req.body.toLevel, req.body.reason, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async addComment(req, res, next) {
    try {
      const c = await ticketService.addComment(
        req.params.id, req.body.body, !!req.body.isInternal, req.user,
      );
      res.status(201).json(c);
    } catch (e) { next(e); }
  },

  async userMarkResolved(req, res, next) {
    try {
      const t = await ticketService.userMarkResolved(req.params.id, req.body.note, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async reopen(req, res, next) {
    try {
      const t = await ticketService.reopen(req.params.id, req.body.reason, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async techDeclare(req, res, next) {
    try {
      const t = await ticketService.techDeclare(req.params.id, req.body.resolution, req.body.note, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async userConfirm(req, res, next) {
    try {
      const t = await ticketService.userConfirm(req.params.id, req.body.confirmation, req.body.note, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async cancel(req, res, next) {
    try {
      const t = await ticketService.cancel(req.params.id, req.body.reason, req.user);
      res.json(t);
    } catch (e) { next(e); }
  },

  async submitSatisfaction(req, res, next) {
    try {
      const s = await ticketService.submitSatisfaction(
        req.params.id, req.body.rating, req.body.comment, req.user,
      );
      res.status(201).json(s);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await ticketService.remove(req.params.id, req.user);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },

  allowedTransitions(req, res) {
    res.json({ transitions: ticketService.allowedTransitions(req.params.status) });
  },
};
