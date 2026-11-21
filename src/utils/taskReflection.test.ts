import assert from 'node:assert/strict';
import type { QuickNote } from '../types';
import { getReflectionTasks, resetReflectionTasks } from './taskReflection';
import { transitionTask, type TaskAction } from './taskCompletion';

const now = new Date(2026, 10, 10, 12);
const task = (id: string, deadline?: string, isDone = false, pendingReflection = false): QuickNote => ({
  id, text: id, deadline, isDone, pendingReflection, createdAt: 0,
});
const done = task('today', '2026-11-10', true, true);
const future = task('future', '2026-11-12');
const undated = task('undated');
assert.deepEqual(getReflectionTasks([done], now).map(t => t.id), ['today']);
assert.deepEqual(getReflectionTasks([done, future, undated], now).map(t => t.id), ['today']);
assert.deepEqual(getReflectionTasks([done, task('today-pending', '15:00')], now), []);
assert.deepEqual(getReflectionTasks([task('already-rewarded', '2026-11-10', true)], now), []);
assert.deepEqual(getReflectionTasks([task('undated-done', undefined, true, true)], now).map(t => t.id), ['undated-done']);
assert.deepEqual(getReflectionTasks([], now), []);
const reset = resetReflectionTasks([done, future, undated], now);
assert.equal(reset[0].isDone, false);
assert.equal(reset[0].pendingReflection, false);
assert.equal(reset[1], future, 'Future task record is preserved');
assert.equal(reset[2], undated, 'Unscheduled task record is preserved');
assert.equal(getReflectionTasks(reset, now).length, 0, 'Cancel does not reopen the same reflection');

const checked = { id: 'checked', text: 'Read', isDone: true };
const unchecked = { id: 'unchecked', text: 'Write', isDone: false };
const draft = { ...task('draft'), subtasks: [checked, unchecked], timeSpentSeconds: 10 };
const timer = { taskId: draft.id, running: true, startedAt: 1000, baseSeconds: 1 };
const edit: TaskAction = { kind: 'edit', fields: { text: 'Revised', subtasks: [checked] } };
const actions: TaskAction[] = [edit, { kind: 'toggleTask' }, { kind: 'toggleSubtask', subtaskId: unchecked.id }];
for (const action of actions) {
  const result = transitionTask([draft, future], timer, draft.id, action, 4000);
  assert.equal(result.completedTask, result.notes[0]);
  assert.equal(result.notes[0].isDone, true);
  assert.equal(result.notes[0].pendingReflection, true);
  assert.equal(result.notes[0].timeSpentSeconds, 14);
  assert(result.notes[0].subtasks?.every(s => s.isDone));
  assert.equal(result.timer, null);
  assert.equal(result.notes[1], future);
}
const finished = transitionTask([draft], timer, draft.id, edit, 4000);
const replay = transitionTask(finished.notes, finished.timer, draft.id, edit, 9000);
assert.equal(replay.completedTask, undefined);
assert.equal(replay.notes[0].timeSpentSeconds, 14);
const reopen = transitionTask(replay.notes, null, draft.id, {
  kind: 'edit', fields: { text: 'Reopened', subtasks: [checked, unchecked] },
}, 9000);
assert.equal(reopen.notes[0].isDone, false);
assert.equal(reopen.notes[0].pendingReflection, false);
const canceled = resetReflectionTasks(finished.notes, now);
const afterCancel = transitionTask(canceled, null, draft.id, edit, 9000);
assert.equal(afterCancel.notes[0].isDone, false, 'An editor opened before reset cannot replay checked state');
const otherTimer = { ...timer, taskId: 'other' };
const other = transitionTask([draft], otherTimer, draft.id, edit, 4000);
assert.equal(other.timer, otherTimer);
assert.equal(other.notes[0].timeSpentSeconds, 10);
const legacy = { ...done, pendingReflection: undefined };
assert.equal(transitionTask([legacy], null, legacy.id, { kind: 'edit', fields: { text: 'Legacy' } }, 0).notes[0].pendingReflection, undefined);

const legacyEdit: TaskAction = { kind: 'edit', fields: { text: 'Legacy' } };
const rewarded = { ...legacy, rewardAlreadyGranted: true };
assert.equal(transitionTask([rewarded], null, rewarded.id, legacyEdit, 0).notes[0].rewardAlreadyGranted, true);
const zeroTime = { ...timer, running: false, baseSeconds: 0 };
assert.equal(transitionTask([draft], zeroTime, draft.id, edit, 0).timer, null);
console.log('Task completion, timer banking, daily reflection scope, replay and reset tests passed.');
