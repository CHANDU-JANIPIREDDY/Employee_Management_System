import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const leaveRequestSchema = withJson(new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: String, enum: ['casual', 'sick', 'earned'], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    remarks: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
));

leaveRequestSchema.index({ employee: 1, status: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, startDate: 1, endDate: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
