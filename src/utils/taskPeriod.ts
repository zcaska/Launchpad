import type { QuickNote } from '../types';
import { formatApproximateDuration } from './timeBudget';

export type TaskPeriod = 'All time' | 'Today' | 'Weekly' | 'Monthly' | 'Undated';
export const taskPeriods: TaskPeriod[] = ['All time', 'Today', 'Weekly', 'Monthly', 'Undated'];

export interface DateRange {
  start: Date; // inclusive, local midnight
  end: Date;   // exclusive, local midnight
}

export interface PeriodResult {
  start: Date;
  end: Date;
  availableMinutes: number;
  valid: boolean;
  error?: string;
}

// Formats workload minutes with approximation extending to at most 2 levels and compact abbreviations.
export function formatPeriodMinutes(minutes: number): string {
  return formatApproximateDuration(minutes, { allowWeeks: false });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localToday(now: Date): Date {
  return startOfLocalDay(now);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function mondayOf(d: Date): Date {
  const day = startOfLocalDay(d);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

/** Build a local-date Date from year/month/day without UTC parsing or rollover surprises. */
export function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

/** Parse a YYYY-MM-DD string into local calendar components, rejecting malformed input. */
export function parseLocalDate(s: string): { year: number; month: number; day: number } | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!parts) return null;
  const year = +parts[1];
  const month = +parts[2];
  const day = +parts[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** True only when year/month/day form a real calendar date (rejects rollover e.g. 2026-02-30). */
export function isValidLocalDate(y: number, m: number, d: number): boolean {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Monthly auto-advance rule: inclusive end = start + one calendar month minus one day,
 * clamped at the target month end (e.g. Jan 31 -> Feb 27 inclusive / exclusive Feb 28 nonleap).
 * Returns the inclusive end Date (local midnight).
 */
export function addMonthsInclusive(start: Date, months: number): Date {
  const y = start.getFullYear();
  const m = start.getMonth();
  const d = start.getDate();
  const daysInTargetMonth = new Date(y, m + months + 1, 0).getDate(); // last day of target month
  const exclusiveDay = Math.min(d, daysInTargetMonth); // clamp rollover (Jan31 -> Feb28)
  return new Date(y, m + months, exclusiveDay - 1); // inclusive end (day before exclusive boundary)
}

/** Default local range for a period: Today = now, Weekly = Mon–Sun, Monthly = calendar month.
 *  The monthly end is built directly from year/month+1/1 so Jan 31 never rolls into March. */
export function defaultPeriodRange(period: TaskPeriod, now: Date): DateRange {
  const today = startOfLocalDay(now);
  if (period === 'Weekly') {
    const start = mondayOf(today);
    return { start, end: addDays(start, 7) };
  }
  if (period === 'Monthly') {
    const y = today.getFullYear();
    const m = today.getMonth();
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
  }
  return { start: today, end: addDays(today, 1) };
}

function deadlineDate(deadline: string | undefined, now: Date): Date | null {
  if (!deadline) return null;
  if (/^\d{2}:\d{2}$/.test(deadline)) {
    const [hour, minute] = deadline.split(':').map(Number);
    if (hour > 23 || minute > 59) return null;
    const date = new Date(now);
    date.setHours(hour, minute, 0, 0);
    return date;
  }
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (parts) {
    const y = +parts[1];
    const m = +parts[2];
    const d = +parts[3];
    // Reject rollover dates (e.g. 2026-02-30) that Date would normalize into March.
    if (!isValidLocalDate(y, m, d)) return null;
    return new Date(y, m - 1, d, 23, 59, 59);
  }
  const fallback = new Date(deadline.replace(' ', 'T'));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function getTaskPeriod(
  period: TaskPeriod,
  now: Date,
  schedule: { startHour: number; endHour: number; workDays?: number[] },
  range?: DateRange
): PeriodResult {
  const workDays = schedule.workDays ?? [0, 1, 2, 3, 4, 5, 6];
  const isWorkDay = (d: Date) => workDays.includes(d.getDay());

  const requested = range ?? defaultPeriodRange(period, now);
  const start = startOfLocalDay(requested.start);
  const end = startOfLocalDay(requested.end);

  const valid = end > start;
  const error = valid ? undefined : 'Start date must be before end date.';

  let availableMinutes = 0;
  if (valid) {
    const today = startOfLocalDay(now);
    let day = new Date(start);
    while (day < end) {
      // Past dates contribute zero remaining; only active work days count.
      if (!(day < today) && isWorkDay(day)) {
        const from = new Date(day);
        const until = new Date(day);
        from.setHours(schedule.startHour, 0, 0, 0);
        until.setHours(schedule.endHour, 0, 0, 0);
        const dayStart = Math.max(from.getTime(), now.getTime());
        if (until.getTime() > dayStart) {
          availableMinutes += (until.getTime() - dayStart) / 60000;
        }
      }
      day = addDays(day, 1);
    }
  }

  return { start, end, availableMinutes: Math.floor(availableMinutes), valid, error };
}

export function tasksInPeriod(
  notes: QuickNote[],
  period: TaskPeriod,
  now: Date,
  range: { start: Date; end: Date }
): QuickNote[] {
  return notes.filter((task) => {
    if (period === 'All time') return true;
    const due = deadlineDate(task.deadline, now);
    if (period === 'Undated') return !due;
    // Date-scoped views: only tasks due inside [start, end). No undated tasks,
    // no carry-forward of overdue work from outside the range, completion ignored.
    if (!due) return false;
    return due >= range.start && due < range.end;
  });
}

/** Tasks with a valid deadline falling inside actual local today (incl. time-only HH:MM). */
export function tasksDueToday(notes: QuickNote[], now: Date): QuickNote[] {
  const today = startOfLocalDay(now);
  const tomorrow = addDays(today, 1);
  return notes.filter((task) => {
    const due = deadlineDate(task.deadline, now);
    return due != null && due >= today && due < tomorrow;
  });
}
