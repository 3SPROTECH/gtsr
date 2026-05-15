import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { complaintController } from '../controllers/complaintController.js';

const router = Router();
router.use(authenticate);

router.get('/',                       complaintController.list);
router.get('/:id',                    complaintController.getById);
router.post('/:id/review',            complaintController.markReviewed);
router.post('/:id/forward',           complaintController.forwardToTech);
router.get('/:id/images/:imageId',    complaintController.downloadImage);

export default router;
