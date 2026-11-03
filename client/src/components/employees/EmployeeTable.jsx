import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Menu, MenuItem } from '../common/Menu';
import { formatDate } from '../../utils/format';
import { Users } from 'lucide-react';

export function EmployeeTable({ rows, onView, onEdit, onDeactivate }) {
  if (!rows.length) {
    return <EmptyState icon={Users} title="No employees found" message="Try a different search or add a new employee." />;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Joined</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((employee) => (
            <tr key={employee.id} data-testid="employee-row">
              <td>
                <div className="flex items-center gap-3">
                  <Avatar name={employee.fullName} src={employee.profileImage} size="sm" />
                  <div>
                    <p className="font-medium text-slate-900">{employee.fullName}</p>
                    <p className="text-xs text-slate-400">{employee.employeeId} · {employee.email}</p>
                  </div>
                </div>
              </td>
              <td>{employee.department?.name || '—'}</td>
              <td>{employee.designation}</td>
              <td><Badge status={employee.employmentStatus} /></td>
              <td>{formatDate(employee.joiningDate)}</td>
              <td className="text-right">
                <Menu>
                  <MenuItem onClick={() => onView(employee)}>View</MenuItem>
                  <MenuItem onClick={() => onEdit(employee)}>Edit</MenuItem>
                  {employee.employmentStatus !== 'inactive' ? <MenuItem danger onClick={() => onDeactivate(employee)}>Deactivate</MenuItem> : null}
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
