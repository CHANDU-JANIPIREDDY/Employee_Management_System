import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Timer } from 'lucide-react';
import { loginSchema } from '../validations/schemas';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Fields';
import { Button } from '../components/common/Button';
import { getErrorMessage } from '../utils/format';

const FEATURES = [
  { icon: Building2, title: 'Organization records', text: 'Employees, departments, and profiles in one directory.' },
  { icon: Timer, title: 'Attendance that follows the rules', text: 'One check-in per day, with working hours calculated on the server.' },
  { icon: ShieldCheck, title: 'Role-based leave approvals', text: 'Employees request leave. Admins approve it against real balances.' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values) {
    setFormError('');
    try {
      await login(values);
      navigate('/');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-navy-950 px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500 font-semibold">S</div>
          <div>
            <p className="font-semibold">Smart HR</p>
            <p className="text-sm text-slate-400">Employee management</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">A calm workspace for people operations.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Track employees, attendance, and leave without leaving the record of what actually happened.</p>
          <div className="mt-10 space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-indigo-200"><Icon className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{feature.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-slate-500">Secure sign-in with hashed passwords and expiring sessions.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 font-semibold text-white">S</div>
            <p className="text-lg font-semibold">Smart HR</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your work email to continue.</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{formError}</p> : null}
            <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} data-testid="login-email" {...register('email')} />
            <Input label="Password" type="password" autoComplete="current-password" required error={errors.password?.message} data-testid="login-password" {...register('password')} />
            <Button className="w-full" type="submit" loading={isSubmitting} data-testid="login-submit">Sign in</Button>
          </form>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Demo accounts</p>
            <p className="mt-2">Admin · admin@smartsystem.com · Admin@123</p>
            <p>Employee · employee@smartsystem.com · Employee@123</p>
          </div>
        </div>
      </section>
    </div>
  );
}
