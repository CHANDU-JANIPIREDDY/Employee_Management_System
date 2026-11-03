import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarPlus, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, attendanceService } from '../services';
import { PageHeader } from '../components/common/PageHeader';
import { KpiGrid } from '../components/common/KpiCard';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { AttendanceActions } from '../components/attendance/AttendanceActions';
import { formatDate, getErrorMessage, greeting, shortDate, statusLabel } from '../utils/format';
import { toast } from 'sonner';

const PIE_COLORS = ['#4f46e5', '#94a3b8', '#0ea5e9', '#f43f5e'];

function ChartCard({ title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-800">{title}</h2>
      <div className="h-72">{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard name={user.name} />;
  return <EmployeeDashboard name={user?.name} />;
}

function AdminDashboard({ name }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    dashboardService.admin().then((body) => {
      setData(body.data);
      setError('');
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const items = [
    { id: 'kpi-total-employees', label: 'Total employees', value: data?.totalEmployees ?? '—', icon: Users },
    { id: 'kpi-active-employees', label: 'Active employees', value: data?.activeEmployees ?? '—', icon: Users },
    { id: 'kpi-present-today', label: 'Present today', value: data?.presentToday ?? '—', hint: 'Checked in', icon: Users },
    { id: 'kpi-absent-today', label: 'Absent today', value: data?.absentToday ?? '—', icon: Users },
    { id: 'kpi-on-leave', label: 'Employees on leave', value: data?.onLeave ?? '—', icon: Users },
    { id: 'kpi-pending-leaves', label: 'Pending leave requests', value: data?.pendingLeaves ?? '—', icon: Users },
  ];

  return (
    <div>
      <PageHeader
        title={greeting(name)}
        description="Organization snapshot from live employee, attendance, and leave records."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <ErrorBanner message={error} onRetry={load} />
      {loading && !data ? <p className="text-sm text-slate-500">Loading dashboard…</p> : null}
      <KpiGrid items={items} />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Attendance trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(data?.attendanceTrend || []).map((row) => ({ ...row, label: shortDate(row.date) }))}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="present" name="Present" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
              <Area type="monotone" dataKey="late" name="Late" stroke="#d97706" fill="#fef3c7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Department distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.departmentDistribution || []}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="Employees" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly attendance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthlyAttendance || []}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="present" stackId="a" fill="#4f46e5" />
              <Bar dataKey="late" stackId="a" fill="#f59e0b" />
              <Bar dataKey="halfDay" stackId="a" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Employment status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data?.statusDistribution || []} dataKey="count" nameKey="status" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {(data?.statusDistribution || []).map((entry, index) => <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value, _name, item) => [value, statusLabel(item?.payload?.status)]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link className="btn btn-secondary justify-start" to="/employees"><UserPlus className="h-4 w-4" /> Add employee</Link>
            <Link className="btn btn-secondary justify-start" to="/leaves"><CalendarPlus className="h-4 w-4" /> Review leave</Link>
            <Link className="btn btn-secondary justify-start" to="/attendance">View attendance</Link>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Recent employees</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(data?.recentEmployees || []).map((employee) => (
              <Link key={employee.id} to={`/employees/${employee.id}`} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="block font-medium text-slate-800">{employee.fullName}</span>
                  <span className="text-xs text-slate-400">{employee.employeeId}</span>
                </span>
                <span className="text-xs text-slate-500">{employee.department?.name}</span>
              </Link>
            ))}
            {!data?.recentEmployees?.length ? <p className="py-6 text-sm text-slate-500">No employees yet.</p> : null}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Pending leave</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(data?.pendingLeaveRequests || []).map((leave) => (
              <div key={leave.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{leave.employee?.fullName}</p>
                  <p className="text-xs text-slate-400">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</p>
                </div>
                <Badge status={leave.status} />
              </div>
            ))}
            {!data?.pendingLeaveRequests?.length ? <p className="py-6 text-sm text-slate-500">No pending requests.</p> : null}
          </div>
        </section>
      </div>
      <section className="card mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {(data?.recentActivity || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 text-sm">
              <p className="text-slate-700">{item.message}</p>
              <p className="text-xs text-slate-400">{formatDate(item.createdAt)}</p>
            </div>
          ))}
          {!data?.recentActivity?.length ? <p className="py-6 text-sm text-slate-500">Activity will appear as people use the system.</p> : null}
        </div>
      </section>
    </div>
  );
}

function EmployeeDashboard({ name }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  function load() {
    dashboardService.employee().then((body) => {
      setData(body.data);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => { load(); }, []);

  async function punch(action) {
    setActing(true);
    try {
      await action();
      toast.success('Attendance updated');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  }

  const balance = data?.leaveBalance;
  return (
    <div>
      <PageHeader title={greeting(name)} description="Your attendance, leave balance, and recent requests." />
      <ErrorBanner message={error} onRetry={load} />
      <div className="grid gap-4 lg:grid-cols-3">
        <AttendanceActions
          today={data?.todayAttendance}
          loading={acting}
          onCheckIn={() => punch(attendanceService.checkIn)}
          onCheckOut={() => punch(attendanceService.checkOut)}
        />
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">This month</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Present" value={data?.attendanceSummary?.present ?? '—'} />
            <Metric label="Late" value={data?.attendanceSummary?.late ?? '—'} />
            <Metric label="Half day" value={data?.attendanceSummary?.halfDay ?? '—'} />
          </div>
          <div className="mt-6 space-y-3">
            {balance ? Object.entries(balance).map(([key, item]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{statusLabel(key)}</span>
                  <span>{item.remaining} of {item.total} left</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${item.total ? (item.remaining / item.total) * 100 : 0}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">Leave balance will appear after your profile is ready.</p>}
          </div>
          <Link className="btn btn-primary mt-5" to="/leaves"><CalendarPlus className="h-4 w-4" /> Apply for leave</Link>
        </section>
      </div>
      <section className="card mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-800">Recent leave requests</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {(data?.recentLeaves || []).map((leave) => (
            <div key={leave.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{statusLabel(leave.leaveType)}</p>
                <p className="text-xs text-slate-400">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</p>
              </div>
              <Badge status={leave.status} />
            </div>
          ))}
          {!data?.recentLeaves?.length ? <p className="py-6 text-sm text-slate-500">You have not applied for leave yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
