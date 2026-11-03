import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as departmentService from '../services/departmentService.js';

export const list = asyncHandler(async (req, res) => {
  const departments = await departmentService.listDepartments(req.validated.query);
  return send(res, 200, { message: 'Departments fetched', data: departments });
});

export const create = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.validated.body, req.user);
  return send(res, 201, { message: 'Department created', data: department });
});

export const update = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(req.validated.params.id, req.validated.body, req.user);
  return send(res, 200, { message: 'Department updated', data: department });
});

export const remove = asyncHandler(async (req, res) => {
  await departmentService.deleteDepartment(req.validated.params.id, req.user);
  return send(res, 200, { message: 'Department deleted', data: null });
});
