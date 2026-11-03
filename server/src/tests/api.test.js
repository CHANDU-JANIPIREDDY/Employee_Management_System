import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveBalance } from '../models/LeaveBalance.js';

let mongo;
let adminToken;
let departmentId;

const password = 'Employee@123';

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

async function login(email, plainPassword) {
  const response = await request(app).post('/api/auth/login').send({ email, password: plainPassword });
  return response;
}

function employeePayload(overrides = {}) {
  return {
    fullName: 'Test Employee',
    email: 'test.employee@smartsystem.com',
    password,
    phone: '+91 9876543210',
    gender: 'female',
    dateOfBirth: '1998-04-12',
    department: departmentId,
    designation: 'Analyst',
    joiningDate: '2024-01-15',
    employmentStatus: 'active',
    address: '221 Residency Road, Bengaluru',
    emergencyContact: { name: 'Asha Rao', phone: '+91 9876500000', relationship: 'Sister' },
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await clearDatabase();
  const department = await Department.create({
    name: 'Engineering',
    nameKey: 'engineering',
    description: 'Engineering team',
    status: 'active',
  });
  departmentId = String(department._id);
  await User.create({
    email: 'admin@smartsystem.com',
    password: await bcrypt.hash('Admin@123', 4),
    role: 'ADMIN',
    name: 'System Admin',
    isActive: true,
  });
  const response = await login('admin@smartsystem.com', 'Admin@123');
  adminToken = response.body.data.token;
});

describe('health and authentication', () => {
  it('returns a health payload', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.db).toBe('connected');
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    const valid = await login('admin@smartsystem.com', 'Admin@123');
    expect(valid.status).toBe(200);
    expect(valid.body.data.token).toBeTruthy();
    expect(valid.body.data.user.password).toBeUndefined();
    expect(valid.body.data.user.role).toBe('ADMIN');

    const invalid = await login('admin@smartsystem.com', 'wrong-password');
    expect(invalid.status).toBe(401);
    expect(invalid.body.message).toBe('Invalid email or password');

    const missing = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(missing.status).toBe(400);
  });

  it('blocks requests without a token and expired sessions after logout', async () => {
    const unauthenticated = await request(app).get('/api/employees');
    expect(unauthenticated.status).toBe(401);

    const logout = await request(app).post('/api/auth/logout').set(auth(adminToken));
    expect(logout.status).toBe(200);
    const after = await request(app).get('/api/auth/me').set(auth(adminToken));
    expect(after.status).toBe(401);
  });

  it('changes the password and invalidates the previous token', async () => {
    const changed = await request(app).post('/api/auth/change-password').set(auth(adminToken)).send({
      currentPassword: 'Admin@123',
      newPassword: 'Admin@456',
    });
    expect(changed.status).toBe(200);
    const oldSession = await request(app).get('/api/auth/me').set(auth(adminToken));
    expect(oldSession.status).toBe(401);
    const nextLogin = await login('admin@smartsystem.com', 'Admin@456');
    expect(nextLogin.status).toBe(200);
  });
});

