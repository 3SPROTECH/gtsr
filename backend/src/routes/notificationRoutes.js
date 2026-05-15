import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { notificationController } from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate);

router.get('/', notificationController.list);
router.post('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

export default router;
