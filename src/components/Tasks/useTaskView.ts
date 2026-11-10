import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuickNote } from '../../types';
import { defaultPeriodRange, getTaskPeriod, tasksInPeriod, type TaskPeriod } from '../../utils/taskPeriod';
import { calculateBuffer, calculateTaskLoad } from '../../utils/timeBudget';

/** Shared Tasks period state: list, workload and sidebar badge use the same scope. */
export function useTaskView(notes: QuickNote[], now: Date, schedule: { startHour: number; endHour: number; workDays?: number[] }) {
  const [period, setSelectedPeriod] = useState<TaskPeriod>('Today');
  // Date inputs use inclusive calendar dates; the filtering range ends exclusively.
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const setPeriod = useCallback((value: TaskPeriod) => {
    setSelectedPeriod(value);
    setCustomRange(null);
  }, []);
  const baseRange = useMemo(() => defaultPeriodRange(period, now), [period, now]);
  const effectiveRange = useMemo(() => customRange ? {
    start: customRange.start,
    end: new Date(customRange.end.getFullYear(), customRange.end.getMonth(), customRange.end.getDate() + 1),
  } : baseRange, [customRange, baseRange]);
  const result = useMemo(() => getTaskPeriod(period, now, schedule, effectiveRange),
    [period, now, schedule.startHour, schedule.endHour, schedule.workDays, effectiveRange]);
  const lastValidRange = useRef(result);
  useEffect(() => {
    if (result.valid) lastValidRange.current = result;
  }, [result]);
  const range = result.valid ? result : getTaskPeriod(period, now, schedule, lastValidRange.current);
  const periodNotes = useMemo(() => tasksInPeriod(notes, period, now, range), [notes, period, now, range]);
  const periodLoad = useMemo(() => calculateTaskLoad(periodNotes), [periodNotes]);
  return {
    period, setPeriod, customRange, setCustomRange, baseRange, range, periodNotes, periodLoad,
    rangeError: customRange && !result.valid ? result.error : undefined,
    defaultEndInclusive: new Date(baseRange.end.getFullYear(), baseRange.end.getMonth(), baseRange.end.getDate() - 1),
    periodBuffer: calculateBuffer(range.availableMinutes, periodLoad.pendingMinutes),
    hasPeriodBudget: period === 'Today' || period === 'Weekly' || period === 'Monthly',
  };
}

export type TaskViewState = ReturnType<typeof useTaskView>;
