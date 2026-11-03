import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema } from '../validators/schemas.js';
import * as controller from '../controllers/authController.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);
router.post('/change-password', requireAuth, validate(changePasswordSchema), controller.changePassword);

export default router;
