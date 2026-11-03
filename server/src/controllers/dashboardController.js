import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as dashboardService from '../services/dashboardService.js';

export const admin = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAdminDashboard();
  return send(res, 200, { message: 'Dashboard fetched', data });
});

export const employee = asyncHandler(async (req, res) => {
  const data = await dashboardService.getEmployeeDashboard(req.user);
  return send(res, 200, { message: 'Dashboard fetched', data });
});
