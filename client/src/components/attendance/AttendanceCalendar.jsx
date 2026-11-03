import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, shiftMonth, statusLabel } from '../../utils/format';

function dateKeyOf(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function weekday(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const COLORS = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  late: 'bg-amber-50 text-amber-700 ring-amber-200',
  half_day: 'bg-sky-50 text-sky-700 ring-sky-200',
  absent: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function AttendanceCalendar({ month, records = [], joiningDate = '', today = '', onMonthChange }) {
  if (!month) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const pad = weekday(dateKeyOf(year, monthNumber, 1));
  const map = new Map(records.map((record) => [record.date, record]));
  const cells = [...Array(pad).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <button className="rounded-lg p-2 hover:bg-slate-100" aria-label="Previous month" onClick={() => onMonthChange(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-sm font-semibold text-slate-800">{monthLabel(month)}</p>
        <button className="rounded-lg p-2 hover:bg-slate-100" aria-label="Next month" onClick={() => onMonthChange(shiftMonth(month, 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (!day) return <span key={`pad-${index}`} />;
          const key = dateKeyOf(year, monthNumber, day);
          const record = map.get(key);
          const weekend = weekday(key) === 0 || weekday(key) === 6;
          let status = record?.status;
          if (!status && today && key < today && key >= joiningDate && !weekend) status = 'absent';
          return (
            <div key={key} className={`rounded-lg px-1 py-2 text-center text-xs ring-1 ring-inset ${status ? COLORS[status] || 'bg-slate-50 ring-slate-200' : 'bg-white text-slate-500 ring-slate-100'}`} title={status ? statusLabel(status) : ''}>
              <div className="font-medium">{day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
