import { Employee } from '../models/Employee.js';
import { Counter } from '../models/Counter.js';
import { ApiError } from '../utils/ApiError.js';

export async function nextEmployeeId(session) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'employee' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true, ...(session ? { session } : {}) },
    );
    const employeeId = `EMP-${String(counter.seq).padStart(4, '0')}`;
    const query = Employee.exists({ employeeId });
    if (session) query.session(session);
    const exists = await query;
    if (!exists) return employeeId;
  }
  throw new ApiError(500, 'Could not generate an employee ID');
}
