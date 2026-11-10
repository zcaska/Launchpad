import { QuickNote, DailyFocus, TimeOfDayBucket } from '../types';

export function getTimeOfDayBucket(date: Date = new Date()): TimeOfDayBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export interface FormatApproximateDurationOptions {
  allowWeeks?: boolean;
}

/**
 * Formats duration in minutes into a clean, human-readable approximate time format.
 * Rules:
 * - Extends to at most 2 levels (highest-order non-zero unit + immediate sub-unit).
 * - Smallest unit is minutes (m).
 * - Uses compact abbreviations: y (year), mo (month), w (week), d (day), h (hour), m (minute).
 * - Fixed workload / calendar conversions: 1y = 12mo, 1mo = 30d, 1w = 7d, 1d = 24h, 1h = 60m.
 * - Examples:
 *   - 2h 35m -> "2h 35m"
 *   - 2d 12h 36m -> "2d 12h"
 *   - 4 months 12 days -> "4mo 12d"
 *   - 1 week 3 days -> "1w 3d" (when allowWeeks: true)
 */
export function formatApproximateDuration(
  totalMinutes: number,
  options?: FormatApproximateDurationOptions
): string {
  const m = Math.floor(Math.max(0, totalMinutes));
  if (m <= 0) return '0m';

  const dayMin = 24 * 60; // 1440
  const weekMin = 7 * dayMin; // 10080
  const monthMin = 30 * dayMin; // 43200 (fixed 30-day month)
  const yearMin = 12 * monthMin; // 518400 (fixed 12-month year)

  // 1. Years (>= 1 year) -> at most 2 levels: y, mo
  if (m >= yearMin) {
    const years = Math.floor(m / yearMin);
    const months = Math.floor((m % yearMin) / monthMin);
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  }

  // 2. Months (>= 1 month = 30d) -> at most 2 levels: mo, d
  if (m >= monthMin) {
    const months = Math.floor(m / monthMin);
    const days = Math.floor((m % monthMin) / dayMin);
    return days > 0 ? `${months}mo ${days}d` : `${months}mo`;
  }

  // 3. Weeks (>= 1 week = 7d) -> at most 2 levels: w, d (if allowWeeks)
  if (options?.allowWeeks && m >= weekMin) {
    const weeks = Math.floor(m / weekMin);
    const days = Math.floor((m % weekMin) / dayMin);
    return days > 0 ? `${weeks}w ${days}d` : `${weeks}w`;
  }

  // 4. Days (>= 1 day = 24h) -> at most 2 levels: d, h
  if (m >= dayMin) {
    const days = Math.floor(m / dayMin);
    const hours = Math.floor((m % dayMin) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  // 5. Hours (>= 1 hour = 60m) -> at most 2 levels: h, m
  if (m >= 60) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  // 6. Minutes (< 60m) -> 1 level: m
  return `${m}m`;
}

export function formatMinutesToHours(totalMinutes: number): string {
  return formatApproximateDuration(totalMinutes, { allowWeeks: false });
}

export interface DayTimeRemaining {
  totalMinutes: number;
  formatted: string;
  isPastCutoff: boolean;
  percentageRemaining: number;
}

export function calculateDayTimeRemaining(
  now: Date = new Date(),
  startHour: number = 9,
  endHour: number = 22
): DayTimeRemaining {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalActiveDayMinutes = Math.max(60, endMinutes - startMinutes);

  if (currentMinutes >= endMinutes) {
    return {
      totalMinutes: 0,
      formatted: '0m',
      isPastCutoff: true,
      percentageRemaining: 0,
    };
  }

  const remaining = Math.max(0, endMinutes - currentMinutes);
  const percentage = Math.min(100, Math.max(0, Math.round((remaining / totalActiveDayMinutes) * 100)));

  return {
    totalMinutes: remaining,
    formatted: formatMinutesToHours(remaining),
    isPastCutoff: false,
    percentageRemaining: percentage,
  };
}

export interface TaskLoadSummary {
  pendingCount: number;
  completedCount: number;
  pendingMinutes: number;
  completedMinutes: number;
  formattedPending: string;
  formattedCompleted: string;
}

export function calculateTaskLoad(
  notes: QuickNote[] = [],
  dailyFocus?: DailyFocus
): TaskLoadSummary {
  let pendingMinutes = 0;
  let completedMinutes = 0;
  let pendingCount = 0;
  let completedCount = 0;

  // Include primary daily focus if explicitly set with duration and not the legacy placeholder
  if (
    dailyFocus &&
    dailyFocus.goal.trim() &&
    dailyFocus.goal !== 'Complete Module 3 assignment & review system design notes' &&
    (dailyFocus.durationMinutes || 0) > 0
  ) {
    const focusDuration = dailyFocus.durationMinutes || 0;
    if (dailyFocus.isCompleted) {
      completedMinutes += focusDuration;
      completedCount += 1;
    } else {
      pendingMinutes += focusDuration;
      pendingCount += 1;
    }
  }

  // Calculate notes
  notes.forEach((note) => {
    const duration = note.durationMinutes || 30; // default 30m if unspecified
    if (note.isDone) {
      completedMinutes += duration;
      completedCount += 1;
    } else {
      pendingMinutes += duration;
      pendingCount += 1;
    }
  });

  return {
    pendingCount,
    completedCount,
    pendingMinutes,
    completedMinutes,
    formattedPending: formatMinutesToHours(pendingMinutes),
    formattedCompleted: formatMinutesToHours(completedMinutes),
  };
}

export interface BufferSummary {
  bufferMinutes: number;
  status: 'surplus' | 'tight' | 'overloaded';
  formatted: string;
  loadRatioPercentage: number; // pendingMinutes / availableMinutes
}

export const bufferTextColor = {
  surplus: 'text-emerald-700 dark:text-emerald-400',
  tight: 'text-amber-700 dark:text-amber-400',
  overloaded: 'text-red-700 dark:text-red-400',
};

export function calculateBuffer(
  availableMinutes: number,
  pendingMinutes: number
): BufferSummary {
  const buffer = availableMinutes - pendingMinutes;
  const loadRatio = availableMinutes > 0 ? Math.round((pendingMinutes / availableMinutes) * 100) : 100;

  let status: 'surplus' | 'tight' | 'overloaded' = 'surplus';
  if (buffer < 0) {
    status = 'overloaded';
  } else if (buffer < 60 || loadRatio > 80) {
    status = 'tight';
  }

  return {
    bufferMinutes: buffer,
    status,
    formatted: formatMinutesToHours(Math.abs(buffer)),
    loadRatioPercentage: Math.min(100, loadRatio),
  };
}
