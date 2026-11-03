import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as attendanceService from '../services/attendanceService.js';
import { dateKey } from '../utils/dates.js';

export const checkIn = asyncHandler(async (req, res) => {
  const record = await attendanceService.checkIn(req.user);
  return send(res, 201, { message: 'Checked in', data: record });
});

export const checkOut = asyncHandler(async (req, res) => {
  const record = await attendanceService.checkOut(req.user);
  return send(res, 200, { message: 'Checked out', data: record });
});

export const list = asyncHandler(async (req, res) => {
  const result = await attendanceService.listAttendance(req.user, req.validated.query);
  return send(res, 200, { message: 'Attendance fetched', data: result.items, pagination: result.pagination });
});

export const mine = asyncHandler(async (req, res) => {
  const result = await attendanceService.getMyAttendance(req.user, req.validated.query);
  return send(res, 200, { message: 'Attendance fetched', data: result });
});

export const get = asyncHandler(async (req, res) => {
  const record = await attendanceService.getAttendance(req.user, req.validated.params.id);
  return send(res, 200, { message: 'Attendance fetched', data: record });
});

export const stats = asyncHandler(async (req, res) => {
  const result = await attendanceService.attendanceStats(req.validated.query);
  return send(res, 200, { message: 'Attendance stats fetched', data: result });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await attendanceService.exportAttendance(req.user, req.validated.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${dateKey()}.csv"`);
  return res.status(200).send(csv);
});
