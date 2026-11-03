import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';
import { LEAVE_QUOTAS } from '../utils/constants.js';

const leaveBalanceSchema = withJson(new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    casualTotal: { type: Number, default: LEAVE_QUOTAS.casual },
    casualUsed: { type: Number, default: 0 },
    sickTotal: { type: Number, default: LEAVE_QUOTAS.sick },
    sickUsed: { type: Number, default: 0 },
    earnedTotal: { type: Number, default: LEAVE_QUOTAS.earned },
    earnedUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
));

export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
