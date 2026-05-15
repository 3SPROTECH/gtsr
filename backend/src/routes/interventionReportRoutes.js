import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadReportFiles } from '../middlewares/uploadMiddleware.js';
import { interventionReportController } from '../controllers/interventionReportController.js';

const router = Router();
router.use(authenticate);

// Liste / consultation
router.get('/',                          interventionReportController.list);
router.get('/by-ticket/:ticketId',       interventionReportController.getByTicket);
router.get('/:id',                       interventionReportController.getById);
router.get('/:id/files/:fileId',         interventionReportController.downloadFile);

// Création : technicien dépose le rapport pour un ticket
router.post('/ticket/:ticketId',
  uploadReportFiles.array('files', 5),
  interventionReportController.create,
);

export default router;
