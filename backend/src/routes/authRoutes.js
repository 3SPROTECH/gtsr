import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { loginSchema, changePasswordSchema, updateAvailabilitySchema } from '../validators/schemas.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives' } },
  standardHeaders: true, legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.patch('/me/availability', authenticate, validate(updateAvailabilitySchema), authController.updateAvailability);

export default router;
