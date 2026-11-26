import type { QuickNote } from '../types';
import { taskValueCents } from './castleEconomy';
import { formatDateKey } from './gamification';

export function formatTaskCashEstimate(
  task: Pick<QuickNote, 'durationMinutes' | 'priority' | 'deadline'> | undefined,
  now: Date,
): string | undefined {
  if (task?.durationMinutes == null) return undefined;

  try {
    const cents = taskValueCents(task.durationMinutes, task.priority ?? 'medium', task.deadline, formatDateKey(now));
    return `$${(cents / 100).toFixed(2)}`;
  } catch {
    // Older tasks can have an estimate or priority that the economy cannot value.
    return undefined;
  }
}
