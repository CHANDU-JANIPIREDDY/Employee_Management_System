import mongoose from 'mongoose';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { Employee } from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { inclusiveDays } from '../utils/dates.js';
import { LEAVE_FIELDS, shapeBalance } from '../utils/leave.js';
import { buildPagination } from '../utils/pagination.js';
import { withTransaction } from '../utils/transaction.js';
import { notifyAdmins, notifyUser } from './notificationService.js';
import { writeAudit } from './auditService.js';

const leavePopulate = {
  path: 'employee',
  select: 'fullName employeeId designation department user',
  populate: { path: 'department', select: 'name' },
};

function leaveFilter(query) {
  const filter = {};
  if (query.employee) filter.employee = new mongoose.Types.ObjectId(query.employee);
  if (query.leaveType) filter.leaveType = query.leaveType;
  if (query.status) filter.status = query.status;
  if (query.to) filter.startDate = { $lte: query.to };
  if (query.from) filter.endDate = { $gte: query.from };
  return filter;
}

async function summaryFor(filter) {
  const rows = await LeaveRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const summary = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  for (const row of rows) summary[row._id] = row.count;
  return summary;
}

export async function applyLeave(user, payload) {
  if (!user.employee) throw new ApiError(403, 'Employee profile required');
  const days = inclusiveDays(payload.startDate, payload.endDate);
  if (days < 1) throw new ApiError(400, 'End date cannot be before start date');

  const overlap = await LeaveRequest.findOne({
    employee: user.employee,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: payload.endDate },
    endDate: { $gte: payload.startDate },
  });
  if (overlap) throw new ApiError(409, 'Leave request overlaps an existing request');

  const balance = await LeaveBalance.findOne({ employee: user.employee });
  if (!balance) throw new ApiError(400, 'Leave balance not found');
  const [usedField, totalField] = LEAVE_FIELDS[payload.leaveType];
  const pending = await LeaveRequest.aggregate([
    { $match: { employee: new mongoose.Types.ObjectId(user.employee), leaveType: payload.leaveType, status: 'pending' } },
    { $group: { _id: null, days: { $sum: '$days' } } },
  ]);
  const reserved = pending[0]?.days || 0;
  if (balance[usedField] + reserved + days > balance[totalField]) {
    throw new ApiError(400, 'Requested days exceed available leave balance');
  }

  const leave = await LeaveRequest.create({
    employee: user.employee,
    leaveType: payload.leaveType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days,
    reason: payload.reason,
    status: 'pending',
  });

  const employee = await Employee.findById(user.employee).select('fullName');
  await notifyAdmins({
    title: 'Leave request submitted',
    message: `${employee?.fullName || 'An employee'} requested ${days} day(s) of ${payload.leaveType} leave.`,
    type: 'leave_submitted',
    link: '/leaves',
  });
  await writeAudit({
    actor: user,
    action: 'LEAVE_SUBMITTED',
    entity: 'LeaveRequest',
    entityId: leave._id,
    message: `${employee?.fullName || 'Employee'} submitted a leave request`,
  });
  return LeaveRequest.findById(leave._id).populate(leavePopulate);
}

export async function listLeaves(query) {
  const filter = leaveFilter(query);
  const skip = (query.page - 1) * query.limit;
  const [items, total, summary] = await Promise.all([
    LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate(leavePopulate).populate('reviewedBy', 'name'),
    LeaveRequest.countDocuments(filter),
    summaryFor(filter),
  ]);
  return { items, summary, pagination: buildPagination(query.page, query.limit, total) };
}

export async function listMyLeaves(user, query) {
  if (!user.employee) throw new ApiError(403, 'Employee profile required');
  const scoped = { ...query, employee: user.employee };
  const result = await listLeaves(scoped);
  const balance = await LeaveBalance.findOne({ employee: user.employee });
  return { ...result, balance: shapeBalance(balance) };
}

