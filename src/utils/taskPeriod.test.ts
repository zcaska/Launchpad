import assert from 'node:assert/strict';
import type { QuickNote } from '../types';
import {
  getTaskPeriod,
  tasksInPeriod,
  tasksDueToday,
  formatPeriodMinutes,
  defaultPeriodRange,
  localToday,
  parseLocalDate,
  isValidLocalDate,
  localDate,
  addMonthsInclusive,
} from './taskPeriod';
import { calculateBuffer } from './timeBudget';

// Fixed negative-offset timezone so date parsing is deterministic regardless of the host TZ.
process.env.TZ = 'America/New_York';

const now = new Date(2026, 10, 10, 12, 0); // Tuesday, local time
const schedule = { startHour: 9, endHour: 17 };
const task = (id: string, deadline?: string, isDone = false): QuickNote => ({
  id, deadline, isDone, text: id, createdAt: now.getTime(), durationMinutes: 60,
});
const notes = [task('overdue', '2026-11-01'), task('old-done', '2026-11-01', true),
  task('today', '2026-11-10'), task('time-only', '16:00'), task('tomorrow', '2026-11-11 10:00'),
  task('sunday', '2026-11-15'), task('next-week', '2026-11-16'),
  task('last-day', '2026-11-30'), task('next-month', '2026-12-01'), task('undated'), task('invalid', 'someday')];
const ids = (period: Parameters<typeof getTaskPeriod>[0]) => tasksInPeriod(notes, period, now, getTaskPeriod(period, now, schedule)).map(n => n.id);

// Strict date-scoped filtering: no carry-forward of overdue outside the range, no undated.
assert.deepEqual(ids('Today'), ['today', 'time-only']);
assert.deepEqual(ids('Weekly'), ['today', 'time-only', 'tomorrow', 'sunday']);
assert.deepEqual(ids('Monthly'), ['overdue', 'old-done', 'today', 'time-only', 'tomorrow', 'sunday', 'next-week', 'last-day']);
assert.deepEqual(ids('Undated'), ['undated', 'invalid']);
assert.equal(ids('All time').length, notes.length);

// tasksDueToday: only valid deadlines inside actual local today, incl. time-only; exclude undated/invalid/yesterday/tomorrow regardless of completion.
assert.deepEqual(tasksDueToday(notes, now).map(n => n.id), ['today', 'time-only']);
assert.deepEqual(tasksDueToday([task('done-today', '2026-11-10', true), task('yesterday', '2026-11-09'), task('tomorrow', '2026-11-11'), task('undated')], now).map(n => n.id), ['done-today']);
assert.deepEqual(tasksDueToday([task('time-today', '16:00')], new Date(2026, 10, 10, 17, 0)).map(n => n.id), ['time-today']); // time-only tied to actual today even if the time has passed
assert.deepEqual(tasksDueToday([task('invalid-time', '25:00'), task('invalid-date', 'not-a-date')], now).map(n => n.id), []);

assert.equal(getTaskPeriod('Today', now, schedule).availableMinutes, 300);
assert.equal(getTaskPeriod('Weekly', now, schedule).availableMinutes, 300 + 5 * 480);
assert.equal(getTaskPeriod('Monthly', now, schedule).availableMinutes, 300 + 20 * 480);
assert.equal(getTaskPeriod('Today', new Date(2026, 10, 10, 7), schedule).availableMinutes, 480);
assert.equal(getTaskPeriod('Today', new Date(2026, 10, 10, 18), schedule).availableMinutes, 0);
assert.equal(getTaskPeriod('Weekly', new Date(2026, 10, 15, 12), schedule).availableMinutes, 300);
assert.equal(getTaskPeriod('Monthly', new Date(2026, 11, 31, 12), schedule).end.getFullYear(), 2027);
assert.equal(calculateBuffer(300, 120).status, 'surplus');
assert.equal(calculateBuffer(300, 250).status, 'tight');
assert.equal(calculateBuffer(300, 301).status, 'overloaded');
assert.equal(formatPeriodMinutes(4500), '3d 3h');
assert.equal(formatPeriodMinutes(4515), '3d 3h'); // At most 2 levels: minutes dropped
assert.equal(formatPeriodMinutes(0), '0m');
// New multi-scale workload duration formatting (24h day, 30d month, 12mo year) with 2-level approximation.
assert.equal(formatPeriodMinutes(25 * 60), '1d 1h'); // 25h over 24h -> days/hours
assert.equal(formatPeriodMinutes(31 * 24 * 60 + 2 * 60), '1mo 1d'); // 31d + 2h over 30d -> months/days (hours dropped)
assert.equal(formatPeriodMinutes(4 * 43200 + 12 * 1440), '4mo 12d'); // 4 months 12 days
assert.equal(formatPeriodMinutes(12 * 30 * 24 * 60), '1y'); // 12mo -> years
assert.equal(formatPeriodMinutes(90), '1h 30m');
assert.equal(formatPeriodMinutes(45), '45m');
assert.equal(formatPeriodMinutes(1), '1m');