describe('employees and departments', () => {
  it('creates, updates, searches, paginates, and blocks duplicate emails', async () => {
    const created = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload());
    expect(created.status).toBe(201);
    expect(created.body.data.employeeId).toMatch(/^EMP-/);
    expect(created.body.data.password).toBeUndefined();

    const duplicate = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload());
    expect(duplicate.status).toBe(409);

    const updated = await request(app).put(`/api/employees/${created.body.data.id}`).set(auth(adminToken)).send(employeePayload({
      email: created.body.data.email,
      designation: 'Senior Analyst',
      password: undefined,
    }));
    expect(updated.status).toBe(200);
    expect(updated.body.data.designation).toBe('Senior Analyst');

    for (let index = 1; index <= 12; index += 1) {
      const response = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload({
        fullName: `Employee ${String(index).padStart(2, '0')}`,
        email: `person${index}@smartsystem.com`,
        designation: index % 2 === 0 ? 'Designer' : 'Analyst',
      }));
      expect(response.status).toBe(201);
    }

    const page = await request(app).get('/api/employees?page=2&limit=10&sortBy=fullName&sortOrder=asc').set(auth(adminToken));
    expect(page.status).toBe(200);
    expect(page.body.pagination.total).toBe(13);
    expect(page.body.pagination.totalPages).toBe(2);
    expect(page.body.data).toHaveLength(3);

    const search = await request(app).get('/api/employees').query({ search: 'Employee 01' }).set(auth(adminToken));
    expect(search.status).toBe(200);
    expect(search.body.data[0].fullName).toBe('Employee 01');

    const filtered = await request(app).get('/api/employees').query({ designation: 'Designer', status: 'active' }).set(auth(adminToken));
    expect(filtered.body.data.every((item) => item.designation === 'Designer')).toBe(true);
  });

  it('deactivates an employee and blocks the old login', async () => {
    const created = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload());
    const removed = await request(app).delete(`/api/employees/${created.body.data.id}`).set(auth(adminToken));
    expect(removed.status).toBe(200);
    expect(removed.body.data.employmentStatus).toBe('inactive');
    const attempt = await login(created.body.data.email, password);
    expect(attempt.status).toBe(403);
  });

  it('rejects invalid ids and unknown employees', async () => {
    const invalid = await request(app).get('/api/employees/not-an-id').set(auth(adminToken));
    expect(invalid.status).toBe(400);
    const missing = await request(app).get('/api/employees/507f1f77bcf86cd799439011').set(auth(adminToken));
    expect(missing.status).toBe(404);
  });

  it('prevents deleting a department that still has employees', async () => {
    const second = await request(app).post('/api/departments').set(auth(adminToken)).send({
      name: 'Finance',
      description: 'Finance team',
      status: 'active',
    });
    expect(second.status).toBe(201);

    const duplicate = await request(app).post('/api/departments').set(auth(adminToken)).send({
      name: 'finance',
      description: 'Duplicate team',
    });
    expect(duplicate.status).toBe(409);

    const created = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload());
    const blocked = await request(app).delete(`/api/departments/${departmentId}`).set(auth(adminToken));
    expect(blocked.status).toBe(409);

    await request(app).put(`/api/employees/${created.body.data.id}`).set(auth(adminToken)).send(employeePayload({
      email: created.body.data.email,
      department: second.body.data.id,
    }));
    const removed = await request(app).delete(`/api/departments/${departmentId}`).set(auth(adminToken));
    expect(removed.status).toBe(200);
  });
});

describe('attendance', () => {
  async function createEmployee(email = 'worker@smartsystem.com') {
    const response = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload({ email, fullName: 'Worker One' }));
    const session = await login(email, password);
    return { employee: response.body.data, token: session.body.data.token };
  }

  it('checks in once, checks out, and calculates working hours', async () => {
    const { employee, token } = await createEmployee();
    const early = await request(app).post('/api/attendance/check-out').set(auth(token));
    expect(early.status).toBe(400);

    const first = await request(app).post('/api/attendance/check-in').set(auth(token)).send({ checkIn: '2000-01-01T00:00:00.000Z' });
    expect(first.status).toBe(201);
    expect(['present', 'late']).toContain(first.body.data.status);

    const duplicate = await request(app).post('/api/attendance/check-in').set(auth(token));
    expect(duplicate.status).toBe(409);

    await Attendance.updateOne({ _id: first.body.data.id }, { checkIn: new Date(Date.now() - (5 * 60 * 60 * 1000)) });
    const checkedOut = await request(app).post('/api/attendance/check-out').set(auth(token));
    expect(checkedOut.status).toBe(200);
    expect(checkedOut.body.data.workingHours).toBeGreaterThan(4.9);
    expect(checkedOut.body.data.workingHours).toBeLessThan(5.2);
    expect(checkedOut.body.data.status).not.toBe('half_day');

    const again = await request(app).post('/api/attendance/check-out').set(auth(token));
    expect(again.status).toBe(409);

    const mine = await request(app).get('/api/attendance/me').set(auth(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.summary.workingHours).toBeGreaterThan(4);

    const other = await createEmployee('other@smartsystem.com');
    const forbidden = await request(app).get(`/api/attendance/${checkedOut.body.data.id}`).set(auth(other.token));
    expect(forbidden.status).toBe(403);
    expect(employee.id).toBeTruthy();
  });

  it('lets an admin filter and export attendance', async () => {
    const { token } = await createEmployee('export@smartsystem.com');
    await request(app).post('/api/attendance/check-in').set(auth(token));
    const stats = await request(app).get('/api/attendance/stats').set(auth(adminToken));
    expect(stats.status).toBe(200);
    expect(stats.body.data.totalEmployees).toBeGreaterThanOrEqual(1);
    const csv = await request(app).get('/api/attendance/export').set(auth(adminToken));
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('Employee ID');
    const denied = await request(app).get('/api/attendance/export').set(auth(token));
    expect(denied.status).toBe(403);
  });
});

