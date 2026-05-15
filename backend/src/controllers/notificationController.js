import { notificationService } from '../services/notificationService.js';

export const notificationController = {
  list: async (req, res, next) => {
    try {
      const items = await notificationService.list(req.user.id, {
        skip: 0, take: 50,
        unreadOnly: req.query.unread === '1',
      });
      const unread = await notificationService.countUnread(req.user.id);
      res.json({ items, unread });
    } catch (e) { next(e); }
  },
  markRead: async (req, res, next) => {
    try { await notificationService.markRead(req.params.id, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
  },
  markAllRead: async (req, res, next) => {
    try { await notificationService.markAllRead(req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
  },
};
