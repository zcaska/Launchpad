import { QuickNote, DailyFocus, TimeOfDayBucket } from '../types';

export function getTimeOfDayBucket(date: Date = new Date()): TimeOfDayBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function formatMinutesToHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
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

  // Include primary daily focus if not empty
  if (dailyFocus && dailyFocus.goal.trim()) {
    const focusDuration = dailyFocus.durationMinutes || 45;
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
