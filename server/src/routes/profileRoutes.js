import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileSchema } from '../validators/schemas.js';
import * as controller from '../controllers/profileController.js';

const router = Router();

router.use(requireAuth);
router.get('/', controller.get);
router.put('/', validate(profileSchema), controller.update);

export default router;
