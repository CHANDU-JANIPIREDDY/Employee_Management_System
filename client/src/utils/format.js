export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id || value._id || '';
}

const STATUS_LABELS = {
  on_leave: 'On Leave',
  half_day: 'Half Day',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export function statusLabel(value) {
  if (!value) return '—';
  return STATUS_LABELS[value] || String(value).replaceAll('_', ' ');
}

export function parseDateKey(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? parseDateKey(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatHours(hours) {
  const totalMinutes = Math.max(0, Math.round((Number(hours) || 0) * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}h ${minutes}m`;
}

export function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

const AVATAR_COLORS = ['#4f46e5', '#0f766e', '#b45309', '#be123c', '#1d4ed8', '#6d28d9'];

export function colorFromName(name) {
  let hash = 0;
  for (const char of String(name || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = String(name || 'there').split(' ')[0];
  return `${part}, ${first}`;
}

export function shortDate(value) {
  const date = parseDateKey(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(date);
}

export function monthLabel(month) {
  const date = parseDateKey(`${month}-01`);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}

export function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getErrorMessage(error) {
  const message = error?.response?.data?.message;
  if (message) return message;
  if (error?.message === 'Network Error') return 'Unable to reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export function applyApiErrors(error, setError) {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors)) return;
  errors.forEach((item) => {
    if (item.field) setError(item.field, { message: item.message });
  });
}
