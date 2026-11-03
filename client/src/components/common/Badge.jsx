import { cn, statusLabel } from '../../utils/format';

const TONES = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  late: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  half_day: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  on_leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  absent: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  terminated: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};

export function Badge({ status, children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', TONES[status] || TONES.neutral)}>
      {children || statusLabel(status)}
    </span>
  );
}
