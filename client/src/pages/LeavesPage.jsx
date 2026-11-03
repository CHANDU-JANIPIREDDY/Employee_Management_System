import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { employeeService, leaveService } from '../services';
import { useAuth } from '../context/AuthContext';
import { leaveSchema } from '../validations/schemas';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input, Select, Textarea } from '../components/common/Fields';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { LeaveActions } from '../components/leaves/LeaveActions';
import { formatDate, getErrorMessage, statusLabel } from '../utils/format';
import { CalendarDays } from 'lucide-react';

export function LeavesPage() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminLeaves /> : <EmployeeLeaves />;
}

function BalanceCards({ balance }) {
  if (!balance) return null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {Object.entries(balance).map(([key, item]) => (
        <article key={key} className="card p-4" data-testid={`balance-${key}`}>
          <p className="text-sm text-slate-500">{statusLabel(key)}</p>
          <p className="mt-2 text-2xl font-semibold">{item.remaining}</p>
          <p className="text-xs text-slate-400">{item.used} used · {item.total} total</p>
        </article>
      ))}
    </div>
  );
}

function EmployeeLeaves() {
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveType: 'casual', startDate: '', endDate: '', reason: '' },
  });

  function load() {
    leaveService.mine({ limit: 20 }).then((body) => {
      setRows(body.data || []);
      setBalance(body.balance);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => { load(); }, []);

  async function submit(values) {
    setSaving(true);
    try {
      await leaveService.apply(values);
      toast.success('Leave request submitted');
      setOpen(false);
      form.reset();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(leave) {
    try {
      await leaveService.cancel(leave.id);
      toast.success('Leave request cancelled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Leave" description="Apply for leave and track your balance." actions={<Button data-testid="apply-leave" onClick={() => setOpen(true)}>Apply for leave</Button>} />
      <ErrorBanner message={error} onRetry={load} />
      <BalanceCards balance={balance} />
      <LeaveTable rows={rows} role="EMPLOYEE" onCancel={cancel} />
      <Modal open={open} title="Apply for leave" onClose={() => setOpen(false)} footer={null}>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <Select label="Leave type" required error={form.formState.errors.leaveType?.message} data-testid="leave-type" {...form.register('leaveType')}>
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="earned">Earned Leave</option>
          </Select>
          <Input label="Start date" type="date" required error={form.formState.errors.startDate?.message} data-testid="leave-start" {...form.register('startDate')} />
          <Input label="End date" type="date" required error={form.formState.errors.endDate?.message} data-testid="leave-end" {...form.register('endDate')} />
          <Textarea label="Reason" required error={form.formState.errors.reason?.message} data-testid="leave-reason" {...form.register('reason')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} data-testid="submit-leave">Submit request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AdminLeaves() {
  const [filters, setFilters] = useState({ employee: '', leaveType: '', status: '', from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [mode, setMode] = useState('approve');
  const [saving, setSaving] = useState(false);

  function load(next = filters) {
    const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value));
    leaveService.list({ ...params, limit: 50 }).then((body) => {
      setRows(body.data || []);
      setSummary(body.summary);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    employeeService.list({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }).then((body) => setEmployees(body.data || [])).catch(() => {});
    load();
  }, []);

  async function submitDecision() {
    if (!active) return;
    setSaving(true);
    try {
      if (mode === 'approve') await leaveService.approve(active.id, { remarks });
      else await leaveService.reject(active.id, { remarks });
      toast.success(mode === 'approve' ? 'Leave approved' : 'Leave rejected');
      setActive(null);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Leave management" description="Review requests, then approve or reject them with a note." />
      <ErrorBanner message={error} onRetry={() => load()} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {['pending', 'approved', 'rejected', 'cancelled'].map((status) => (
          <article key={status} className="card p-4">
            <p className="text-sm text-slate-500">{statusLabel(status)}</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.[status] ?? '—'}</p>
          </article>
        ))}
      </div>
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-5">
        <Select label="Employee" value={filters.employee} onChange={(event) => setFilters({ ...filters, employee: event.target.value })}>
          <option value="">All employees</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
        </Select>
        <Select label="Type" value={filters.leaveType} onChange={(event) => setFilters({ ...filters, leaveType: event.target.value })}>
          <option value="">All types</option>
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="earned">Earned</option>
        </Select>
        <Select label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Input label="From" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <div className="flex items-end gap-2">
          <Input label="To" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          <Button onClick={() => load(filters)}>Apply</Button>
        </div>
      </div>
      <LeaveTable
        rows={rows}
        role="ADMIN"
        onApprove={(leave) => { setMode('approve'); setRemarks(''); setActive(leave); }}
        onReject={(leave) => { setMode('reject'); setRemarks(''); setActive(leave); }}
      />
      <Modal
        open={Boolean(active)}
        title={mode === 'approve' ? 'Approve leave' : 'Reject leave'}
        onClose={() => setActive(null)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button>
            <Button loading={saving} data-testid="confirm-leave" onClick={submitDecision}>{mode === 'approve' ? 'Approve' : 'Reject'}</Button>
          </>
        )}
      >
        <Textarea label={mode === 'approve' ? 'Remarks' : 'Remarks'} required={mode === 'reject'} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
      </Modal>
    </div>
  );
}

function LeaveTable({ rows, role, onApprove, onReject, onCancel }) {
  if (!rows.length) return <div className="card"><EmptyState icon={CalendarDays} title="No leave requests" message="Requests show up here after someone applies." /></div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {role === 'ADMIN' ? <th>Employee</th> : null}
            <th>Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Status</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((leave) => (
            <tr key={leave.id}>
              {role === 'ADMIN' ? <td>{leave.employee?.fullName}<div className="text-xs text-slate-400">{leave.employee?.employeeId}</div></td> : null}
              <td>{statusLabel(leave.leaveType)}</td>
              <td>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</td>
              <td>{leave.days}</td>
              <td><Badge status={leave.status} /></td>
              <td className="max-w-xs truncate">{leave.reason}</td>
              <td><LeaveActions leave={leave} role={role} onApprove={onApprove} onReject={onReject} onCancel={onCancel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
