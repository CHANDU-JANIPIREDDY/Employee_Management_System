import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const departmentSchema = withJson(new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
));

export const Department = mongoose.model('Department', departmentSchema);
