import { Employee } from '../models/Employee.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { currentMonth, monthBounds } from '../utils/dates.js';
import { shapeBalance } from '../utils/leave.js';
import { summarizeAttendance } from './employeeService.js';
import { writeAudit } from './auditService.js';
import { env } from '../config/env.js';
import { HALF_DAY_HOURS, LEAVE_QUOTAS, OFFICE_START_MINUTES } from '../utils/constants.js';

export function getPolicy() {
  const hours = Math.floor(OFFICE_START_MINUTES / 60);
  const minutes = String(OFFICE_START_MINUTES % 60).padStart(2, '0');
  return {
    officeStart: `${String(hours).padStart(2, '0')}:${minutes}`,
    halfDayHours: HALF_DAY_HOURS,
    leaveQuotas: LEAVE_QUOTAS,
    timezone: env.APP_TIMEZONE,
  };
}

export async function getProfile(user) {
  const freshUser = await User.findById(user._id);
  let employee = null;
  let leaveBalance = null;
  let attendanceSummary = null;
  if (freshUser.employee) {
    employee = await Employee.findById(freshUser.employee).populate('department', 'name');
    const month = currentMonth();
    const bounds = monthBounds(month);
    const [balance, records] = await Promise.all([
      LeaveBalance.findOne({ employee: employee._id }),
      Attendance.find({ employee: employee._id, date: { $gte: bounds.start, $lte: bounds.end } }),
    ]);
    leaveBalance = shapeBalance(balance);
    attendanceSummary = summarizeAttendance(records, month);
  }
  return { user: freshUser, employee, leaveBalance, attendanceSummary, policy: getPolicy() };
}

export async function updateProfile(user, payload) {
  if (user.role === 'ADMIN') {
    if (!payload.name) throw new ApiError(400, 'Name is required');
    user.name = payload.name;
    await user.save();
    await writeAudit({
      actor: user,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: user._id,
      message: 'Updated admin profile',
    });
    return getProfile(user);
  }

  const employee = await Employee.findById(user.employee);
  if (!employee) throw new ApiError(404, 'Employee profile not found');
  const allowed = ['fullName', 'phone', 'gender', 'dateOfBirth', 'profileImage', 'address', 'emergencyContact'];
  for (const field of allowed) {
    if (payload[field] !== undefined) employee[field] = payload[field];
  }
  if (payload.fullName) user.name = payload.fullName;
  await employee.save();
  await user.save();
  await writeAudit({
    actor: user,
    action: 'PROFILE_UPDATED',
    entity: 'Employee',
    entityId: employee._id,
    message: `Updated profile for ${employee.fullName}`,
  });
  return getProfile(user);
}