// Default ranges: weekly Monday-Sunday, monthly calendar month, today = current local date.
const weekly = getTaskPeriod('Weekly', now, schedule);
assert.equal(weekly.start.getDay(), 1); // Monday
assert.equal(weekly.end.getDay(), 1);   // next Monday
const monthly = getTaskPeriod('Monthly', now, schedule);
assert.equal(monthly.start.getDate(), 1);
assert.equal(monthly.end.getDate(), 1);
assert.equal(monthly.end.getMonth(), 11); // December
const todayRange = getTaskPeriod('Today', now, schedule);
assert.equal(todayRange.start.getDate(), 10);
assert.equal(todayRange.end.getDate(), 11);

// localToday follows local midnight.
const local = localToday(new Date(2026, 10, 10, 23, 59));
assert.equal(local.getDate(), 10);
assert.equal(local.getHours(), 0);

// Capacity respects work days and past ranges contribute zero remaining.
const weekdaysOnly = { startHour: 9, endHour: 17, workDays: [1, 2, 3, 4, 5] };
// Saturday Nov 14 2026 inside a weekly range: not a work day -> 0 remaining.
const sat = new Date(2026, 10, 14, 12, 0);
assert.equal(getTaskPeriod('Weekly', sat, weekdaysOnly).availableMinutes, 0);
// A fully past range contributes zero remaining.
const pastRange = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 5) };
assert.equal(getTaskPeriod('Weekly', now, schedule, pastRange).availableMinutes, 0);

// Range validation: start <= end required; invalid ranges never silently applied.
const inverted = { start: new Date(2026, 10, 10), end: new Date(2026, 10, 1) };
const invertedResult = getTaskPeriod('Weekly', now, schedule, inverted);
assert.equal(invertedResult.valid, false);
assert.equal(invertedResult.availableMinutes, 0);
assert.ok(invertedResult.error);
// Same-day empty range is invalid.
const sameDay = { start: new Date(2026, 10, 10), end: new Date(2026, 10, 10) };
assert.equal(getTaskPeriod('Today', now, schedule, sameDay).valid, false);
// A future-dated Today overrides default date to the selected local date.
const selectedToday = getTaskPeriod('Today', now, schedule, { start: new Date(2026, 11, 25), end: new Date(2026, 11, 26) });
assert.equal(selectedToday.start.getDate(), 25);
assert.equal(selectedToday.end.getDate(), 26);

// Monthly boundary built directly from year/month+1/1: Jan 31 must not roll into March.
const jan31 = defaultPeriodRange('Monthly', new Date(2026, 0, 31));
assert.equal(jan31.start.getDate(), 1);
assert.equal(jan31.start.getMonth(), 0);
assert.equal(jan31.end.getDate(), 1);
assert.equal(jan31.end.getMonth(), 1); // February, not March
const dec31 = getTaskPeriod('Monthly', new Date(2026, 11, 31, 12), schedule);
assert.equal(dec31.end.getFullYear(), 2027);
assert.equal(dec31.end.getMonth(), 0);
assert.equal(dec31.end.getDate(), 1);
// Leap-year February still ends on March 1.
const feb29 = defaultPeriodRange('Monthly', new Date(2024, 1, 29));
assert.equal(feb29.end.getMonth(), 2);
assert.equal(feb29.end.getDate(), 1);

