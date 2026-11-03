import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, idSchema, listEmployeesSchema, updateEmployeeSchema } from '../validators/schemas.js';
import * as controller from '../controllers/employeeController.js';

const router = Router();

router.use(requireAuth);
router.get('/', authorize('ADMIN'), validate(listEmployeesSchema), controller.list);
router.post('/', authorize('ADMIN'), validate(createEmployeeSchema), controller.create);
router.get('/:id', validate(idSchema), controller.get);
router.put('/:id', authorize('ADMIN'), validate(updateEmployeeSchema), controller.update);
router.delete('/:id', authorize('ADMIN'), validate(idSchema), controller.remove);

export default router;
