import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const attendanceSchema = withJson(new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ['present', 'absent', 'late', 'half_day'], required: true },
    workingHours: { type: Number, default: 0 },
  },
  { timestamps: true },
));

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
