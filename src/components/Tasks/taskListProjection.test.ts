import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { QuickNote } from '../../types';
import { defaultPeriodRange, tasksInPeriod } from '../../utils/taskPeriod';
import { projectTaskList, selectTaskRows, taskDeadlineBadge, taskFilterTabs, taskTabCount, type FilterTab } from './taskListProjection';
import { TaskManagementScreen } from './TaskManagementScreen';
import { useTaskView } from './useTaskView';

process.env.TZ = 'America/New_York';

const schedule = { startHour: 9, endHour: 17 };
const task = (id: string, deadline?: string, fields: Partial<QuickNote> = {}): QuickNote => ({
  id, text: id, isDone: false, createdAt: 0, deadline, ...fields,
});

function TaskScreenFixture({ tasks, now }: { tasks: QuickNote[]; now: Date }) {
  const view = useTaskView(tasks, now, schedule);
  const noop = () => {};
  return createElement(TaskManagementScreen, {
    notes: tasks, view, now, createTaskRequested: false, onCreateTaskOpened: noop,
    searchQuery: '', onSearchChange: noop, onUpdateNotes: noop, onViewTask: noop, onTaskAction: noop,
  });
}

// The card and Due Soon badge both follow App's clock, even if system time differs.
const markup = renderToStaticMarkup(createElement(TaskScreenFixture, {
  tasks: [task('timed task', '2000-11-10 16:00')],
  now: new Date(2000, 10, 10, 12),
}));
assert.ok(/>Due today /.test(markup), 'The task card uses App time');
assert.match(markup, /Due Soon \(1\)/);

const now = new Date(2026, 10, 10, 12);
const mixedTasks = [
  task('done-low', '2026-11-10', { priority: 'low', isDone: true }),
  task('today', '2026-11-10', { priority: 'medium' }),
  task('minutes', '14:00'),
  task('within-48h', '2026-11-12T12:00', { priority: 'urgent' }),
  task('past-48h', '2026-11-12 12:01', { priority: 'low' }),
  task('at-time', '14:01', { priority: 'high' }),
  task('overdue-time', '11:59', { priority: 'medium' }),
  task('yesterday', '2026-11-09 23:00', { priority: 'urgent' }),
  task('tomorrow', '2026-11-11T10:15', { priority: 'high' }),
  task('legacy', '11/10/2026'),
  task('done-urgent', '2026-11-11', { priority: 'urgent', isDone: true }),
  task('invalid-text', 'some day'),
  task('invalid-date', '2026-02-30'),
  task('invalid-time', '25:00'),
  task('no-deadline'),
];

type Projection = ReturnType<typeof projectTaskList>;

function rowIds(projection: Projection, tab: FilterTab, query = '') {
  const { pending, completed } = selectTaskRows(projection, tab, query);
  return [...pending, ...completed].map(({ task }) => task.id);
}

function badgeFor(projection: Projection, id: string) {
  const { pending, completed } = selectTaskRows(projection, 'All', '');
  const row = [...pending, ...completed].find(({ task }) => task.id === id);
  assert.ok(row, `Expected a row for ${id}`);
  return taskDeadlineBadge(row, projection.clock);
}

const mixed = projectTaskList(mixedTasks, now);
assert.deepEqual(rowIds(mixed, 'All'), [
  'within-48h', 'yesterday', 'at-time', 'tomorrow', 'today', 'minutes', 'overdue-time',
  'legacy', 'invalid-text', 'invalid-date', 'invalid-time', 'no-deadline', 'past-48h',
  'done-low', 'done-urgent',
]);
assert.deepEqual(rowIds(mixed, 'Due Soon'), [
  'within-48h', 'yesterday', 'at-time', 'tomorrow', 'today', 'minutes', 'overdue-time', 'legacy',
]);
assert.deepEqual(rowIds(mixed, 'Medium'), ['today', 'overdue-time'], 'Missing priorities sort with Medium without joining its tab');
assert.deepEqual(rowIds(mixed, 'Completed'), ['done-low', 'done-urgent'], 'Completed keeps source order');

