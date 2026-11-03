import { describe, expect, it } from 'vitest';
import {
  deriveAttendanceStatus,
  inclusiveDays,
  minutesInTimeZone,
  workingHoursBetween,
  zonedTime,
} from '../utils/dates.js';

describe('attendance and leave policy', () => {
  it('counts inclusive leave days', () => {
    expect(inclusiveDays('2026-11-01', '2026-11-01')).toBe(1);
    expect(inclusiveDays('2026-11-01', '2026-11-03')).toBe(3);
    expect(inclusiveDays('2026-11-03', '2026-11-01')).toBeLessThan(1);
  });

  it('builds a UTC timestamp for a wall-clock time', () => {
    expect(zonedTime('2026-11-03', 9, 30, 'UTC').toISOString()).toBe('2026-11-03T09:30:00.000Z');
  });

  it('builds an Asia/Kolkata timestamp for a wall-clock time', () => {
    expect(zonedTime('2026-11-03', 9, 30, 'Asia/Kolkata').toISOString()).toBe('2026-11-03T04:00:00.000Z');
    expect(minutesInTimeZone('2026-11-03T04:00:00.000Z', 'Asia/Kolkata')).toBe(9 * 60 + 30);
  });

  it('marks attendance late after 09:30 and half day under 4 hours', () => {
    const onTime = new Date('2026-11-03T09:00:00.000Z');
    const late = new Date('2026-11-03T10:15:00.000Z');
    const midday = new Date('2026-11-03T12:00:00.000Z');
    const evening = new Date('2026-11-03T18:00:00.000Z');

    expect(deriveAttendanceStatus(onTime, null, 'UTC')).toBe('present');
    expect(deriveAttendanceStatus(late, null, 'UTC')).toBe('late');
    expect(deriveAttendanceStatus(onTime, midday, 'UTC')).toBe('half_day');
    expect(deriveAttendanceStatus(late, evening, 'UTC')).toBe('late');
    expect(workingHoursBetween(onTime, evening)).toBe(9);
  });
});
