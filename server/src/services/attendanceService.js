import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  currentMonth,
  dateKey,
  deriveAttendanceStatus,
  monthBounds,
  workingHoursBetween,
} from '../utils/dates.js';
import { buildPagination } from '../utils/pagination.js';
import { toCsv } from '../utils/csv.js';
import { summarizeAttendance } from './employeeService.js';
import { notifyUser } from './notificationService.js';
import { writeAudit } from './auditService.js';

async function requireEmployeeProfile(user) {
  if (!user.employee) throw new ApiError(403, 'Employee profile required');
  const employee = await Employee.findById(user.employee);
  if (!employee) throw new ApiError(403, 'Employee profile required');
  return employee;
}

function ownsRecord(user, employeeId) {
  return user.role === 'ADMIN' || String(user.employee) === String(employeeId);
}

export async function checkIn(user) {
  const employee = await requireEmployeeProfile(user);
  if (employee.employmentStatus === 'inactive' || employee.employmentStatus === 'terminated') {
    throw new ApiError(403, 'Inactive employees cannot mark attendance');
  }
  const today = dateKey();
  const existing = await Attendance.findOne({ employee: employee._id, date: today });
  if (existing) throw new ApiError(409, 'You have already checked in today');

  const checkInAt = new Date();
  let record;
  try {
    record = await Attendance.create({
      employee: employee._id,
      date: today,
      checkIn: checkInAt,
      status: deriveAttendanceStatus(checkInAt, null, env.APP_TIMEZONE),
      workingHours: 0,
    });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'You have already checked in today');
    throw error;
  }

  await notifyUser(user._id, {
    title: 'Attendance recorded',
    message: `You checked in on ${today}.`,
    type: 'attendance_recorded',
    link: '/attendance',
  });
  await writeAudit({
    actor: user,
    action: 'ATTENDANCE_CHECK_IN',
    entity: 'Attendance',
    entityId: record._id,
    message: `${employee.fullName} checked in`,
  });
  return record;
}

export async function checkOut(user) {
  const employee = await requireEmployeeProfile(user);
  const today = dateKey();
  const record = await Attendance.findOne({ employee: employee._id, date: today });
  if (!record) throw new ApiError(400, 'Check in before checking out');
  if (record.checkOut) throw new ApiError(409, 'You have already checked out today');

  const checkOutAt = new Date();
  record.checkOut = checkOutAt;
  record.workingHours = workingHoursBetween(record.checkIn, checkOutAt);
  record.status = deriveAttendanceStatus(record.checkIn, checkOutAt, env.APP_TIMEZONE);
  await record.save();

  await notifyUser(user._id, {
    title: 'Attendance recorded',
    message: `You checked out on ${today}. Working hours: ${record.workingHours}.`,
    type: 'attendance_recorded',
    link: '/attendance',
  });
  await writeAudit({
    actor: user,
    action: 'ATTENDANCE_CHECK_OUT',
    entity: 'Attendance',
    entityId: record._id,
    message: `${employee.fullName} checked out`,
  });
  return record;
}

function attendanceFilter(user, query) {
  const filter = {};
  if (user.role !== 'ADMIN') {
    if (!user.employee) throw new ApiError(403, 'Employee profile required');
    if (query.employee && String(query.employee) !== String(user.employee)) {
      throw new ApiError(403, 'You can only view your own attendance');
    }
    filter.employee = user.employee;
  } else if (query.employee) {
    filter.employee = query.employee;
  }
  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }
  return filter;
}

export async function listAttendance(user, query) {
  const filter = attendanceFilter(user, query);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('employee', 'fullName employeeId designation'),
    Attendance.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(query.page, query.limit, total) };
}

export async function getAttendance(user, id) {
  const record = await Attendance.findById(id).populate('employee', 'fullName employeeId designation');
  if (!record) throw new ApiError(404, 'Attendance record not found');
  const employeeId = record.employee?._id || record.employee;
  if (!ownsRecord(user, employeeId)) {
    throw new ApiError(403, 'You can only view your own attendance');
  }
  return record;
}

export async function getMyAttendance(user, query) {
  const employee = await requireEmployeeProfile(user);
  const month = query.month || currentMonth();
  const bounds = monthBounds(month);
  const today = dateKey();
  const records = await Attendance.find({
    employee: employee._id,
    date: { $gte: bounds.start, $lte: bounds.end },
  }).sort({ date: 1 });
  const todayRecord = records.find((record) => record.date === today)
    || await Attendance.findOne({ employee: employee._id, date: today });
  return {
    today: todayRecord,
    month,
    records,
    summary: summarizeAttendance(records, month),
  };
}

export async function attendanceStats(query) {
  const date = query.date || dateKey();
  const [activeEmployees, records, leaves] = await Promise.all([
    Employee.find({ employmentStatus: 'active' }).select('_id'),
    Attendance.find({ date }),
    LeaveRequest.find({ status: 'approved', startDate: { $lte: date }, endDate: { $gte: date } }).select('employee'),
  ]);
  const presentIds = new Set(records.filter((record) => record.checkIn).map((record) => String(record.employee)));
  const leaveIds = new Set(leaves.map((leave) => String(leave.employee)));
  let absent = 0;
  for (const employee of activeEmployees) {
    const id = String(employee._id);
    if (!presentIds.has(id) && !leaveIds.has(id)) absent += 1;
  }
  const present = records.filter((record) => record.status === 'present').length;
  const late = records.filter((record) => record.status === 'late').length;
  const halfDay = records.filter((record) => record.status === 'half_day').length;
  const checkedIn = present + late + halfDay;
  const percentage = activeEmployees.length
    ? Math.round((checkedIn / activeEmployees.length) * 1000) / 10
    : 0;
  return {
    date,
    totalEmployees: activeEmployees.length,
    present,
    late,
    halfDay,
    absent,
    onLeave: leaveIds.size,
    percentage,
  };
}

export async function exportAttendance(user, query) {
  const filter = attendanceFilter(user, query);
  const records = await Attendance.find(filter)
    .sort({ date: -1 })
    .limit(5000)
    .populate('employee', 'fullName employeeId');
  const rows = records.map((record) => ({
    'Employee ID': record.employee?.employeeId || '',
    Employee: record.employee?.fullName || '',
    Date: record.date,
    'Check In': record.checkIn ? new Date(record.checkIn).toISOString() : '',
    'Check Out': record.checkOut ? new Date(record.checkOut).toISOString() : '',
    Status: record.status,
    'Working Hours': record.workingHours,
  }));
  return toCsv(['Employee ID', 'Employee', 'Date', 'Check In', 'Check Out', 'Status', 'Working Hours'], rows);
}
