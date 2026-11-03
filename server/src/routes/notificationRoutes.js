import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idSchema, listNotificationsSchema } from '../validators/schemas.js';
import * as controller from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);
router.get('/', validate(listNotificationsSchema), controller.list);
router.patch('/read-all', controller.readAll);
router.patch('/:id/read', validate(idSchema), controller.read);

export default router;
