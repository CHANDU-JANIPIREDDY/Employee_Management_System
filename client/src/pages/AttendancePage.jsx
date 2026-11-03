import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { attendanceService, employeeService } from '../services';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Fields';
import { Badge } from '../components/common/Badge';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { KpiCard } from '../components/common/KpiCard';
import { AttendanceActions } from '../components/attendance/AttendanceActions';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { formatDateTime, formatHours, getErrorMessage } from '../utils/format';
import { Clock3 } from 'lucide-react';

export function AttendancePage() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminAttendance /> : <EmployeeAttendance />;
}

function EmployeeAttendance() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  function load(nextMonth = month) {
    const id = requestId.current + 1;
    requestId.current = id;
    return attendanceService.mine(nextMonth ? { month: nextMonth } : {}).then((body) => {
      if (id !== requestId.current) return;
      setData(body.data);
      setMonth(body.data.month);
      setError('');
    }).catch((err) => {
      if (id === requestId.current) setError(getErrorMessage(err));
    });
  }

  useEffect(() => { load(''); }, []);

  async function punch(action, message) {
    setActing(true);
    try {
      await action();
      toast.success(message);
      load(month);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" description="Check in and review your monthly record." />
      <ErrorBanner message={error} onRetry={() => load(month)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AttendanceActions
          today={data?.today}
          loading={acting}
          onCheckIn={() => punch(attendanceService.checkIn, 'Checked in')}
          onCheckOut={() => punch(attendanceService.checkOut, 'Checked out')}
        />
        <AttendanceCalendar
          month={data?.month}
          records={data?.records || []}
          joiningDate=""
          today={data?.today?.date || ''}
          onMonthChange={(next) => { setMonth(next); load(next); }}
        />
      </div>
      <section className="card mt-4 overflow-hidden">
        <History records={data?.records || []} />
      </section>
    </div>
  );
}

function AdminAttendance() {
  const [filters, setFilters] = useState({ from: '', to: '', employee: '', status: '' });
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  function load(next = filters, statsDate = date) {
    const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value));
    Promise.all([
      attendanceService.list({ ...params, limit: 50 }),
      attendanceService.stats(statsDate ? { date: statsDate } : {}),
    ]).then(([list, summary]) => {
      setRows(list.data || []);
      setStats(summary.data);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    employeeService.list({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }).then((body) => setEmployees(body.data || [])).catch(() => {});
    load();
  }, []);

  async function exportCsv() {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const csv = await attendanceService.exportCsv(params);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'attendance.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" description="Review daily attendance across the organization." actions={<Button variant="secondary" onClick={exportCsv} data-testid="export-attendance">Export CSV</Button>} />
      <ErrorBanner message={error} onRetry={() => load()} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard id="stat-present" label="Present" value={stats?.present ?? '—'} />
        <KpiCard id="stat-late" label="Late" value={stats?.late ?? '—'} />
        <KpiCard id="stat-absent" label="Absent" value={stats?.absent ?? '—'} />
        <KpiCard id="stat-percentage" label="Attendance %" value={stats ? `${stats.percentage}%` : '—'} />
      </div>
      <div className="card mt-4 grid gap-3 p-4 md:grid-cols-5">
        <Input label="From" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <Input label="To" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <Select label="Employee" value={filters.employee} onChange={(event) => setFilters({ ...filters, employee: event.target.value })}>
          <option value="">All employees</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
        </Select>
        <Select label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="half_day">Half Day</option>
        </Select>
        <div className="flex items-end gap-2">
          <Button onClick={() => load(filters, date)}>Apply</Button>
          <Input label="Stats date" type="date" value={date} onChange={(event) => { setDate(event.target.value); load(filters, event.target.value); }} />
        </div>
      </div>
      <section className="card mt-4 overflow-hidden">
        <History records={rows} showEmployee />
      </section>
    </div>
  );
}

function History({ records, showEmployee = false }) {
  if (!records.length) return <EmptyState icon={Clock3} title="No attendance records" message="Records appear after employees check in." />;
  return (
    <div className="table-wrap rounded-none border-0 shadow-none">
      <table className="data-table">
        <thead>
          <tr>
            {showEmployee ? <th>Employee</th> : null}
            <th>Date</th>
            <th>Check in</th>
            <th>Check out</th>
            <th>Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              {showEmployee ? <td>{record.employee?.fullName}<div className="text-xs text-slate-400">{record.employee?.employeeId}</div></td> : null}
              <td>{record.date}</td>
              <td>{formatDateTime(record.checkIn)}</td>
              <td>{record.checkOut ? formatDateTime(record.checkOut) : '—'}</td>
              <td>{formatHours(record.workingHours)}</td>
              <td><Badge status={record.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
