import { z } from 'zod';
import {
  ATTENDANCE_STATUSES,
  DEPARTMENT_STATUSES,
  EMPLOYMENT_STATUSES,
  GENDERS,
  LEAVE_TYPES,
} from '../utils/constants.js';
import { dateKey } from '../utils/dates.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const optionalQueryString = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.string().trim().max(80).optional(),
);

const optionalObjectId = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  objectId.optional(),
);

export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, 'Use a valid date');

const phone = z.string().trim().regex(/^[0-9+\-()\s]{7,20}$/, 'Enter a valid phone number');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

const optionalUrl = z.union([z.literal(''), z.string().trim().url('Enter a valid image URL')]).optional().default('');

const emergencyContact = z.object({
  name: z.string().trim().min(2, 'Emergency contact name is required').max(80),
  phone,
  relationship: z.string().trim().min(2, 'Relationship is required').max(40),
});

const employeeFields = {
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  email: z.string().trim().email('Enter a valid email').toLowerCase(),
  phone,
  gender: z.enum(GENDERS),
  dateOfBirth: dateOnly.refine((value) => value < dateKey(), 'Date of birth must be in the past'),
  profileImage: optionalUrl,
  department: objectId,
  designation: z.string().trim().min(2, 'Designation is required').max(80),
  joiningDate: dateOnly,
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional().default('active'),
  address: z.string().trim().min(5, 'Address is required').max(300),
  emergencyContact,
};

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
});

export const createEmployeeSchema = z.object({
  body: z.object({
    ...employeeFields,
    password: passwordSchema,
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object(employeeFields),
});

export const idSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listEmployeesSchema = z.object({
  query: z.object({
    search: optionalQueryString,
    department: optionalObjectId,
    status: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.enum(EMPLOYMENT_STATUSES).optional(),
    ),
    designation: optionalQueryString,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.enum(['fullName', 'joiningDate', 'employeeId', 'createdAt', 'designation']).default('fullName'),
    ),
    sortOrder: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.enum(['asc', 'desc']).default('asc'),
    ),
  }),
});

const departmentBody = z.object({
  name: z.string().trim().min(2, 'Department name is required').max(60),
  description: z.string().trim().min(2, 'Description is required').max(400),
  manager: z.union([objectId, z.literal(''), z.null()]).optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional().default('active'),
});

export const createDepartmentSchema = z.object({ body: departmentBody });
export const updateDepartmentSchema = z.object({
  params: z.object({ id: objectId }),
  body: departmentBody,
});

export const listDepartmentsSchema = z.object({
  query: z.object({
    search: optionalQueryString,
    status: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.enum(DEPARTMENT_STATUSES).optional(),
    ),
  }),
});

const attendanceQuery = z.object({
  from: z.preprocess((value) => (value === '' || value == null ? undefined : value), dateOnly.optional()),
  to: z.preprocess((value) => (value === '' || value == null ? undefined : value), dateOnly.optional()),
  employee: optionalObjectId,
  status: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.enum(ATTENDANCE_STATUSES).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).refine((query) => !query.from || !query.to || query.from <= query.to, {
  message: 'End date cannot be before start date',
  path: ['to'],
});

export const listAttendanceSchema = z.object({ query: attendanceQuery });

export const attendanceStatsSchema = z.object({
  query: z.object({
    date: z.preprocess((value) => (value === '' || value == null ? undefined : value), dateOnly.optional()),
  }),
});

export const myAttendanceSchema = z.object({
  query: z.object({
    month: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM').optional(),
    ),
  }),
});

const leaveQuery = z.object({
  employee: optionalObjectId,
  leaveType: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.enum(LEAVE_TYPES).optional(),
  ),
  status: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  ),
  from: z.preprocess((value) => (value === '' || value == null ? undefined : value), dateOnly.optional()),
  to: z.preprocess((value) => (value === '' || value == null ? undefined : value), dateOnly.optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).refine((query) => !query.from || !query.to || query.from <= query.to, {
  message: 'End date cannot be before start date',
  path: ['to'],
});

export const listLeavesSchema = z.object({ query: leaveQuery });

export const applyLeaveSchema = z.object({
  body: z.object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: dateOnly,
    endDate: dateOnly,
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
  }).refine((body) => body.endDate >= body.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  }),
});

export const approveLeaveSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    remarks: z.string().trim().max(500).optional().default(''),
  }).optional().default({ remarks: '' }),
});

export const rejectLeaveSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    remarks: z.string().trim().min(3, 'Remarks are required when rejecting leave').max(500),
  }),
});

export const profileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    fullName: z.string().trim().min(2).max(80).optional(),
    phone: phone.optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: dateOnly.refine((value) => value < dateKey(), 'Date of birth must be in the past').optional(),
    profileImage: z.union([z.literal(''), z.string().trim().url('Enter a valid image URL')]).optional(),
    address: z.string().trim().min(5).max(300).optional(),
    emergencyContact: emergencyContact.optional(),
  }).refine((body) => Object.keys(body).length > 0, { message: 'No changes submitted' }),
});

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(15),
  }),
});