describe('leave', () => {
  async function employeeSession(email = 'leave.user@smartsystem.com') {
    await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload({ email, fullName: 'Leave User' }));
    const session = await login(email, password);
    return session.body.data.token;
  }

  it('rejects invalid dates, overlap, and balance mistakes, then approves once', async () => {
    const token = await employeeSession();
    const invalid = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'casual',
      startDate: '2026-12-10',
      endDate: '2026-12-08',
      reason: 'Dates are reversed on purpose.',
    });
    expect(invalid.status).toBe(400);

    const created = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'casual',
      startDate: '2026-12-10',
      endDate: '2026-12-11',
      reason: 'Family function outside the city.',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');

    const overlap = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'sick',
      startDate: '2026-12-11',
      endDate: '2026-12-12',
      reason: 'This overlaps the first request.',
    });
    expect(overlap.status).toBe(409);

    const employeeDenied = await request(app).patch(`/api/leaves/${created.body.data.id}/approve`).set(auth(token)).send({ remarks: 'no' });
    expect(employeeDenied.status).toBe(403);

    const balanceBefore = await LeaveBalance.findOne({ employee: created.body.data.employee.id || created.body.data.employee });
    expect(balanceBefore.casualUsed).toBe(0);

    const approved = await request(app).patch(`/api/leaves/${created.body.data.id}/approve`).set(auth(adminToken)).send({ remarks: 'Approved for the event.' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');
    const balanceAfter = await LeaveBalance.findOne({ employee: balanceBefore.employee });
    expect(balanceAfter.casualUsed).toBe(2);

    const second = await request(app).patch(`/api/leaves/${created.body.data.id}/approve`).set(auth(adminToken)).send({});
    expect(second.status).toBe(409);
    const balanceStill = await LeaveBalance.findOne({ employee: balanceBefore.employee });
    expect(balanceStill.casualUsed).toBe(2);
  });

  it('does not deduct balance for rejection or cancellation', async () => {
    const token = await employeeSession('reject.user@smartsystem.com');
    const rejectedRequest = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'sick',
      startDate: '2026-12-02',
      endDate: '2026-12-02',
      reason: 'Clinic visit for a fever.',
    });
    const rejected = await request(app).patch(`/api/leaves/${rejectedRequest.body.data.id}/reject`).set(auth(adminToken)).send({ remarks: 'Need a medical note.' });
    expect(rejected.status).toBe(200);
    const balance = await LeaveBalance.findOne({ employee: rejectedRequest.body.data.employee.id || rejectedRequest.body.data.employee });
    expect(balance.sickUsed).toBe(0);

    const pending = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'earned',
      startDate: '2026-12-18',
      endDate: '2026-12-18',
      reason: 'Personal errand that can be cancelled.',
    });
    const cancelled = await request(app).patch(`/api/leaves/${pending.body.data.id}/cancel`).set(auth(token));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
    const earned = await LeaveBalance.findOne({ employee: balance.employee });
    expect(earned.earnedUsed).toBe(0);

    const tooMany = await request(app).post('/api/leaves').set(auth(token)).send({
      leaveType: 'casual',
      startDate: '2027-01-04',
      endDate: '2027-02-01',
      reason: 'This request is longer than the available casual balance.',
    });
    expect(tooMany.status).toBe(400);
  });
});