// Monthly auto-advance inclusive end: one calendar month minus one day, clamped at month end.
const jan31End = addMonthsInclusive(new Date(2026, 0, 31), 1);
assert.equal(jan31End.getDate(), 27); // Feb 27 inclusive
assert.equal(jan31End.getMonth(), 1); // February
const jan15End = addMonthsInclusive(new Date(2026, 0, 15), 1);
assert.equal(jan15End.getDate(), 14); // Feb 14 inclusive
assert.equal(jan15End.getMonth(), 1);
// Leap-year Jan 31 -> Feb 28 inclusive (exclusive Feb 29).
const leapJan31End = addMonthsInclusive(new Date(2024, 0, 31), 1);
assert.equal(leapJan31End.getDate(), 28);
assert.equal(leapJan31End.getMonth(), 1);

// Rollover dates are rejected rather than normalized into another date.
assert.equal(isValidLocalDate(2026, 2, 30), false);
assert.deepEqual(parseLocalDate('2026-02-30'), { year: 2026, month: 2, day: 30 }); // structural parse; validity checked separately
assert.deepEqual(tasksInPeriod([task('bad', '2026-02-30')], 'Monthly', now, { start: new Date(2026, 1, 1), end: new Date(2026, 3, 1) }).map(n => n.id), []);
assert.deepEqual(parseLocalDate('2026-11-10'), { year: 2026, month: 11, day: 10 });
assert.equal(parseLocalDate(''), null);
assert.equal(parseLocalDate('not-a-date'), null);
assert.equal(parseLocalDate('2026-13-01'), null);
// Undated view keeps invalid entries (no valid deadline).
assert.deepEqual(tasksInPeriod([task('bad', '2026-02-30')], 'Undated', now, { start: new Date(2026, 1, 1), end: new Date(2026, 3, 1) }).map(n => n.id), ['bad']);

// Custom inclusive range filtering: only tasks due inside [start, end), no carry-forward, no undated.
const rangeNotes = [task('early', '2026-11-05'), task('start', '2026-11-10'), task('mid', '2026-11-15'), task('end-day', '2026-11-16'), task('late', '2026-11-20'), task('no-date')];
const customRange = { start: new Date(2026, 10, 10), end: new Date(2026, 10, 17) }; // inclusive Nov 10..16
assert.deepEqual(tasksInPeriod(rangeNotes, 'Weekly', now, customRange).map(n => n.id), ['start', 'mid', 'end-day']);
// end-day 2026-11-16 is due 23:59:59 on the 16th, inside an exclusive end of Nov 17.
assert.deepEqual(tasksInPeriod([task('end-day', '2026-11-16')], 'Weekly', now, { start: new Date(2026, 10, 10), end: new Date(2026, 10, 17) }).map(n => n.id), ['end-day']);

// Local date parsing is timezone independent: under a negative-offset TZ, UTC parsing of '2026-11-10'
// lands on the 9th, while local construction stays on the 10th.
assert.notEqual(new Date('2026-11-10').getDate(), 10);
assert.equal(localDate(2026, 11, 10).getDate(), 10);
assert.deepEqual(parseLocalDate('2026-11-10'), { year: 2026, month: 11, day: 10 });
assert.deepEqual(parseLocalDate('2026-02-30'), { year: 2026, month: 2, day: 30 }); // structural parse; validity checked separately
assert.equal(isValidLocalDate(2026, 2, 30), false);
assert.equal(parseLocalDate(''), null);
assert.equal(parseLocalDate('not-a-date'), null);
assert.equal(parseLocalDate('2026-13-01'), null);

// Future range: full active-day capacity; past range: zero remaining.
const futureRange = { start: new Date(2026, 10, 20), end: new Date(2026, 10, 27) }; // coming week, all work days
assert.equal(getTaskPeriod('Weekly', now, weekdaysOnly, futureRange).availableMinutes, 5 * 480);
assert.equal(getTaskPeriod('Weekly', now, schedule, pastRange).availableMinutes, 0);

console.log('Task period filtering, calendar boundaries, capacity and buffer tests passed.');
