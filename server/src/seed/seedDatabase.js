import { env } from '../config/env.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { Employee } from '../models/Employee.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Attendance } from '../models/Attendance.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { LEAVE_QUOTAS } from '../utils/constants.js';
import { addDays, dateKey, deriveAttendanceStatus, isWeekend, workingHoursBetween, zonedTime } from '../utils/dates.js';
import { hashPassword } from '../utils/password.js';
import { nextEmployeeId } from '../services/employeeIdService.js';

const DEMO_EMPLOYEE_EMAIL = 'employee@smartsystem.com';

const departments = [
  { name: 'Engineering', description: 'Product engineering, design, and quality.', status: 'active' },
  { name: 'Human Resources', description: 'People operations, hiring, and workplace policy.', status: 'active' },
  { name: 'Finance', description: 'Accounting, payroll, and financial planning.', status: 'active' },
];

const people = [
  { fullName: 'Riya Sharma', email: DEMO_EMPLOYEE_EMAIL, phone: '+91 98450 11001', gender: 'female', dateOfBirth: '1996-03-14', department: 'Engineering', designation: 'Software Engineer', joiningDate: '2023-06-12', employmentStatus: 'active', address: '14 Residency Road, Bengaluru', emergencyContact: { name: 'Anil Sharma', phone: '+91 98450 22001', relationship: 'Father' }, casualUsed: 1 },
  { fullName: 'Arjun Patel', email: 'arjun.patel@smartsystem.com', phone: '+91 98450 11002', gender: 'male', dateOfBirth: '1993-11-02', department: 'Engineering', designation: 'Senior Developer', joiningDate: '2022-01-17', employmentStatus: 'active', address: '88 CG Road, Ahmedabad', emergencyContact: { name: 'Meera Patel', phone: '+91 98450 22002', relationship: 'Spouse' } },
  { fullName: 'Neha Kapoor', email: 'neha.kapoor@smartsystem.com', phone: '+91 98450 11003', gender: 'female', dateOfBirth: '1997-07-21', department: 'Engineering', designation: 'QA Engineer', joiningDate: '2024-02-05', employmentStatus: 'active', address: '22 Banjara Hills, Hyderabad', emergencyContact: { name: 'Rakesh Kapoor', phone: '+91 98450 22003', relationship: 'Brother' } },
  { fullName: 'Vikram Singh', email: 'vikram.singh@smartsystem.com', phone: '+91 98450 11004', gender: 'male', dateOfBirth: '1988-01-09', department: 'Engineering', designation: 'Engineering Manager', joiningDate: '2021-04-19', employmentStatus: 'active', address: '5 Civil Lines, Jaipur', emergencyContact: { name: 'Pooja Singh', phone: '+91 98450 22004', relationship: 'Spouse' } },
  { fullName: 'Meera Iyer', email: 'meera.iyer@smartsystem.com', phone: '+91 98450 11005', gender: 'female', dateOfBirth: '1990-09-30', department: 'Human Resources', designation: 'HR Manager', joiningDate: '2021-08-02', employmentStatus: 'active', address: '41 Boat Club Road, Chennai', emergencyContact: { name: 'Lakshmi Iyer', phone: '+91 98450 22005', relationship: 'Mother' } },
  { fullName: 'Kabir Khan', email: 'kabir.khan@smartsystem.com', phone: '+91 98450 11006', gender: 'male', dateOfBirth: '1995-05-18', department: 'Human Resources', designation: 'Recruiter', joiningDate: '2023-11-13', employmentStatus: 'on_leave', address: '19 Bandra West, Mumbai', emergencyContact: { name: 'Sara Khan', phone: '+91 98450 22006', relationship: 'Sister' } },
  { fullName: 'Ananya Desai', email: 'ananya.desai@smartsystem.com', phone: '+91 98450 11007', gender: 'female', dateOfBirth: '1989-12-11', department: 'Finance', designation: 'Finance Manager', joiningDate: '2020-03-23', employmentStatus: 'active', address: '7 Law Garden, Ahmedabad', emergencyContact: { name: 'Nitin Desai', phone: '+91 98450 22007', relationship: 'Spouse' } },
  { fullName: 'Rohan Gupta', email: 'rohan.gupta@smartsystem.com', phone: '+91 98450 11008', gender: 'male', dateOfBirth: '1994-06-27', department: 'Finance', designation: 'Accountant', joiningDate: '2022-09-01', employmentStatus: 'active', address: '63 Park Street, Kolkata', emergencyContact: { name: 'Seema Gupta', phone: '+91 98450 22008', relationship: 'Mother' } },
  { fullName: 'Sara Fernandes', email: 'sara.fernandes@smartsystem.com', phone: '+91 98450 11009', gender: 'female', dateOfBirth: '1998-02-08', department: 'Engineering', designation: 'UI Designer', joiningDate: '2024-05-20', employmentStatus: 'active', address: '3 Panaji Market, Goa', emergencyContact: { name: 'Joel Fernandes', phone: '+91 98450 22009', relationship: 'Father' } },
  { fullName: 'Dev Malhotra', email: 'dev.malhotra@smartsystem.com', phone: '+91 98450 11010', gender: 'male', dateOfBirth: '1992-10-16', department: 'Finance', designation: 'Analyst', joiningDate: '2021-12-06', employmentStatus: 'inactive', address: '90 Sector 17, Chandigarh', emergencyContact: { name: 'Asha Malhotra', phone: '+91 98450 22010', relationship: 'Spouse' } },
];

