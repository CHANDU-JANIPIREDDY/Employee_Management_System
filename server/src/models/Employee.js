import mongoose from 'mongoose';
import { withJson } from '../utils/schema.js';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const employeeSchema = withJson(new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: String, required: true },
    profileImage: { type: String, default: '' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: String, required: true, trim: true },
    joiningDate: { type: String, required: true },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'terminated'],
      default: 'active',
    },
    address: { type: String, required: true, trim: true },
    emergencyContact: { type: emergencyContactSchema, required: true },
  },
  { timestamps: true },
));

employeeSchema.index({ fullName: 1 });
employeeSchema.index({ department: 1, employmentStatus: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
