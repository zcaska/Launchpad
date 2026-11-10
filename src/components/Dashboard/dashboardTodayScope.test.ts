import type { QuickNote } from '../../types';
import { tasksDueToday } from '../../utils/taskPeriod';
import { calculateTaskUrgency } from '../../utils/taskUrgency';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('=== Running dashboardTodayScope.test.ts ===\n');

// Fixed "today" reference: Tuesday, Nov 10, 2026, 12:00 local
const now = new Date(2026, 10, 10, 12, 0, 0);

const todayTask: QuickNote = {
  id: 'today-task',
  text: 'Due today (date)',
  isDone: false,
  createdAt: now.getTime(),
  deadline: '2026-11-10', // today
  durationMinutes: 60,
  priority: 'high',
};

const todayTimeOnlyTask: QuickNote = {
  id: 'today-time-only',
  text: 'HH:MM today',
  isDone: false,
  createdAt: now.getTime(),
  deadline: '14:30', // time-only = today at 14:30
  durationMinutes: 30,
  priority: 'medium',
};

const todayDoneTask: QuickNote = {
  id: 'today-done',
  text: 'Done today',
  isDone: true,
  createdAt: now.getTime(),
  deadline: '2026-11-10',
  durationMinutes: 30,
  priority: 'low',
};

const overdueTask: QuickNote = {
  id: 'overdue-task',
  text: 'Overdue yesterday',
  isDone: false,
  createdAt: now.getTime(),
  deadline: '2026-11-09', // yesterday
  durationMinutes: 30,
  priority: 'high',
};

const futureTask: QuickNote = {
  id: 'future-task',
  text: 'Due tomorrow',
  isDone: false,
  createdAt: now.getTime(),
  deadline: '2026-11-11', // tomorrow
  durationMinutes: 30,
  priority: 'urgent',
};

const undatedTask: QuickNote = {
  id: 'undated-task',
  text: 'No deadline',
  isDone: false,
  createdAt: now.getTime(),
  durationMinutes: 30,
  priority: 'medium',
};

const invalidTask: QuickNote = {
  id: 'invalid-task',
  text: 'Invalid deadline',
  isDone: false,
  createdAt: now.getTime(),
  deadline: 'someday',
  durationMinutes: 30,
  priority: 'low',
};

const allNotes: QuickNote[] = [
  todayTask,
  todayTimeOnlyTask,
  todayDoneTask,
  overdueTask,
  futureTask,
  undatedTask,
  invalidTask,
];

// 1. tasksDueToday returns only today's tasks (incl. done, incl. time-only)
console.log('--- tasksDueToday filtering ---');
const dueToday = tasksDueToday(allNotes, now);
const dueTodayIds = dueToday.map((t) => t.id).sort();
assertEqual(
  dueTodayIds.join(','),
  ['today-done', 'today-task', 'today-time-only'].sort().join(','),
  'Returns exactly today-done, today-task, today-time-only'
);

// 2. Excludes overdue from prior days
assert(!dueToday.some((t) => t.id === 'overdue-task'), 'Excludes overdue from prior days');

// 3. Excludes future-date tasks
assert(!dueToday.some((t) => t.id === 'future-task'), 'Excludes future-date tasks');

// 4. Excludes undated tasks
assert(!dueToday.some((t) => t.id === 'undated-task'), 'Excludes undated tasks');

// 5. Excludes invalid deadline tasks
assert(!dueToday.some((t) => t.id === 'invalid-task'), 'Excludes invalid deadline tasks');

// 6. Includes done tasks
assert(dueToday.some((t) => t.id === 'today-done' && t.isDone), 'Includes done tasks');

// 7. HH:MM-only deadline counts as today
assert(dueToday.some((t) => t.id === 'today-time-only'), 'HH:MM-only deadline counts as today');

// 8. Today-scoped selection: future task selectedTaskId does not leak
console.log('\n--- Today-scoped task selection ---');
const todayPending = dueToday.filter((t) => !t.isDone);
assertEqual(todayPending.length, 2, 'Today pending count is 2 (excludes done today-done)');

// selectedTaskId pointing to a future task must not leak into today's pending list
const activeTask = todayPending.find((t) => t.id === 'future-task') ?? todayPending[0];
assertEqual(activeTask?.id, 'today-task', 'Future-task selectedTaskId does not leak; falls back to today task');

// 9. Empty state: no today tasks => no active task
console.log('\n--- Empty state ---');
const emptyNotes: QuickNote[] = [overdueTask, futureTask, undatedTask, invalidTask];
const emptyToday = tasksDueToday(emptyNotes, now);
assertEqual(emptyToday.length, 0, 'No tasks due today when only overdue/future/undated/invalid exist');
const emptyActive = emptyToday.filter((t) => !t.isDone).find((t) => t.id === 'future-task');
assertEqual(emptyActive, undefined, 'No active task when dashboard is empty (Clear Runway)');

// 10. Task urgency classification for today-scoped tasks
console.log('\n--- Urgency classification ---');
const todayUrgency = calculateTaskUrgency(todayTask.deadline, now);
assert(todayUrgency.isDueToday, 'Today task is classified as dueToday');
const overdueUrgency = calculateTaskUrgency(overdueTask.deadline, now);
assert(overdueUrgency.tier === 'overdue', 'Prior-day deadline is overdue');
const futureUrgency = calculateTaskUrgency(futureTask.deadline, now);
assert(
  futureUrgency.tier !== 'overdue' && futureUrgency.tier !== 'due_soon',
  'Future task is not due today or overdue'
);

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL DASHBOARD TODAY-SCOPE TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
