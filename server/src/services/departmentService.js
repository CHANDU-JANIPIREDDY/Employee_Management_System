import { Department } from '../models/Department.js';
import { Employee } from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAudit } from './auditService.js';

function nameKey(name) {
  return name.trim().toLowerCase();
}

async function assertManager(managerId, session) {
  if (!managerId) return null;
  const query = Employee.findById(managerId).select('_id');
  if (session) query.session(session);
  const manager = await query;
  if (!manager) throw new ApiError(400, 'Department manager was not found');
  return manager._id;
}

async function countsByDepartment() {
  const rows = await Employee.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

function shapeDepartment(department, counts) {
  const json = department.toJSON();
  json.employeeCount = counts.get(String(department._id)) || 0;
  return json;
}

export async function listDepartments(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.name = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const departments = await Department.find(filter).sort({ name: 1 }).populate('manager', 'fullName employeeId');
  const counts = await countsByDepartment();
  return departments.map((department) => shapeDepartment(department, counts));
}

export async function createDepartment(payload, actor) {
  const key = nameKey(payload.name);
  const existing = await Department.findOne({ nameKey: key });
  if (existing) throw new ApiError(409, 'Department name already exists');
  const manager = await assertManager(payload.manager || null);
  const department = await Department.create({
    name: payload.name,
    nameKey: key,
    description: payload.description,
    manager,
    status: payload.status,
  });
  await writeAudit({
    actor,
    action: 'DEPARTMENT_CREATED',
    entity: 'Department',
    entityId: department._id,
    message: `Created department ${department.name}`,
  });
  const populated = await Department.findById(department._id).populate('manager', 'fullName employeeId');
  return shapeDepartment(populated, await countsByDepartment());
}

export async function updateDepartment(id, payload, actor) {
  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, 'Department not found');
  const key = nameKey(payload.name);
  const duplicate = await Department.findOne({ nameKey: key, _id: { $ne: id } });
  if (duplicate) throw new ApiError(409, 'Department name already exists');
  department.name = payload.name;
  department.nameKey = key;
  department.description = payload.description;
  department.status = payload.status;
  department.manager = await assertManager(payload.manager || null);
  await department.save();
  await writeAudit({
    actor,
    action: 'DEPARTMENT_UPDATED',
    entity: 'Department',
    entityId: department._id,
    message: `Updated department ${department.name}`,
  });
  const populated = await Department.findById(department._id).populate('manager', 'fullName employeeId');
  return shapeDepartment(populated, await countsByDepartment());
}

export async function deleteDepartment(id, actor) {
  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, 'Department not found');
  const assigned = await Employee.countDocuments({ department: department._id });
  if (assigned > 0) {
    throw new ApiError(409, 'Reassign employees before deleting this department');
  }
  await department.deleteOne();
  await writeAudit({
    actor,
    action: 'DEPARTMENT_DELETED',
    entity: 'Department',
    entityId: department._id,
    message: `Deleted department ${department.name}`,
  });
}
