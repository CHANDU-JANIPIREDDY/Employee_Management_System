import { formatHours, statusLabel } from '../../utils/format';
import { Button } from '../common/Button';

export function AttendanceActions({ today, loading, onCheckIn, onCheckOut }) {
  const checkedIn = Boolean(today?.checkIn);
  const checkedOut = Boolean(today?.checkOut);
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">Today</p>
      <p className="mt-2 text-lg font-semibold text-slate-900" data-testid="attendance-status">
        {today ? statusLabel(today.status) : 'Not checked in'}
      </p>
      <p className="mt-1 text-sm text-slate-500">Working hours <span data-testid="working-hours">{formatHours(today?.workingHours || 0)}</span></p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button data-testid="check-in" disabled={checkedIn || loading} loading={loading} onClick={onCheckIn}>Check in</Button>
        <Button data-testid="check-out" variant="secondary" disabled={!checkedIn || checkedOut || loading} onClick={onCheckOut}>Check out</Button>
      </div>
    </div>
  );
}
