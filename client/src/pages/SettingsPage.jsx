import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { profileService } from '../services';
import { changePasswordSchema } from '../validations/schemas';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Input } from '../components/common/Fields';
import { Button } from '../components/common/Button';
import { getErrorMessage } from '../utils/format';

export function SettingsPage() {
  const { user, changePassword } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  useEffect(() => {
    profileService.settings().then((body) => setPolicy(body.data)).catch(() => {});
  }, []);

  async function save(values) {
    setSaving(true);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Password updated');
      form.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Account security and the attendance policy used by the system." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Account</h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Name · {user?.name}</p>
            <p>Email · {user?.email}</p>
            <p>Role · {user?.role === 'ADMIN' ? 'Admin' : 'Employee'}</p>
          </dl>
          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(save)}>
            <Input label="Current password" type="password" error={form.formState.errors.currentPassword?.message} {...form.register('currentPassword')} />
            <Input label="New password" type="password" error={form.formState.errors.newPassword?.message} {...form.register('newPassword')} />
            <Input label="Confirm new password" type="password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
            <Button type="submit" loading={saving} data-testid="save-password">Update password</Button>
          </form>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800">Workplace policy</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Office start · {policy?.officeStart || '09:30'}</p>
            <p>Late after the office start time. A day under {policy?.halfDayHours || 4} hours is a half day.</p>
            <p>Casual leave · {policy?.leaveQuotas?.casual ?? 12} days</p>
            <p>Sick leave · {policy?.leaveQuotas?.sick ?? 10} days</p>
            <p>Earned leave · {policy?.leaveQuotas?.earned ?? 15} days</p>
            <p>Timezone · {policy?.timezone || 'UTC'}</p>
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-400">Leave is deducted only when an admin approves a request. Pending, rejected, and cancelled requests do not change the balance.</p>
        </section>
      </div>
    </div>
  );
}
