import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as employeeService from '../services/employeeService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await employeeService.listEmployees(req.validated.query);
  return send(res, 200, { message: 'Employees fetched', data: result.items, pagination: result.pagination });
});

export const get = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployee(req.validated.params.id, req.user);
  return send(res, 200, { message: 'Employee fetched', data: employee });
});

export const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.validated.body, req.user);
  return send(res, 201, { message: 'Employee created', data: employee });
});

export const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.validated.params.id, req.validated.body, req.user);
  return send(res, 200, { message: 'Employee updated', data: employee });
});

export const remove = asyncHandler(async (req, res) => {
  const employee = await employeeService.deactivateEmployee(req.validated.params.id, req.user);
  return send(res, 200, { message: 'Employee deactivated', data: employee });
});
