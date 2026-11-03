import { asyncHandler } from '../utils/asyncHandler.js';
import { send } from '../utils/response.js';
import * as leaveService from '../services/leaveService.js';

export const apply = asyncHandler(async (req, res) => {
  const leave = await leaveService.applyLeave(req.user, req.validated.body);
  return send(res, 201, { message: 'Leave request submitted', data: leave });
});

export const list = asyncHandler(async (req, res) => {
  const result = await leaveService.listLeaves(req.validated.query);
  return send(res, 200, {
    message: 'Leave requests fetched',
    data: result.items,
    summary: result.summary,
    pagination: result.pagination,
  });
});

export const mine = asyncHandler(async (req, res) => {
  const result = await leaveService.listMyLeaves(req.user, req.validated.query);
  return send(res, 200, {
    message: 'Leave requests fetched',
    data: result.items,
    balance: result.balance,
    summary: result.summary,
    pagination: result.pagination,
  });
});

export const get = asyncHandler(async (req, res) => {
  const leave = await leaveService.getLeave(req.user, req.validated.params.id);
  return send(res, 200, { message: 'Leave request fetched', data: leave });
});

export const approve = asyncHandler(async (req, res) => {
  const leave = await leaveService.approveLeave(req.validated.params.id, req.user, req.validated.body?.remarks || '');
  return send(res, 200, { message: 'Leave approved', data: leave });
});

export const reject = asyncHandler(async (req, res) => {
  const leave = await leaveService.rejectLeave(req.validated.params.id, req.user, req.validated.body.remarks);
  return send(res, 200, { message: 'Leave rejected', data: leave });
});

export const cancel = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancelLeave(req.validated.params.id, req.user);
  return send(res, 200, { message: 'Leave cancelled', data: leave });
});
