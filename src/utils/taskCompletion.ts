import type { QuickNote } from '../types';
import { elapsedSeconds, type FocusTimerState } from './focusTimer';
import { toggleTaskInList, toggleSubtaskInList } from './taskUrgency';

type EditorFields = Pick<QuickNote,
  'text' | 'description' | 'durationMinutes' | 'priority' | 'deadline' | 'attachedUrls' | 'subtasks'
>;

export type TaskAction =
  | { kind: 'toggleTask' }
  | { kind: 'toggleSubtask'; subtaskId: string }
  | { kind: 'edit'; fields: EditorFields };

export function transitionTask(notes: QuickNote[], timer: FocusTimerState | null, id: string, action: TaskAction, now: number): {
  notes: QuickNote[];
  timer: FocusTimerState | null;
  completedTask?: QuickNote;
} {
  const index = notes.findIndex(task => task.id === id);
  if (index < 0) return { notes, timer };
  const previous = notes[index];
  let next: QuickNote;
  switch (action.kind) {
    case 'toggleTask':
      next = toggleTaskInList([previous], id).updatedTasks[0];
      break;
    case 'toggleSubtask':
      if (!previous.subtasks?.some(subtask => subtask.id === action.subtaskId)) return { notes, timer };
      next = toggleSubtaskInList([previous], id, action.subtaskId).updatedTasks[0];
      break;
    case 'edit': {
      // The editor changes checklist membership. Checkboxes and reflection reset own the live checkmarks.
      const checkmarks = new Map(previous.subtasks?.map(subtask => [subtask.id, subtask.isDone]));
      const subtasks = action.fields.subtasks?.map(subtask => ({
        ...subtask, isDone: checkmarks.get(subtask.id) ?? subtask.isDone,
      }));
      next = { ...previous, ...action.fields, subtasks, isDone: subtasks?.length ? subtasks.every(s => s.isDone) : previous.isDone };
      break;
    }
  }

  const becameDone = next.isDone && !previous.isDone;
  if (becameDone || (previous.isDone && !next.isDone)) next.pendingReflection = next.isDone;
  if (becameDone && timer?.taskId === id) {
    const seconds = elapsedSeconds(timer, now);
    if (seconds > 0) next.timeSpentSeconds = (previous.timeSpentSeconds ?? 0) + seconds;
    timer = null;
  }
  const updated = notes.slice();
  updated[index] = next;
  return { notes: updated, timer, completedTask: becameDone ? next : undefined };
}
