import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { settings } from '../controllers/profileController.js';

const router = Router();

router.get('/', requireAuth, settings);

export default router;