for (const tab of taskFilterTabs) {
  assert.equal(taskTabCount(mixed, tab), rowIds(mixed, tab).length, `${tab} badge agrees with unsearched rows`);
}

assert.equal(badgeFor(mixed, 'today')?.label, 'Due today');
assert.equal(badgeFor(mixed, 'minutes')?.label, 'Due in 120m');
assert.equal(badgeFor(mixed, 'at-time')?.label, 'Due at 14:01');
assert.equal(badgeFor(mixed, 'overdue-time')?.label, 'Overdue (11:59)');
assert.match(badgeFor(mixed, 'tomorrow')?.label ?? '', /^Tomorrow /);
assert.match(badgeFor(mixed, 'within-48h')?.label ?? '', /^Due soon \(/);
assert.equal(badgeFor(mixed, 'past-48h')?.isDueSoon, false);
assert.deepEqual(badgeFor(mixed, 'invalid-date'), { label: '2026-02-30', isOverdue: false, isDueSoon: false });
assert.deepEqual(badgeFor(mixed, 'invalid-time'), { label: '25:00', isOverdue: false, isDueSoon: false });
assert.equal(badgeFor(mixed, 'invalid-text')?.label, 'some day');
assert.equal(badgeFor(mixed, 'no-deadline'), null);

const matches = projectTaskList([
  task('subtask', '2026-11-10', { priority: 'high', subtasks: [{ id: 's', text: 'Write NEEDLE', isDone: false }] }),
  task('url', '2026-11-10', { priority: 'urgent', attachedUrls: [{ id: 'link', url: 'https://example.test/needle', title: 'Source' }] }),
  task('description', '2026-11-10', { priority: 'high', description: 'Check Needle' }),
  task('url-title', '2026-11-10', { priority: 'medium', attachedUrls: [{ id: 'link-title', url: 'https://example.test/', title: 'NEEDLE' }] }),
  task('title', '2026-11-10', { text: 'Find Needle', isDone: true }),
  task('nonmatching', '2026-11-10', { priority: 'urgent' }),
], now);
assert.deepEqual(rowIds(matches, 'All', 'NeEdLe'), ['url', 'subtask', 'description', 'url-title', 'title']);
assert.deepEqual(rowIds(matches, 'Urgent', 'NeEdLe'), ['url']);
assert.equal(taskTabCount(matches, 'Urgent'), 2, 'Tab counts include the entire period during search');
assert.equal(taskTabCount(matches, 'All'), 6);
assert.deepEqual(rowIds(matches, 'Urgent', '  '), ['url', 'nonmatching']);

const customRange = { start: new Date(2026, 10, 11), end: new Date(2026, 10, 13) };
const scoped = projectTaskList(tasksInPeriod(mixedTasks, 'Weekly', now, customRange), now);
assert.deepEqual(rowIds(scoped, 'All'), ['within-48h', 'tomorrow', 'past-48h', 'done-urgent']);
assert.equal(taskTabCount(scoped, 'Due Soon'), 2, 'The 48-hour filter stays inside the selected range');
const exclusiveBoundary = task('end-exclusive', '2026-11-13 00:00');
assert.deepEqual(tasksInPeriod([exclusiveBoundary], 'Weekly', now, customRange), []);
const undated = projectTaskList(tasksInPeriod(mixedTasks, 'Undated', now, customRange), now);
assert.deepEqual(rowIds(undated, 'All'), ['invalid-text', 'invalid-date', 'invalid-time', 'no-deadline']);
assert.equal(taskTabCount(undated, 'Due Soon'), 0);

const legacyNow = new Date(2026, 10, 21, 8);
const legacyRange = defaultPeriodRange('Today', legacyNow);
const legacyDateTimes = [
  task('rfc-date-time', 'Sat, 21 Nov 2026 18:30:00 GMT'),
  task('slash-date-time', '11/21/2026 18:30'),
  task('outside-range', '2026-11-24'),
  task('unparsed', 'some day'),
];
for (const period of ['All time', 'Today'] as const) {
  const legacyProjection = projectTaskList(tasksInPeriod(legacyDateTimes, period, legacyNow, legacyRange), legacyNow);
  assert.deepEqual(rowIds(legacyProjection, 'Due Soon'), ['rfc-date-time', 'slash-date-time'], period);
  assert.equal(taskTabCount(legacyProjection, 'Due Soon'), 2, period);
  const timeLabel = (hour: number) => new Date(2026, 10, 21, hour, 30).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
  assert.equal(badgeFor(legacyProjection, 'rfc-date-time')?.label, `Due today ${timeLabel(13)}`);
  assert.equal(badgeFor(legacyProjection, 'slash-date-time')?.label, `Due today ${timeLabel(18)}`);
}
assert.deepEqual(tasksInPeriod(legacyDateTimes, 'Undated', legacyNow, legacyRange).map(({ id }) => id), ['unparsed']);

const rolloverNotes = [
  task('time-only', '00:00'),
  task('utc-timestamp', '2026-11-11T04:55:00Z'), // Nov 10 at 23:55 in New York.
  task('offset-timestamp', '2026-11-11T10:25:00+05:30'),
  task('next-local-day', '2026-11-11'),
];
const beforeMidnight = new Date(2026, 10, 10, 23, 50);
const afterMidnight = new Date(2026, 10, 11, 0, 0, 10);
const before = projectTaskList(
  tasksInPeriod(rolloverNotes, 'Today', beforeMidnight, defaultPeriodRange('Today', beforeMidnight)),
  beforeMidnight,
);
const after = projectTaskList(
  tasksInPeriod(rolloverNotes, 'Today', afterMidnight, defaultPeriodRange('Today', afterMidnight)),
  afterMidnight,
);
assert.deepEqual(rowIds(before, 'Due Soon'), ['time-only', 'utc-timestamp', 'offset-timestamp']);
assert.match(badgeFor(before, 'utc-timestamp')?.label ?? '', /^Due today /, 'Timestamp label uses the same local day as period membership');
assert.equal(badgeFor(before, 'offset-timestamp')?.label, badgeFor(before, 'utc-timestamp')?.label);
assert.equal(badgeFor(before, 'time-only')?.label, 'Overdue (00:00)');
assert.deepEqual(rowIds(after, 'Due Soon'), ['time-only', 'next-local-day']);
assert.equal(badgeFor(after, 'time-only')?.label, 'Due in 0m');
assert.equal(badgeFor(after, 'next-local-day')?.label, 'Due today');

// A time-only parse sets the due time once. Rendering and switching filters reuse it.
const timeOnlyFixture = Array.from({ length: 12 }, (_, index) => task(`time-${index}`, '14:00'));
const originalSetHours = Date.prototype.setHours;
const originalLocaleTime = Date.prototype.toLocaleTimeString;
let timeParses = 0;
let formattedTimes = 0;
Date.prototype.setHours = function (this: Date, ...args: Parameters<Date['setHours']>) {
  timeParses += 1;
  return originalSetHours.apply(this, args);
};
Date.prototype.toLocaleTimeString = function (this: Date, ...args: Parameters<Date['toLocaleTimeString']>) {
  formattedTimes += 1;
  return originalLocaleTime.apply(this, args);
};
try {
  const fixture = projectTaskList([...timeOnlyFixture, task('hidden', '2026-11-10T13:00', { isDone: true })], now);
  assert.equal(taskTabCount(fixture, 'Due Soon'), 12);
  const { pending } = selectTaskRows(fixture, 'Due Soon', '');
  for (const row of pending) taskDeadlineBadge(row, fixture.clock);
  assert.equal(timeParses, 12);
  assert.equal(formattedTimes, 0, 'No locale formatting for the hidden completed task');
  assert.deepEqual(rowIds(fixture, 'Due Soon', 'time-11'), ['time-11']);
  assert.equal(timeParses, 12, 'Searching and selecting tabs never reclassifies pending deadlines');
} finally {
  Date.prototype.setHours = originalSetHours;
  Date.prototype.toLocaleTimeString = originalLocaleTime;
}

console.log('Task list projection tests passed');
