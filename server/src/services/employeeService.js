import { Employee } from '../models/Employee.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { ApiError } from '../utils/ApiError.js';
import { LEAVE_QUOTAS } from '../utils/constants.js';
import { escapeRegex } from '../utils/regex.js';
import { buildPagination } from '../utils/pagination.js';
import { withTransaction } from '../utils/transaction.js';
import { currentMonth, monthBounds } from '../utils/dates.js';
import { shapeBalance } from '../utils/leave.js';
import { Attendance } from '../models/Attendance.js';
import { nextEmployeeId } from './employeeIdService.js';
import { writeAudit } from './auditService.js';
import { notifyAdmins } from './notificationService.js';
import { hashPassword } from '../utils/password.js';

const ACTIVE_LOGIN = new Set(['active', 'on_leave']);

function accountIsActive(status) {
  return ACTIVE_LOGIN.has(status);
}

async function populateEmployee(id) {
  return Employee.findById(id).populate('department', 'name').populate('user', 'name email role isActive');
}

export async function listEmployees(query) {
  const filter = {};
  if (query.department) filter.department = query.department;
  if (query.status) filter.employmentStatus = query.status;
  if (query.designation) filter.designation = new RegExp(escapeRegex(query.designation), 'i');
  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ fullName: expression }, { email: expression }, { employeeId: expression }];
  }

  const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Employee.find(filter).sort(sort).skip(skip).limit(query.limit).populate('department', 'name'),
    Employee.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(query.page, query.limit, total) };
}

export async function getEmployee(id, actor) {
  const employee = await populateEmployee(id);
  if (!employee) throw new ApiError(404, 'Employee not found');
  if (actor.role !== 'ADMIN' && String(actor.employee) !== String(employee._id)) {
    throw new ApiError(403, 'You can only view your own employee record');
  }

  const month = currentMonth();
  const bounds = monthBounds(month);
  const [balance, records] = await Promise.all([
    LeaveBalance.findOne({ employee: employee._id }),
    Attendance.find({ employee: employee._id, date: { $gte: bounds.start, $lte: bounds.end } }),
  ]);

  return {
    ...employee.toJSON(),
    leaveBalance: shapeBalance(balance),
    attendanceSummary: summarizeAttendance(records, month),
  };
}

export function summarizeAttendance(records, month) {
  const workingHours = records.reduce((sum, record) => sum + (record.workingHours || 0), 0);
  return {
    month,
    present: records.filter((record) => record.status === 'present').length,
    late: records.filter((record) => record.status === 'late').length,
    halfDay: records.filter((record) => record.status === 'half_day').length,
    workingHours: Math.round(workingHours * 100) / 100,
  };
}

export async function createEmployee(payload, actor) {
  const passwordHash = await hashPassword(payload.password);
  const createdId = await withTransaction(async (session) => {
    const sessionOption = session ? { session } : {};
    const existingQuery = User.findOne({ email: payload.email });
    if (session) existingQuery.session(session);
    const existing = await existingQuery;
    if (existing) throw new ApiError(409, 'Email already in use');
    const departmentQuery = Department.findById(payload.department);
    if (session) departmentQuery.session(session);
    const department = await departmentQuery;
    if (!department) throw new ApiError(400, 'Department not found');

    const employeeId = await nextEmployeeId(session);
    const [user] = await User.create([{
      email: payload.email,
      password: passwordHash,
      role: 'EMPLOYEE',
      name: payload.fullName,
      isActive: accountIsActive(payload.employmentStatus),
    }], sessionOption);

    const [employee] = await Employee.create([{
      employeeId,
      user: user._id,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      profileImage: payload.profileImage || '',
      department: department._id,
      designation: payload.designation,
      joiningDate: payload.joiningDate,
      employmentStatus: payload.employmentStatus,
      address: payload.address,
      emergencyContact: payload.emergencyContact,
    }], sessionOption);

    user.employee = employee._id;
    await user.save(sessionOption);
    await LeaveBalance.create([{
      employee: employee._id,
      casualTotal: LEAVE_QUOTAS.casual,
      casualUsed: 0,
      sickTotal: LEAVE_QUOTAS.sick,
      sickUsed: 0,
      earnedTotal: LEAVE_QUOTAS.earned,
      earnedUsed: 0,
    }], sessionOption);

    await notifyAdmins({
      title: 'New employee added',
      message: `${employee.fullName} (${employee.employeeId}) joined ${department.name}.`,
      type: 'employee_created',
      link: `/employees/${employee._id}`,
    }, session);
    await writeAudit({
      actor,
      action: 'EMPLOYEE_CREATED',
      entity: 'Employee',
      entityId: employee._id,
      message: `Created employee ${employee.fullName}`,
    }, session);
    return employee._id;
  });

  return populateEmployee(createdId);
}

export async function updateEmployee(id, payload, actor) {
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, 'Employee not found');
  const department = await Department.findById(payload.department);
  if (!department) throw new ApiError(400, 'Department not found');

  const emailOwner = await User.findOne({ email: payload.email, _id: { $ne: employee.user } });
  if (emailOwner) throw new ApiError(409, 'Email already in use');
  const duplicateEmployee = await Employee.findOne({ email: payload.email, _id: { $ne: employee._id } });
  if (duplicateEmployee) throw new ApiError(409, 'Email already in use');

  employee.fullName = payload.fullName;
  employee.email = payload.email;
  employee.phone = payload.phone;
  employee.gender = payload.gender;
  employee.dateOfBirth = payload.dateOfBirth;
  employee.profileImage = payload.profileImage || '';
  employee.department = department._id;
  employee.designation = payload.designation;
  employee.joiningDate = payload.joiningDate;
  employee.employmentStatus = payload.employmentStatus;
  employee.address = payload.address;
  employee.emergencyContact = payload.emergencyContact;
  await employee.save();

  await User.findByIdAndUpdate(employee.user, {
    email: payload.email,
    name: payload.fullName,
    isActive: accountIsActive(payload.employmentStatus),
  });

  await writeAudit({
    actor,
    action: 'EMPLOYEE_UPDATED',
    entity: 'Employee',
    entityId: employee._id,
    message: `Updated employee ${employee.fullName}`,
  });
  return populateEmployee(employee._id);
}

export async function deactivateEmployee(id, actor) {
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, 'Employee not found');
  employee.employmentStatus = 'inactive';
  await employee.save();
  const user = await User.findById(employee.user);
  if (user) {
    user.isActive = false;
    user.tokenVersion += 1;
    await user.save();
  }
  await writeAudit({
    actor,
    action: 'EMPLOYEE_DEACTIVATED',
    entity: 'Employee',
    entityId: employee._id,
    message: `Deactivated employee ${employee.fullName}`,
  });
  return populateEmployee(employee._id);
}
