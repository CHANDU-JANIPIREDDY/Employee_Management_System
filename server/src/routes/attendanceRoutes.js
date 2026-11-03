import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { attendanceStatsSchema, idSchema, listAttendanceSchema, myAttendanceSchema } from '../validators/schemas.js';
import * as controller from '../controllers/attendanceController.js';

const router = Router();

router.use(requireAuth);
router.post('/check-in', authorize('EMPLOYEE'), controller.checkIn);
router.post('/check-out', authorize('EMPLOYEE'), controller.checkOut);
router.get('/stats', authorize('ADMIN'), validate(attendanceStatsSchema), controller.stats);
router.get('/export', authorize('ADMIN'), validate(listAttendanceSchema), controller.exportCsv);
router.get('/me', authorize('EMPLOYEE'), validate(myAttendanceSchema), controller.mine);
router.get('/', validate(listAttendanceSchema), controller.list);
router.get('/:id', validate(idSchema), controller.get);

export default router;
