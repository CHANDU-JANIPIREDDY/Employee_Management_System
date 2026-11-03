import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { departmentService, employeeService } from '../services';
import { useDebounce } from '../hooks/useDebounce';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Fields';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { TableSkeleton } from '../components/common/Skeleton';
import { EmployeeTable } from '../components/employees/EmployeeTable';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { getErrorMessage } from '../utils/format';

function payloadFrom(values, mode) {
  const payload = {
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    gender: values.gender,
    dateOfBirth: values.dateOfBirth,
    profileImage: values.profileImage || '',
    department: values.department,
    designation: values.designation,
    joiningDate: values.joiningDate,
    employmentStatus: values.employmentStatus,
    address: values.address,
    emergencyContact: values.emergencyContact,
  };
  if (mode === 'create') payload.password = values.password;
  return payload;
}

export function EmployeesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const debounced = useDebounce(searchInput, 300);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    departmentService.list().then((body) => setDepartments(body.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const current = params.get('search') || '';
    if (debounced === current) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set('search', debounced);
    else next.delete('search');
    next.set('page', '1');
    setParams(next);
  }, [debounced, params, setParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    employeeService.list({
      search: params.get('search') || undefined,
      department: params.get('department') || undefined,
      status: params.get('status') || undefined,
      designation: params.get('designation') || undefined,
      page: params.get('page') || 1,
      limit: 8,
      sortBy: params.get('sortBy') || 'fullName',
      sortOrder: params.get('sortOrder') || 'asc',
    }).then((body) => {
      if (!active) return;
      setRows(body.data || []);
      setPagination(body.pagination);
      setError('');
    }).catch((err) => {
      if (active) setError(getErrorMessage(err));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [params, reloadKey]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next);
  }

  async function refreshDepartments() {
    const body = await departmentService.list();
    setDepartments(body.data || []);
  }

  async function openEdit(row) {
    const [detail, departmentBody] = await Promise.all([employeeService.get(row.id), departmentService.list()]);
    setDepartments(departmentBody.data || []);
    setEditing(detail.data);
    setOpen(true);
  }

  async function save(values) {
    setSaving(true);
    try {
      const payload = payloadFrom(values, editing ? 'edit' : 'create');
      if (editing) await employeeService.update(editing.id, payload);
      else await employeeService.create(payload);
      toast.success(editing ? 'Employee updated' : 'Employee created');
      setOpen(false);
      setEditing(null);
      setReloadKey((value) => value + 1);
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
      await employeeService.remove(pending.id);
      toast.success('Employee deactivated');
      setPending(null);
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Search, filter, and maintain the employee directory."
        actions={<Button data-testid="add-employee" onClick={async () => { await refreshDepartments(); setEditing(null); setOpen(true); }}>Add employee</Button>}
      />
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4">
        <Input label="Search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, ID, or email" data-testid="employee-search" />
        <Select label="Department" value={params.get('department') || ''} onChange={(event) => updateParam('department', event.target.value)}>
          <option value="">All departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </Select>
        <Select label="Status" value={params.get('status') || ''} onChange={(event) => updateParam('status', event.target.value)} data-testid="status-filter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </Select>
        <div className="flex items-end gap-2">
          <Input label="Designation" value={params.get('designation') || ''} onChange={(event) => updateParam('designation', event.target.value)} />
          <Button variant="secondary" onClick={() => { setSearchInput(''); setParams(new URLSearchParams()); }} data-testid="reset-filters">Reset</Button>
        </div>
      </div>
      <ErrorBanner message={error} onRetry={() => setParams(new URLSearchParams(params))} />
      {loading ? <div className="card"><TableSkeleton /></div> : (
        <div className="card overflow-hidden">
          <EmployeeTable rows={rows} onView={(row) => navigate(`/employees/${row.id}`)} onEdit={openEdit} onDeactivate={setPending} />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={(page) => updateParam('page', String(page))} />
        </div>
      )}
      <Modal open={open} title={editing ? 'Edit employee' : 'Add employee'} description="Records are saved to the employee directory." onClose={() => setOpen(false)} size="lg">
        <EmployeeForm
          mode={editing ? 'edit' : 'create'}
          employee={editing}
          departments={departments}
          saving={saving}
          onCancel={() => setOpen(false)}
          onSubmit={save}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate employee"
        message={`Deactivate ${pending?.fullName || 'this employee'}? Their sign-in will stop working.`}
        confirmLabel="Deactivate"
        danger
        loading={saving}
        onConfirm={deactivate}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
