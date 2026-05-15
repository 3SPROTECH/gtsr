import { authService } from '../services/authService.js';

export const authController = {
  async login(req, res, next) {
    try {
      const data = await authService.login(req.body.email, req.body.password, req.ip);
      res.json(data);
    } catch (e) { next(e); }
  },

  async refresh(req, res, next) {
    try {
      const data = await authService.refresh(req.body.refreshToken);
      res.json(data);
    } catch (e) { next(e); }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.body.refreshToken);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },

  async me(req, res) {
    res.json({ user: req.user });
  },

  async changePassword(req, res, next) {
    try {
      await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },

  async updateAvailability(req, res, next) {
    try {
      const user = await authService.updateAvailability(req.user.id, req.body.availability);
      res.json({ user });
    } catch (e) { next(e); }
  },
};
