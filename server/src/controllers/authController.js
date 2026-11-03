import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as authService from '../services/authService.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  return send(res, 200, { message: 'Logged in', data: result });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user);
  return send(res, 200, { message: 'Logged out', data: null });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  return send(res, 200, { message: 'Profile fetched', data: user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user, req.validated.body);
  return send(res, 200, { message: 'Password updated', data: result });
});
