import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { profileService } from '../services';
import { adminProfileSchema, profileSchema } from '../validations/schemas';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Input, Select, Textarea } from '../components/common/Fields';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { formatDate, getErrorMessage, statusLabel } from '../utils/format';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const form = useForm({ resolver: zodResolver(isAdmin ? adminProfileSchema : profileSchema) });

  function load() {
    profileService.get().then((body) => {
      setProfile(body.data);
      const employee = body.data.employee;
      if (isAdmin) form.reset({ name: body.data.user.name });
      else if (employee) {
        form.reset({
          fullName: employee.fullName,
          phone: employee.phone,
          gender: employee.gender,
          dateOfBirth: employee.dateOfBirth,
          profileImage: employee.profileImage || '',
          address: employee.address,
          emergencyContact: employee.emergencyContact,
        });
      }
      setError('');
    }).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => { load(); }, []);

  async function save(values) {
    setSaving(true);
    try {
      const body = await profileService.update(values);
      setProfile(body.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const employee = profile?.employee;
  return (
    <div>
      <PageHeader title="Profile" description="Personal details and a summary of attendance and leave." />
      <ErrorBanner message={error} onRetry={load} />
      {isAdmin ? (
        <form className="card max-w-xl space-y-4 p-5" onSubmit={form.handleSubmit(save)}>
          <Input label="Name" required error={form.formState.errors.name?.message} {...form.register('name')} />
          <p className="text-sm text-slate-500">{user?.email}</p>
          <Button type="submit" loading={saving}>Save profile</Button>
        </form>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={employee?.fullName || user?.name} src={employee?.profileImage} size="lg" />
              <div>
                <p className="font-semibold text-slate-900">{employee?.fullName}</p>
                <p className="text-sm text-slate-500">{employee?.employeeId}</p>
                <div className="mt-2"><Badge status={employee?.employmentStatus} /></div>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm text-slate-600">
              <p>Department · {employee?.department?.name || '—'}</p>
              <p>Designation · {employee?.designation || '—'}</p>
              <p>Joined · {formatDate(employee?.joiningDate)}</p>
              <p>Email · {employee?.email}</p>
            </dl>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Mini label="Present" value={profile?.attendanceSummary?.present ?? 0} />
              <Mini label="Late" value={profile?.attendanceSummary?.late ?? 0} />
              <Mini label="Hours" value={profile?.attendanceSummary?.workingHours ?? 0} />
            </div>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              {profile?.leaveBalance ? Object.entries(profile.leaveBalance).map(([key, item]) => (
                <p key={key}>{statusLabel(key)} · {item.remaining} remaining</p>
              )) : null}
            </div>
          </section>
          <form className="card grid gap-4 p-5 md:grid-cols-2 lg:col-span-2" onSubmit={form.handleSubmit(save)}>
            <Input label="Full name" required error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
            <Input label="Phone" required error={form.formState.errors.phone?.message} data-testid="profile-phone" {...form.register('phone')} />
            <Select label="Gender" {...form.register('gender')}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Date of birth" type="date" {...form.register('dateOfBirth')} />
            <div className="md:col-span-2">
              <Input label="Profile image URL" error={form.formState.errors.profileImage?.message} {...form.register('profileImage')} />
            </div>
            <div className="md:col-span-2">
              <Textarea label="Address" error={form.formState.errors.address?.message} {...form.register('address')} />
            </div>
            <Input label="Emergency contact" {...form.register('emergencyContact.name')} />
            <Input label="Emergency phone" {...form.register('emergencyContact.phone')} />
            <Input label="Relationship" {...form.register('emergencyContact.relationship')} />
            <div className="md:col-span-2">
              <Button type="submit" loading={saving} data-testid="save-profile">Save profile</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