describe('dashboard, notifications, profile, and access control', () => {
  it('builds the admin dashboard from stored records and creates notifications', async () => {
    const created = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload());
    const employeeLogin = await login(created.body.data.email, password);
    const employeeToken = employeeLogin.body.data.token;

    await request(app).post('/api/attendance/check-in').set(auth(employeeToken));
    const dashboard = await request(app).get('/api/dashboard/admin').set(auth(adminToken));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalEmployees).toBe(1);
    expect(dashboard.body.data.activeEmployees).toBe(1);
    expect(dashboard.body.data.presentToday).toBe(1);
    expect(dashboard.body.data.attendanceTrend).toHaveLength(7);
    expect(dashboard.body.data.departmentDistribution[0].count).toBe(1);

    const employeeDashboard = await request(app).get('/api/dashboard/employee').set(auth(employeeToken));
    expect(employeeDashboard.status).toBe(200);
    expect(employeeDashboard.body.data.todayAttendance).toBeTruthy();
    const adminDenied = await request(app).get('/api/dashboard/employee').set(auth(adminToken));
    expect(adminDenied.status).toBe(403);
    const employeeDenied = await request(app).get('/api/dashboard/admin').set(auth(employeeToken));
    expect(employeeDenied.status).toBe(403);

    const notifications = await request(app).get('/api/notifications').set(auth(adminToken));
    expect(notifications.status).toBe(200);
    expect(notifications.body.unreadCount).toBeGreaterThan(0);
    const note = notifications.body.data[0];
    const marked = await request(app).patch(`/api/notifications/${note.id}/read`).set(auth(adminToken));
    expect(marked.status).toBe(200);
    expect(marked.body.data.read).toBe(true);
    const hidden = await request(app).patch(`/api/notifications/${note.id}/read`).set(auth(employeeToken));
    expect(hidden.status).toBe(404);
    await request(app).patch('/api/notifications/read-all').set(auth(adminToken));
    const after = await request(app).get('/api/notifications').set(auth(adminToken));
    expect(after.body.unreadCount).toBe(0);
  });

  it('lets an employee update only permitted profile fields', async () => {
    const created = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload({ email: 'profile.user@smartsystem.com' }));
    const employeeLogin = await login('profile.user@smartsystem.com', password);
    const token = employeeLogin.body.data.token;

    const blocked = await request(app).post('/api/employees').set(auth(token)).send(employeePayload({ email: 'hack@smartsystem.com' }));
    expect(blocked.status).toBe(403);
    const directory = await request(app).get('/api/employees').set(auth(token));
    expect(directory.status).toBe(403);

    const otherId = created.body.data.id;
    const second = await request(app).post('/api/employees').set(auth(adminToken)).send(employeePayload({ email: 'second.user@smartsystem.com', fullName: 'Second User' }));
    const forbiddenRecord = await request(app).get(`/api/employees/${second.body.data.id}`).set(auth(token));
    expect(forbiddenRecord.status).toBe(403);
    const ownRecord = await request(app).get(`/api/employees/${otherId}`).set(auth(token));
    expect(ownRecord.status).toBe(200);

    const updated = await request(app).put('/api/profile').set(auth(token)).send({
      fullName: 'Profile User',
      phone: '+91 9000000000',
      gender: 'female',
      dateOfBirth: '1998-04-12',
      address: '500 Updated Street, Pune',
      emergencyContact: { name: 'Asha Rao', phone: '+91 9876500000', relationship: 'Sister' },
      designation: 'Chief Executive',
      department: departmentId,
      email: 'changed@smartsystem.com',
      employmentStatus: 'terminated',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.employee.phone).toBe('+91 9000000000');
    expect(updated.body.data.employee.designation).toBe('Analyst');
    expect(updated.body.data.employee.email).toBe('profile.user@smartsystem.com');

    const departments = await request(app).post('/api/departments').set(auth(token)).send({ name: 'Secret', description: 'Should fail' });
    expect(departments.status).toBe(403);
  });
});
