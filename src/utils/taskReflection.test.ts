import assert from 'node:assert/strict';
import type { QuickNote } from '../types';
import { getReflectionTasks, resetReflectionTasks } from './taskReflection';
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
console.log('Single-task, daily-scope, pending-work, replay and reflection reset tests passed.');
