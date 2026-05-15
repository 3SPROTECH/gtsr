import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { reportController } from '../controllers/reportController.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard',        reportController.dashboard);
router.get('/me/dashboard',     reportController.technicianDashboard);
router.get('/top-categories',   reportController.topCategories);
router.get('/tech-workload',    reportController.techWorkload);

export default router;
