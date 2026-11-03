import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const userProfile = {
  path: 'employee',
  select: 'fullName employeeId designation employmentStatus department',
  populate: { path: 'department', select: 'name' },
};

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  user.lastLoginAt = new Date();
  await user.save();
  await user.populate(userProfile);
  return { token: signToken(user), user };
}

export async function logout(user) {
  user.tokenVersion += 1;
  await user.save();
}

export async function getMe(userId) {
  const user = await User.findById(userId).populate(userProfile);
  if (!user || !user.isActive) throw new ApiError(401, 'Session expired');
  return user;
}

export async function changePassword(user, { currentPassword, newPassword }) {
  const existing = await User.findById(user._id).select('+password');
  if (!existing || !(await verifyPassword(currentPassword, existing.password))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  existing.password = await hashPassword(newPassword);
  existing.tokenVersion += 1;
  await existing.save();
  await existing.populate(userProfile);
  return { token: signToken(existing), user: existing };
}
