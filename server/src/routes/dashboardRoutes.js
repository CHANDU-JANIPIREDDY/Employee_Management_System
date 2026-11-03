import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/dashboardController.js';

const router = Router();

router.get('/admin', requireAuth, authorize('ADMIN'), controller.admin);
router.get('/employee', requireAuth, authorize('EMPLOYEE'), controller.employee);

export default router;
