import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { upload, uploadComplaintImages } from '../middlewares/uploadMiddleware.js';
import { ticketController } from '../controllers/ticketController.js';
import { attachmentController } from '../controllers/attachmentController.js';
import { complaintController } from '../controllers/complaintController.js';
import {
  createTicketSchema, updateTicketSchema, statusChangeSchema,
  assignSchema, escalateSchema, commentSchema, satisfactionSchema,
  reopenSchema, cancelSchema, declareResolutionSchema, userConfirmSchema,
} from '../validators/schemas.js';

const router = Router();
router.use(authenticate);

router.get('/transitions/:status', ticketController.allowedTransitions);

router.get('/', ticketController.list);
router.post('/', validate(createTicketSchema), ticketController.create);

router.get('/:id', ticketController.getById);
router.patch('/:id', validate(updateTicketSchema), ticketController.update);
router.delete('/:id', ticketController.remove);

router.post('/:id/status',       validate(statusChangeSchema), ticketController.changeStatus);
router.post('/:id/assign',       validate(assignSchema),       ticketController.assign);
router.post('/:id/escalate',     validate(escalateSchema),     ticketController.escalate);
router.post('/:id/user-resolve',      ticketController.userMarkResolved);
router.post('/:id/tech-declare', validate(declareResolutionSchema), ticketController.techDeclare);
router.post('/:id/user-confirm', validate(userConfirmSchema),        ticketController.userConfirm);
router.post('/:id/reopen',       validate(reopenSchema), ticketController.reopen);
router.post('/:id/cancel',       validate(cancelSchema), ticketController.cancel);
router.post('/:id/complaints',        uploadComplaintImages.array('images', 5), complaintController.create);
router.post('/:id/comments',     validate(commentSchema),      ticketController.addComment);
router.post('/:id/satisfaction', validate(satisfactionSchema), ticketController.submitSatisfaction);

// Pièces jointes
router.get('/:id/attachments',                       attachmentController.list);
router.post('/:id/attachments', upload.array('files', 5), attachmentController.upload);
router.get('/:id/attachments/:attachmentId',         attachmentController.download);
router.delete('/:id/attachments/:attachmentId',      attachmentController.remove);

export default router;
