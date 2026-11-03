import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, idSchema, listDepartmentsSchema, updateDepartmentSchema } from '../validators/schemas.js';
import * as controller from '../controllers/departmentController.js';

const router = Router();

router.use(requireAuth, authorize('ADMIN'));
router.get('/', validate(listDepartmentsSchema), controller.list);
router.post('/', validate(createDepartmentSchema), controller.create);
router.put('/:id', validate(updateDepartmentSchema), controller.update);
router.delete('/:id', validate(idSchema), controller.remove);

export default router;
