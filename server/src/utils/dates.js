import { env } from '../config/env.js';
import { HALF_DAY_HOURS, OFFICE_START_MINUTES } from './constants.js';

export function dateKey(date = new Date(), timeZone = env.APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function addDays(dateKeyValue, days) {
  const [year, month, day] = dateKeyValue.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function inclusiveDays(startKey, endKey) {
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const end = Date.parse(`${endKey}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

export function isWeekend(dateKeyValue) {
  const [year, month, day] = dateKeyValue.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function currentMonth(date = new Date()) {
  return dateKey(date).slice(0, 7);
}

export function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(last).padStart(2, '0')}`,
  };
}

export function lastDateKeys(count, from = dateKey()) {
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(addDays(from, -offset));
  }
  return keys;
}

export function lastMonths(count, from = dateKey()) {
  const [year, month] = from.slice(0, 7).split('-').map(Number);
  const months = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function minutesInTimeZone(date, timeZone = env.APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(date));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

export function workingHoursBetween(start, end) {
  const milliseconds = new Date(end) - new Date(start);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 0;
  return Math.round((milliseconds / 36e5) * 100) / 100;
}

export function deriveAttendanceStatus(checkIn, checkOut, timeZone = env.APP_TIMEZONE) {
  if (!checkIn) return 'absent';
  if (checkOut && workingHoursBetween(checkIn, checkOut) < HALF_DAY_HOURS) return 'half_day';
  if (minutesInTimeZone(checkIn, timeZone) > OFFICE_START_MINUTES) return 'late';
  return 'present';
}

export function zonedTime(dateKeyValue, hours, minutes, timeZone = env.APP_TIMEZONE) {
  const [year, month, day] = dateKeyValue.split('-').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const wallClockAsUtc = (date) => {
    const map = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
    return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  };

  let guess = desiredUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = wallClockAsUtc(new Date(guess)) - guess;
    guess = desiredUtc - offset;
  }
  return new Date(guess);
}
