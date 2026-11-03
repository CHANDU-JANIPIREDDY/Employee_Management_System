import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as profileService from '../services/profileService.js';

export const get = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user);
  return send(res, 200, { message: 'Profile fetched', data: profile });
});

export const update = asyncHandler(async (req, res) => {
  const profile = await profileService.updateProfile(req.user, req.validated.body);
  return send(res, 200, { message: 'Profile updated', data: profile });
});

export const settings = asyncHandler(async (_req, res) => {
  return send(res, 200, { message: 'Settings fetched', data: profileService.getPolicy() });
});