export async function getLeave(user, id) {
  const leave = await LeaveRequest.findById(id).populate(leavePopulate).populate('reviewedBy', 'name');
  if (!leave) throw new ApiError(404, 'Leave request not found');
  const employeeId = leave.employee?._id || leave.employee;
  if (user.role !== 'ADMIN' && String(user.employee) !== String(employeeId)) {
    throw new ApiError(403, 'You can only view your own leave requests');
  }
  return leave;
}

export async function approveLeave(id, actor, remarks = '') {
  const leaveId = await withTransaction(async (session) => {
    const sessionOption = session ? { session } : {};
    const leaveQuery = LeaveRequest.findOne({ _id: id, status: 'pending' });
    if (session) leaveQuery.session(session);
    const leave = await leaveQuery;
    if (!leave) throw new ApiError(409, 'Only pending requests can be approved');

    const balanceQuery = LeaveBalance.findOne({ employee: leave.employee });
    if (session) balanceQuery.session(session);
    const balance = await balanceQuery;
    if (!balance) throw new ApiError(400, 'Leave balance not found');

    const [usedField, totalField] = LEAVE_FIELDS[leave.leaveType];
    if (balance[usedField] + leave.days > balance[totalField]) {
      throw new ApiError(400, 'Insufficient leave balance');
    }

    const updated = await LeaveBalance.findOneAndUpdate(
      { _id: balance._id, [usedField]: balance[usedField] },
      { $inc: { [usedField]: leave.days } },
      { new: true, ...sessionOption },
    );
    if (!updated) throw new ApiError(409, 'Leave balance changed. Retry the approval.');

    leave.status = 'approved';
    leave.remarks = remarks || '';
    leave.reviewedBy = actor._id;
    leave.reviewedAt = new Date();
    await leave.save(sessionOption);

    const employeeQuery = Employee.findById(leave.employee).select('fullName user');
    if (session) employeeQuery.session(session);
    const employee = await employeeQuery;
    if (employee?.user) {
      await notifyUser(employee.user, {
        title: 'Leave approved',
        message: `Your ${leave.leaveType} leave (${leave.startDate} to ${leave.endDate}) was approved.`,
        type: 'leave_approved',
        link: '/leaves',
      }, session);
    }
    await writeAudit({
      actor,
      action: 'LEAVE_APPROVED',
      entity: 'LeaveRequest',
      entityId: leave._id,
      message: `Approved leave for ${employee?.fullName || 'employee'}`,
    }, session);
    return leave._id;
  });

  return LeaveRequest.findById(leaveId).populate(leavePopulate).populate('reviewedBy', 'name');
}

export async function rejectLeave(id, actor, remarks) {
  const leave = await LeaveRequest.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'rejected', remarks, reviewedBy: actor._id, reviewedAt: new Date() },
    { new: true },
  );
  if (!leave) throw new ApiError(409, 'Only pending requests can be rejected');
  const employee = await Employee.findById(leave.employee).select('fullName user');
  if (employee?.user) {
    await notifyUser(employee.user, {
      title: 'Leave rejected',
      message: `Your ${leave.leaveType} leave (${leave.startDate} to ${leave.endDate}) was rejected.`,
      type: 'leave_rejected',
      link: '/leaves',
    });
  }
  await writeAudit({
    actor,
    action: 'LEAVE_REJECTED',
    entity: 'LeaveRequest',
    entityId: leave._id,
    message: `Rejected leave for ${employee?.fullName || 'employee'}`,
  });
  return LeaveRequest.findById(leave._id).populate(leavePopulate).populate('reviewedBy', 'name');
}

export async function cancelLeave(id, actor) {
  const leave = await LeaveRequest.findById(id);
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (String(leave.employee) !== String(actor.employee)) {
    throw new ApiError(403, 'You can only cancel your own leave requests');
  }
  if (leave.status !== 'pending') throw new ApiError(409, 'Only pending requests can be cancelled');
  leave.status = 'cancelled';
  await leave.save();
  await writeAudit({
    actor,
    action: 'LEAVE_CANCELLED',
    entity: 'LeaveRequest',
    entityId: leave._id,
    message: 'Cancelled a pending leave request',
  });
  return LeaveRequest.findById(leave._id).populate(leavePopulate);
}