async function upsertNotification(payload) {
  const existing = await Notification.findOne({ dedupeKey: payload.dedupeKey });
  if (existing) return existing;
  return Notification.create(payload);
}

export async function seedDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production.');
  }

  const adminPassword = await hashPassword('Admin@123');
  const employeePassword = await hashPassword('Employee@123');

  const admin = await User.findOneAndUpdate(
    { email: 'admin@smartsystem.com' },
    {
      email: 'admin@smartsystem.com',
      password: adminPassword,
      role: 'ADMIN',
      name: 'System Admin',
      isActive: true,
      employee: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const departmentDocs = {};
  for (const item of departments) {
    const department = await Department.findOneAndUpdate(
      { nameKey: item.name.toLowerCase() },
      { ...item, nameKey: item.name.toLowerCase() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    departmentDocs[item.name] = department;
  }

  const employeeDocs = {};
  for (const person of people) {
    let employee = await Employee.findOne({ email: person.email });
    let user = await User.findOne({ email: person.email });
    if (!user) {
      user = await User.create({
        email: person.email,
        password: employeePassword,
        role: 'EMPLOYEE',
        name: person.fullName,
        isActive: person.employmentStatus !== 'inactive' && person.employmentStatus !== 'terminated',
      });
    } else {
      user.password = employeePassword;
      user.name = person.fullName;
      user.role = 'EMPLOYEE';
      user.isActive = person.employmentStatus !== 'inactive' && person.employmentStatus !== 'terminated';
      await user.save();
    }

    if (!employee) {
      employee = await Employee.create({
        employeeId: await nextEmployeeId(),
        user: user._id,
        fullName: person.fullName,
        email: person.email,
        phone: person.phone,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        profileImage: '',
        department: departmentDocs[person.department]._id,
        designation: person.designation,
        joiningDate: person.joiningDate,
        employmentStatus: person.employmentStatus,
        address: person.address,
        emergencyContact: person.emergencyContact,
      });
      await LeaveBalance.create({
        employee: employee._id,
        casualTotal: LEAVE_QUOTAS.casual,
        casualUsed: person.casualUsed || 0,
        sickTotal: LEAVE_QUOTAS.sick,
        sickUsed: 0,
        earnedTotal: LEAVE_QUOTAS.earned,
        earnedUsed: person.email === 'kabir.khan@smartsystem.com' ? 2 : 0,
      });
    }

    user.employee = employee._id;
    await user.save();
    employeeDocs[person.email] = employee;
  }

  await Department.findByIdAndUpdate(departmentDocs.Engineering._id, { manager: employeeDocs['vikram.singh@smartsystem.com']._id });
  await Department.findByIdAndUpdate(departmentDocs['Human Resources']._id, { manager: employeeDocs['meera.iyer@smartsystem.com']._id });
  await Department.findByIdAndUpdate(departmentDocs.Finance._id, { manager: employeeDocs['ananya.desai@smartsystem.com']._id });

  const today = dateKey();
  const checkedInToday = new Set([
    'arjun.patel@smartsystem.com',
    'neha.kapoor@smartsystem.com',
    'vikram.singh@smartsystem.com',
    'meera.iyer@smartsystem.com',
    'ananya.desai@smartsystem.com',
    'rohan.gupta@smartsystem.com',
  ]);

  for (const person of people) {
    const employee = employeeDocs[person.email];
    for (let offset = 14; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      if (isWeekend(date)) continue;
      if (person.email === DEMO_EMPLOYEE_EMAIL && date === today) continue;
      if (person.employmentStatus === 'inactive' && date === today) continue;
      if (person.email === 'kabir.khan@smartsystem.com' && date === today) continue;

      const seed = person.fullName.length + offset;
      if (date !== today && seed % 7 === 0) continue;

      let startHour = 9;
      let startMinute = 5;
      let endHour = 18;
      let endMinute = 0;
      if (seed % 5 === 0) {
        startHour = 9;
        startMinute = 50;
      }
      if (seed % 6 === 0) {
        endHour = 12;
        endMinute = 30;
      }

      const openToday = date === today && checkedInToday.has(person.email);
      const checkIn = zonedTime(date, startHour, startMinute, env.APP_TIMEZONE);
      const checkOut = openToday ? null : zonedTime(date, endHour, endMinute, env.APP_TIMEZONE);
      const status = deriveAttendanceStatus(checkIn, checkOut, env.APP_TIMEZONE);
      const workingHours = checkOut ? workingHoursBetween(checkIn, checkOut) : 0;

      await Attendance.updateOne(
        { employee: employee._id, date },
        { $setOnInsert: { employee: employee._id, date, checkIn, checkOut, status, workingHours } },
        { upsert: true },
      );
    }
  }

  const pastLeaveDate = addDays(today, -20);
  const futureStart = addDays(today, 21);
  const futureEnd = addDays(today, 23);

  const leaveSeeds = [
    {
      dedupeKey: 'seed-riya-casual',
      email: DEMO_EMPLOYEE_EMAIL,
      leaveType: 'casual',
      startDate: pastLeaveDate,
      endDate: pastLeaveDate,
      days: 1,
      reason: 'Family appointment that was scheduled in advance.',
      status: 'approved',
      remarks: 'Approved during seeding.',
    },
    {
      dedupeKey: 'seed-arjun-pending',
      email: 'arjun.patel@smartsystem.com',
      leaveType: 'casual',
      startDate: futureStart,
      endDate: futureEnd,
      days: 3,
      reason: 'Travel for a family function outside the city.',
      status: 'pending',
      remarks: '',
    },
    {
      dedupeKey: 'seed-neha-rejected',
      email: 'neha.kapoor@smartsystem.com',
      leaveType: 'sick',
      startDate: addDays(today, -8),
      endDate: addDays(today, -8),
      days: 1,
      reason: 'Fever and a clinic visit.',
      status: 'rejected',
      remarks: 'Please submit a medical note.',
    },
    {
      dedupeKey: 'seed-sara-cancelled',
      email: 'sara.fernandes@smartsystem.com',
      leaveType: 'earned',
      startDate: addDays(today, 40),
      endDate: addDays(today, 41),
      days: 2,
      reason: 'Personal plan that was later cancelled.',
      status: 'cancelled',
      remarks: '',
    },
    {
      dedupeKey: 'seed-kabir-approved',
      email: 'kabir.khan@smartsystem.com',
      leaveType: 'earned',
      startDate: today,
      endDate: addDays(today, 1),
      days: 2,
      reason: 'Approved earned leave already in progress.',
      status: 'approved',
      remarks: 'Coverage arranged with the HR team.',
    },
  ];

  for (const item of leaveSeeds) {
    const exists = await LeaveRequest.findOne({ dedupeKey: item.dedupeKey });
    if (exists) continue;
    await LeaveRequest.create({
      employee: employeeDocs[item.email]._id,
      leaveType: item.leaveType,
      startDate: item.startDate,
      endDate: item.endDate,
      days: item.days,
      reason: item.reason,
      status: item.status,
      remarks: item.remarks,
      reviewedBy: item.status === 'pending' || item.status === 'cancelled' ? null : admin._id,
      reviewedAt: item.status === 'pending' || item.status === 'cancelled' ? null : new Date(),
      dedupeKey: item.dedupeKey,
    });
  }

  const pending = await LeaveRequest.countDocuments({ status: 'pending' });
  if (pending === 0) {
    const start = addDays(today, 55);
    await LeaveRequest.create({
      employee: employeeDocs['arjun.patel@smartsystem.com']._id,
      leaveType: 'sick',
      startDate: start,
      endDate: start,
      days: 1,
      reason: 'Seeded pending leave request so approvals can be demonstrated.',
      status: 'pending',
      dedupeKey: `seed-pending-${start}`,
    });
  }

  await upsertNotification({
    dedupeKey: 'seed-admin-welcome',
    recipient: admin._id,
    title: 'Workspace ready',
    message: 'Departments, employees, attendance, and leave data have been seeded.',
    type: 'employee_created',
    link: '/',
    read: false,
  });
  await upsertNotification({
    dedupeKey: 'seed-admin-leave',
    recipient: admin._id,
    title: 'Leave request submitted',
    message: 'Arjun Patel has a pending casual leave request.',
    type: 'leave_submitted',
    link: '/leaves',
    read: false,
  });
  await upsertNotification({
    dedupeKey: 'seed-riya-approved',
    recipient: employeeDocs[DEMO_EMPLOYEE_EMAIL].user,
    title: 'Leave approved',
    message: 'Your earlier casual leave request was approved.',
    type: 'leave_approved',
    link: '/leaves',
    read: false,
  });

  if (await AuditLog.countDocuments() === 0) {
    await AuditLog.create({
      actor: admin._id,
      action: 'SEED_COMPLETED',
      entity: 'System',
      message: 'Loaded demo departments, employees, attendance, and leave requests.',
    });
  }

  return { adminEmail: admin.email, employeeEmail: DEMO_EMPLOYEE_EMAIL };
}
