import { z } from 'zod';

const phone = z.string().trim().regex(/^[0-9+\-()\s]{7,20}$/, 'Enter a valid phone number');
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const emergencyContact = z.object({
  name: z.string().trim().min(2, 'Emergency contact name is required'),
  phone,
  relationship: z.string().trim().min(2, 'Relationship is required'),
});

const employeeShape = {
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  phone,
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth: dateOnly,
  profileImage: z.union([z.literal(''), z.string().trim().url('Enter a valid image URL')]).optional(),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().trim().min(2, 'Designation is required'),
  joiningDate: dateOnly,
  employmentStatus: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
  address: z.string().trim().min(5, 'Address is required'),
  emergencyContact,
};

export const createEmployeeSchema = z.object({
  ...employeeShape,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm the password'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const editEmployeeSchema = z.object(employeeShape);

export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required').max(60),
  description: z.string().trim().min(2, 'Description is required').max(400),
  manager: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export const leaveSchema = z.object({
  leaveType: z.enum(['casual', 'sick', 'earned']),
  startDate: dateOnly,
  endDate: dateOnly,
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
}).refine((values) => values.endDate >= values.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone,
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: dateOnly,
  profileImage: z.union([z.literal(''), z.string().trim().url('Enter a valid image URL')]).optional(),
  address: z.string().trim().min(5, 'Address is required'),
  emergencyContact,
});

export const adminProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm the password'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
