import { reportService } from '../services/reportService.js';

export const reportController = {
  dashboard: async (req, res, next) => {
    try {
      const { from, to, agencyId } = req.query;
      res.json(await reportService.dashboard(req.user, { from, to, agencyId }));
    } catch (e) { next(e); }
  },
  technicianDashboard: async (req, res, next) => {
    try { res.json(await reportService.technicianDashboard(req.user)); } catch (e) { next(e); }
  },
  topCategories: async (req, res, next) => {
    try {
      const { agencyId } = req.query;
      res.json(await reportService.topCategories(req.user, { agencyId }));
    } catch (e) { next(e); }
  },
  techWorkload: async (req, res, next) => {
    try {
      const { agencyId } = req.query;
      res.json(await reportService.techWorkload(req.user, { agencyId }));
    } catch (e) { next(e); }
  },
};
