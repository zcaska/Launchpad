import { QuickNote, TaskPriority } from '../types';
import { TickTickTask } from '../types/ticktick';

/**
 * Converts a LaunchPad TaskPriority to TickTick's priority number:
 * - 'urgent' | 'high' -> 5
 * - 'medium' -> 3
 * - 'low' -> 1
 * - default / undefined -> 0
 */
export function priorityToTickTick(priority?: TaskPriority): number {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 5;
    case 'medium':
      return 3;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Converts TickTick's priority number to LaunchPad's TaskPriority:
 * - >= 5 -> 'high'
 * - >= 3 -> 'medium'
 * - >= 1 -> 'low'
 * - default -> undefined
 */
export function priorityFromTickTick(priority: number): TaskPriority | undefined {
  if (priority >= 5) {
    return 'high';
  }
  if (priority >= 3) {
    return 'medium';
  }
  if (priority >= 1) {
    return 'low';
  }
  return undefined;
}

/**
 * Formats a deadline string to ISO date string format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss+...).
 * Handles date-only ("YYYY-MM-DD") or existing full ISO timestamps.
 */
function formatDeadlineToIso(deadline?: string): string | undefined {
  if (!deadline) return undefined;
  if (deadline.includes('T')) {
    return deadline;
  }
  // If it's YYYY-MM-DD, parse as UTC midnight or date
  const parsed = new Date(deadline);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return deadline;
}

/**
 * Maps a LaunchPad QuickNote to a TickTickTask payload.
 */
export function mapQuickNoteToTickTick(note: QuickNote, targetProjectId: string): Partial<TickTickTask> {
  const result: Partial<TickTickTask> = {
    title: note.text,
    content: note.description || '',
    status: note.isDone ? 2 : 0,
    priority: priorityToTickTick(note.priority),
    projectId: note.ticktickProjectId || targetProjectId,
  };

  if (note.ticktickTaskId) {
    result.id = note.ticktickTaskId;
  }

  if (note.deadline) {
    result.dueDate = formatDeadlineToIso(note.deadline);
  }

  if (note.subtasks && note.subtasks.length > 0) {
    result.items = note.subtasks.map((sub, index) => ({
      id: sub.id || `sub_${index}`,
      title: sub.text,
      status: sub.isDone ? 1 : 0,
    }));
  }

  return result;
}

/**
 * Maps a TickTickTask to a LaunchPad QuickNote.
 */
export function mapTickTickToQuickNote(task: TickTickTask): QuickNote {
  const deadline = task.dueDate ? task.dueDate.split('T')[0] : undefined;

  const subtasks = task.items?.map(item => ({
    id: item.id,
    text: item.title,
    isDone: item.status === 1,
  }));

  return {
    id: `tt_${task.id}`,
    text: task.title,
    description: task.content || undefined,
    isDone: task.status === 2,
    createdAt: task.createdTime ? new Date(task.createdTime).getTime() : Date.now(),
    deadline,
    priority: priorityFromTickTick(task.priority),
    subtasks,
    source: 'ticktick',
    ticktickTaskId: task.id,
    ticktickProjectId: task.projectId,
    syncStatus: 'synced',
    ticktickLastModified: task.modifiedTime ? new Date(task.modifiedTime).getTime() : Date.now(),
  };
}

/**
 * Reconciles LaunchPad notes with remote TickTick tasks.
 * - Local-only notes (note.source !== 'ticktick') are preserved untouched.
 * - For notes matching a remote task's ticktickTaskId: update text, description, isDone, priority, deadline, syncStatus.
 * - For remote tasks not present in existing notes: append as new QuickNotes.
 * - If an existing synced note is no longer present in remote tasks, preserve it without dropping.
 */
export function reconcileTasks(
  existingNotes: QuickNote[],
  remoteTasks: TickTickTask[],
  targetProjectId: string
): QuickNote[] {
  const remoteMap = new Map<string, TickTickTask>();
  for (const task of remoteTasks) {
    remoteMap.set(task.id, task);
  }

  const seenRemoteIds = new Set<string>();

  const updatedNotes = existingNotes.map(note => {
    // Preserve local-only notes
    if (note.source !== 'ticktick' || !note.ticktickTaskId) {
      return note;
    }

    const remote = remoteMap.get(note.ticktickTaskId);
    if (!remote) {
      // Remote task not found in current batch; preserve existing note
      return note;
    }

    seenRemoteIds.add(remote.id);

    return {
      ...note,
      text: remote.title,
      description: remote.content || undefined,
      isDone: remote.status === 2,
      priority: priorityFromTickTick(remote.priority),
      deadline: remote.dueDate ? remote.dueDate.split('T')[0] : undefined,
      subtasks: remote.items?.map(item => ({
        id: item.id,
        text: item.title,
        isDone: item.status === 1,
      })),
      ticktickProjectId: remote.projectId || note.ticktickProjectId || targetProjectId,
      ticktickLastModified: remote.modifiedTime ? new Date(remote.modifiedTime).getTime() : note.ticktickLastModified,
      syncStatus: 'synced' as const,
    };
  });

  // Append new remote tasks that were not in existingNotes
  for (const remote of remoteTasks) {
    if (!seenRemoteIds.has(remote.id)) {
      // Check if existingNotes had it by id as fallback
      const alreadyExists = existingNotes.some(
        n => n.ticktickTaskId === remote.id || n.id === `tt_${remote.id}`
      );
      if (!alreadyExists) {
        updatedNotes.push(mapTickTickToQuickNote(remote));
      }
    }
  }

  return updatedNotes;
}
