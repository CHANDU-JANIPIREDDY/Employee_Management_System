import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { departmentService, employeeService } from '../services';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { formatDate, getErrorMessage, statusLabel } from '../utils/format';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  function load() {
    employeeService.get(id).then((body) => {
      setEmployee(body.data);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    load();
    departmentService.list().then((body) => setDepartments(body.data || [])).catch(() => {});
  }, [id]);

  async function save(values) {
    setSaving(true);
    try {
      const { password: _password, confirmPassword: _confirm, ...rest } = values;
      await employeeService.update(id, { ...rest, profileImage: rest.profileImage || '' });
      toast.success('Employee updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    setSaving(true);
    try {
      await employeeService.remove(id);
      toast.success('Employee deactivated');
      setConfirm(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (error && !employee) return <ErrorBanner message={error} onRetry={load} />;
  if (!employee) return <p className="text-sm text-slate-500">Loading employee…</p>;

  const balance = employee.leaveBalance;
  return (
    <div>
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeId} · ${employee.designation}`}
        actions={(
          <>
            <Button variant="secondary" onClick={() => navigate('/employees')}>Back</Button>
            <Button data-testid="edit-employee" onClick={() => setEditing(true)}>Edit</Button>
            {employee.employmentStatus !== 'inactive' ? <Button variant="danger" onClick={() => setConfirm(true)}>Deactivate</Button> : null}
          </>
        )}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <Avatar name={employee.fullName} src={employee.profileImage} size="lg" />
            <div>
              <Badge status={employee.employmentStatus} />
              <p className="mt-2 text-sm text-slate-500">{employee.department?.name}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <Info label="Email" value={employee.email} />
            <Info label="Phone" value={employee.phone} />
            <Info label="Gender" value={statusLabel(employee.gender)} />
            <Info label="Date of birth" value={formatDate(employee.dateOfBirth)} />
            <Info label="Joined" value={formatDate(employee.joiningDate)} />
            <Info label="Address" value={employee.address} />
          </dl>
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Work and leave</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Present this month" value={employee.attendanceSummary?.present ?? 0} />
            <Stat label="Late this month" value={employee.attendanceSummary?.late ?? 0} />
            <Stat label="Hours this month" value={employee.attendanceSummary?.workingHours ?? 0} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {balance ? Object.entries(balance).map(([key, item]) => (
              <div key={key} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{statusLabel(key)}</p>
                <p className="mt-1 text-lg font-semibold">{item.remaining} left</p>
                <p className="text-xs text-slate-400">{item.used} used of {item.total}</p>
              </div>
            )) : null}
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700">Emergency contact</h3>
            <p className="mt-1 text-sm text-slate-600">{employee.emergencyContact?.name} · {employee.emergencyContact?.relationship} · {employee.emergencyContact?.phone}</p>
          </div>
          <Link className="mt-6 inline-flex text-sm font-medium text-indigo-600" to="/attendance">View attendance</Link>
        </section>
      </div>
      <Modal open={editing} title="Edit employee" onClose={() => setEditing(false)} size="lg">
        <EmployeeForm mode="edit" employee={employee} departments={departments} saving={saving} onCancel={() => setEditing(false)} onSubmit={save} />
      </Modal>
      <ConfirmDialog open={confirm} title="Deactivate employee" message="Their sign-in will stop working." confirmLabel="Deactivate" danger loading={saving} onConfirm={deactivate} onClose={() => setConfirm(false)} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-800">{value || '—'}</dd>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold" data-testid={`detail-${label}`}>{value}</p>
    </div>
  );
}
