import type { QuickNote } from '../types';
import { tasksDueToday } from './taskPeriod';

/** Today's completed work is ready even when future commitments remain. */
export function getReflectionTasks(notes: QuickNote[], now: Date): QuickNote[] {
  const today = tasksDueToday(notes, now);
  if (today.length > 0 && today.every(task => task.isDone)) {
    const completed = today.filter(task => task.pendingReflection);
    if (completed.length > 0) return completed;
  }
  // Also support finishing an undated/past task list through the Tasks view.
  return notes.length > 0 && notes.every(task => task.isDone)
    ? notes.filter(task => task.pendingReflection) : [];
}

/** Closing/leaving reflection resets only the work awaiting that reflection. */
export function resetReflectionTasks(notes: QuickNote[], now: Date): QuickNote[] {
  const ids = new Set(getReflectionTasks(notes, now).map(task => task.id));
  if (ids.size === 0) return notes;
  return notes.map(task => ids.has(task.id) ? {
    ...task, isDone: false, pendingReflection: false,
    subtasks: task.subtasks?.map(subtask => ({ ...subtask, isDone: false })),
  } : task);
}
