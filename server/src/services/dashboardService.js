import { Employee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { Department } from '../models/Department.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { dateKey, lastDateKeys, lastMonths } from '../utils/dates.js';
import { shapeBalance } from '../utils/leave.js';
import { summarizeAttendance } from './employeeService.js';

export async function getAdminDashboard() {
  const today = dateKey();
  const trendKeys = lastDateKeys(7);
  const months = lastMonths(6);

  const [
    totalEmployees,
    activeEmployees,
    attendanceToday,
    approvedLeaves,
    statusEmployees,
    pendingLeaves,
    recentEmployees,
    pendingLeaveRequests,
    recentActivity,
    statusRows,
    departmentRows,
    trendRecords,
    trendLeaves,
    monthlyRecords,
  ] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ employmentStatus: 'active' }),
    Attendance.find({ date: today }).select('employee status checkIn'),
    LeaveRequest.find({ status: 'approved', startDate: { $lte: today }, endDate: { $gte: today } }).select('employee'),
    Employee.find().select('_id employmentStatus'),
    LeaveRequest.countDocuments({ status: 'pending' }),
    Employee.find().sort({ createdAt: -1 }).limit(5).populate('department', 'name'),
    LeaveRequest.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).populate('employee', 'fullName employeeId'),
    AuditLog.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'name role'),
    Employee.aggregate([{ $group: { _id: '$employmentStatus', count: { $sum: 1 } } }]),
    Department.aggregate([
      { $lookup: { from: 'employees', localField: '_id', foreignField: 'department', as: 'employees' } },
      { $project: { name: 1, count: { $size: '$employees' } } },
      { $sort: { name: 1 } },
    ]),
    Attendance.find({ date: { $gte: trendKeys[0], $lte: trendKeys[trendKeys.length - 1] } }).select('date status employee'),
    LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: trendKeys[trendKeys.length - 1] },
      endDate: { $gte: trendKeys[0] },
    }).select('employee startDate endDate'),
    Attendance.find({ date: { $gte: `${months[0]}-01`, $lte: `${months[months.length - 1]}-31` } }).select('date status'),
  ]);

  const presentIds = new Set(attendanceToday.filter((row) => row.checkIn).map((row) => String(row.employee)));
  const onLeaveIds = new Set(approvedLeaves.map((row) => String(row.employee)));
  for (const employee of statusEmployees) {
    if (employee.employmentStatus === 'on_leave') onLeaveIds.add(String(employee._id));
  }

  let absentToday = 0;
  for (const employee of statusEmployees) {
    if (employee.employmentStatus !== 'active') continue;
    const id = String(employee._id);
    if (!presentIds.has(id) && !onLeaveIds.has(id)) absentToday += 1;
  }

  const attendanceTrend = trendKeys.map((date) => {
    const dayRecords = trendRecords.filter((row) => row.date === date);
    const checkedIn = new Set(dayRecords.map((row) => String(row.employee)));
    const leaveCount = trendLeaves.filter((leave) => leave.startDate <= date && leave.endDate >= date && !checkedIn.has(String(leave.employee))).length;
    const present = dayRecords.filter((row) => row.status === 'present' || row.status === 'half_day').length;
    const late = dayRecords.filter((row) => row.status === 'late').length;
    const absent = Math.max(0, activeEmployees - checkedIn.size - leaveCount);
    return { date, present, late, absent };
  });

  const monthlyAttendance = months.map((month) => {
    const rows = monthlyRecords.filter((row) => row.date.startsWith(month));
    return {
      month,
      present: rows.filter((row) => row.status === 'present').length,
      late: rows.filter((row) => row.status === 'late').length,
      halfDay: rows.filter((row) => row.status === 'half_day').length,
    };
  });

  const knownStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
  const statusMap = new Map(statusRows.map((row) => [row._id, row.count]));

  return {
    totalEmployees,
    activeEmployees,
    presentToday: presentIds.size,
    absentToday,
    onLeave: onLeaveIds.size,
    pendingLeaves,
    attendanceTrend,
    departmentDistribution: departmentRows.map((row) => ({ name: row.name, count: row.count })),
    monthlyAttendance,
    statusDistribution: knownStatuses.map((status) => ({ status, count: statusMap.get(status) || 0 })),
    recentEmployees,
    pendingLeaveRequests,
    recentActivity,
  };
}

export async function getEmployeeDashboard(user) {
  if (!user.employee) throw new ApiError(404, 'Employee profile not found');
  const employee = await Employee.findById(user.employee).populate('department', 'name');
  if (!employee) throw new ApiError(404, 'Employee profile not found');
  const today = dateKey();
  const month = today.slice(0, 7);
  const [todayAttendance, records, balance, recentLeaves] = await Promise.all([
    Attendance.findOne({ employee: employee._id, date: today }),
    Attendance.find({ employee: employee._id, date: { $gte: `${month}-01`, $lte: `${month}-31` } }),
    LeaveBalance.findOne({ employee: employee._id }),
    LeaveRequest.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(5),
  ]);

  return {
    employee,
    todayAttendance,
    attendanceSummary: summarizeAttendance(records, month),
    leaveBalance: shapeBalance(balance),
    recentLeaves,
  };
}
