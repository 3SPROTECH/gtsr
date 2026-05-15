import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  userController, agencyController, categoryController,
} from '../controllers/adminControllers.js';
import {
  createUserSchema, updateUserSchema, agencySchema, categorySchema,
} from '../validators/schemas.js';

const router = Router();
router.use(authenticate);

// Users
router.get('/users/online-count', userController.onlineCount);
router.get('/users',         userController.list);
router.post('/users',        validate(createUserSchema), userController.create);
router.get('/users/:id',     userController.getById);
router.patch('/users/:id',   validate(updateUserSchema), userController.update);
router.delete('/users/:id',  userController.remove);

// Agencies
router.get('/agencies',         agencyController.list);
router.post('/agencies',        validate(agencySchema), agencyController.create);
router.get('/agencies/:id',     agencyController.getById);
router.patch('/agencies/:id',   validate(agencySchema.partial()), agencyController.update);
router.delete('/agencies/:id',  agencyController.remove);

// Categories
router.get('/categories',        categoryController.list);
router.post('/categories',       validate(categorySchema), categoryController.create);
router.patch('/categories/:id',  validate(categorySchema.partial()), categoryController.update);
router.delete('/categories/:id', categoryController.remove);

export default router;
