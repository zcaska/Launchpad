import type { QuickNote, TaskPriority } from '../../types';
import { isClockOnlyDeadline } from '../../utils/taskDeadline';
import { parsePeriodDeadline } from '../../utils/taskPeriod';

export const taskFilterTabs = ['All', 'Urgent', 'High Priority', 'Medium', 'Low', 'Due Soon', 'Completed'] as const;
export type FilterTab = (typeof taskFilterTabs)[number];

type PriorityTab = Exclude<FilterTab, 'All' | 'Due Soon' | 'Completed'>;
const priorityFilters = new Map<TaskPriority, { tab: PriorityTab; rank: number }>([
  ['urgent', { tab: 'Urgent', rank: 0 }],
  ['high', { tab: 'High Priority', rank: 1 }],
  ['medium', { tab: 'Medium', rank: 2 }],
  ['low', { tab: 'Low', rank: 3 }],
]);

interface DeadlineClock {
  now: Date;
  tomorrowMs: number;
  dayAfterTomorrowMs: number;
}

type DeadlineStatus =
  | { kind: 'invalid' | 'overdue-time' | 'at-time' }
  | { kind: 'in-minutes'; minutes: number }
  | { kind: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future'; date: Date };

export interface TaskRow {
  task: QuickNote;
  // Completed tasks have no deadline-based membership. Classify only when shown.
  deadline?: DeadlineStatus | null;
}

function classifyDeadline(raw: string | undefined, clock: DeadlineClock): DeadlineStatus | null {
  if (!raw) return null;
  const date = parsePeriodDeadline(raw, clock.now);
  if (!date) return { kind: 'invalid' };

  const dueMs = date.getTime();
  const diffMs = dueMs - clock.now.getTime();
  if (isClockOnlyDeadline(raw)) {
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 0) return { kind: 'overdue-time' };
    if (minutes <= 120) return { kind: 'in-minutes', minutes };
    return { kind: 'at-time' };
  }

  if (diffMs < 0) return { kind: 'overdue', date };
  if (dueMs < clock.tomorrowMs) return { kind: 'today', date };
  if (dueMs < clock.dayAfterTomorrowMs) return { kind: 'tomorrow', date };
  if (diffMs <= 48 * 60 * 60_000) return { kind: 'soon', date };
  return { kind: 'future', date };
}

function isDueSoon(status: DeadlineStatus | null): boolean {
  // The Tasks filter also includes today's and overdue work.
  return status !== null && status.kind !== 'invalid' && status.kind !== 'future';
}

export function projectTaskList(periodNotes: QuickNote[], now: Date) {
  const clock: DeadlineClock = {
    now,
    tomorrowMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime(),
    dayAfterTomorrowMs: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getTime(),
  };
  const pending: TaskRow[] = [];
  const byTab: Record<Exclude<FilterTab, 'All'>, TaskRow[]> = {
    'Urgent': [],
    'High Priority': [],
    'Medium': [],
    'Low': [],
    'Due Soon': [],
    'Completed': [],
  };

  for (const task of periodNotes) {
    if (task.isDone) {
      byTab.Completed.push({ task });
      continue;
    }

    const deadline = classifyDeadline(task.deadline, clock);
    const row = { task, deadline };
    pending.push(row);
    const priorityFilter = task.priority && priorityFilters.get(task.priority);
    if (priorityFilter) byTab[priorityFilter.tab].push(row);
    if (isDueSoon(deadline)) byTab['Due Soon'].push(row);
  }

  return { pending, byTab, clock };
}

type TaskListProjection = ReturnType<typeof projectTaskList>;

export function taskTabCount(projection: TaskListProjection, tab: FilterTab): number {
  return tab === 'All'
    ? projection.pending.length + projection.byTab.Completed.length
    : projection.byTab[tab].length;
}

function matchesQuery(task: QuickNote, query: string): boolean {
  return task.text.toLowerCase().includes(query)
    || !!task.description?.toLowerCase().includes(query)
    || !!task.subtasks?.some(({ text }) => text.toLowerCase().includes(query))
    || !!task.attachedUrls?.some(({ url, title }) =>
      url.toLowerCase().includes(query) || title?.toLowerCase().includes(query)
    );
}

function priorityRank({ task }: TaskRow): number {
  return priorityFilters.get(task.priority ?? 'medium')?.rank ?? 2;
}

export function selectTaskRows(projection: TaskListProjection, tab: FilterTab, searchQuery: string) {
  const query = searchQuery.trim() ? searchQuery.toLowerCase() : '';
  const matches = ({ task }: TaskRow) => !query || matchesQuery(task, query);
  const pendingSource = tab === 'All' ? projection.pending : tab === 'Completed' ? [] : projection.byTab[tab];
  const pending = pendingSource.filter(matches);
  if (tab === 'All' || tab === 'Due Soon') pending.sort((a, b) => priorityRank(a) - priorityRank(b));
  return {
    pending,
    completed: tab === 'All' || tab === 'Completed' ? projection.byTab.Completed.filter(matches) : [],
  };
}

function shortDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function shortTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function deadlineLabel(status: DeadlineStatus, raw: string, now: Date): string {
  switch (status.kind) {
    case 'invalid': return raw;
    case 'overdue-time': return `Overdue (${raw.trim()})`;
    case 'at-time': return `Due at ${raw.trim()}`;
    case 'in-minutes': return `Due in ${status.minutes}m`;
    case 'overdue': return `Overdue (${shortDate(status.date)})`;
    case 'today': return raw.includes(':') ? `Due today ${shortTime(status.date)}` : 'Due today';
    case 'tomorrow': return raw.includes(':') ? `Tomorrow ${shortTime(status.date)}` : 'Due tomorrow';
    case 'soon': return `Due soon (${shortDate(status.date)})`;
    case 'future': return status.date.toLocaleDateString([], {
      month: 'short', day: 'numeric',
      year: status.date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

export function taskDeadlineBadge(row: TaskRow, clock: DeadlineClock) {
  const raw = row.task.deadline;
  if (!raw) return null;
  const status = row.deadline === undefined ? classifyDeadline(raw, clock) : row.deadline;
  if (!status) return null;
  return {
    label: deadlineLabel(status, raw, clock.now),
    isOverdue: status.kind === 'overdue' || status.kind === 'overdue-time',
    isDueSoon: isDueSoon(status),
  };
}
