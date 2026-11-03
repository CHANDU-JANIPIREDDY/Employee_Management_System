import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { applyLeaveSchema, approveLeaveSchema, idSchema, listLeavesSchema, rejectLeaveSchema } from '../validators/schemas.js';
import * as controller from '../controllers/leaveController.js';

const router = Router();

router.use(requireAuth);
router.post('/', authorize('EMPLOYEE'), validate(applyLeaveSchema), controller.apply);
router.get('/me', authorize('EMPLOYEE'), validate(listLeavesSchema), controller.mine);
router.get('/', authorize('ADMIN'), validate(listLeavesSchema), controller.list);
router.get('/:id', validate(idSchema), controller.get);
router.patch('/:id/approve', authorize('ADMIN'), validate(approveLeaveSchema), controller.approve);
router.patch('/:id/reject', authorize('ADMIN'), validate(rejectLeaveSchema), controller.reject);
router.patch('/:id/cancel', authorize('EMPLOYEE'), validate(idSchema), controller.cancel);

export default router;
