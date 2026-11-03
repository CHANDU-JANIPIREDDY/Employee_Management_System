import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { departmentService, employeeService } from '../services';
import { departmentSchema } from '../validations/schemas';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input, Select, Textarea } from '../components/common/Fields';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { getErrorMessage } from '../utils/format';
import { Building2 } from 'lucide-react';

export function DepartmentsPage() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const form = useForm({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', description: '', manager: '', status: 'active' },
  });

  function load() {
    departmentService.list().then((body) => {
      setRows(body.data || []);
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    load();
    employeeService.list({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }).then((body) => setEmployees(body.data || [])).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', description: '', manager: '', status: 'active' });
    setOpen(true);
  }

  function openEdit(department) {
    setEditing(department);
    form.reset({
      name: department.name,
      description: department.description,
      manager: department.manager?.id || '',
      status: department.status,
    });
    setOpen(true);
  }

  async function save(values) {
    setSaving(true);
    try {
      const payload = { ...values, manager: values.manager || null };
      if (editing) await departmentService.update(editing.id, payload);
      else await departmentService.create(payload);
      toast.success(editing ? 'Department updated' : 'Department created');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await departmentService.remove(pending.id);
      toast.success('Department deleted');
      setPending(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Departments" description="Organize teams and assign a manager." actions={<Button data-testid="add-department" onClick={openCreate}>Add department</Button>} />
      <ErrorBanner message={error} onRetry={load} />
      {rows.length === 0 ? <div className="card"><EmptyState icon={Building2} title="No departments yet" message="Create the first department to start adding employees." /></div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Manager</th>
                <th>Employees</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((department) => (
                <tr key={department.id}>
                  <td className="font-medium text-slate-900">{department.name}</td>
                  <td className="max-w-sm">{department.description}</td>
                  <td>{department.manager?.fullName || '—'}</td>
                  <td>{department.employeeCount}</td>
                  <td><Badge status={department.status} /></td>
                  <td className="space-x-2 text-right">
                    <Button variant="ghost" onClick={() => openEdit(department)}>Edit</Button>
                    <Button variant="ghost" onClick={() => setPending(department)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={open} title={editing ? 'Edit department' : 'Add department'} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={form.handleSubmit(save)}>
          <Input label="Name" required error={form.formState.errors.name?.message} data-testid="department-name" {...form.register('name')} />
          <Textarea label="Description" required error={form.formState.errors.description?.message} data-testid="department-description" {...form.register('description')} />
          <Select label="Manager" {...form.register('manager')}>
            <option value="">No manager</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </Select>
          <Select label="Status" {...form.register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} data-testid="department-save">Save department</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(pending)} title="Delete department" message="This is only allowed when no employees are still assigned to it." confirmLabel="Delete" danger loading={saving} onConfirm={remove} onClose={() => setPending(null)} />
    </div>
  );
}
