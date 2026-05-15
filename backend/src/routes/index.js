import { Router } from 'express';
import authRoutes from './authRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportRoutes from './reportRoutes.js';
import diagRoutes from './diagRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import interventionReportRoutes from './interventionReportRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gtsr-api' }));

router.use('/auth',           authRoutes);
router.use('/tickets',        ticketRoutes);
router.use('/admin',          adminRoutes);
router.use('/notifications',  notificationRoutes);
router.use('/reports',        reportRoutes);
router.use('/complaints',     complaintRoutes);
router.use('/intervention-reports', interventionReportRoutes);
router.use('/_diag',          diagRoutes);

export default router;
