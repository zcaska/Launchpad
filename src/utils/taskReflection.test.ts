import assert from 'node:assert/strict';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import type { AppData, QuickNote } from '../types';
import { activateEconomy, commitTask, settlePastDays } from './castleEconomy';
import * as taskReflection from './taskReflection';
const { getReflectionTasks, resetReflectionTasks } = taskReflection;
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
console.log('Single-task, daily-scope, pending-work, replay and reflection reset tests passed.');
const resetTimed = resetReflectionTasks([{ ...done, actualMinutes: 35, partialMinutes: 10 }], now);
assert.equal(resetTimed[0].actualMinutes, undefined, 'cancelled final reflection must ask for a fresh final duration');
assert.equal(resetTimed[0].partialMinutes, 10, 'already reflected partial work remains recorded');

const economy = commitTask(commitTask(activateEconomy(5000, '2026-11-10'), {
  id: 'first', title: 'First', date: '2026-11-10', estimatedValueCents: 2000,
}), { id: 'last', title: 'Last', date: '2026-11-10', estimatedValueCents: 2000 });
const first = { ...task('first', undefined, true, true), actualMinutes: 20 };
const last = { ...task('last', '2026-11-12', true, true), actualMinutes: 20 };
assert.deepEqual(getReflectionTasks([first, { ...last, isDone: false }, future], now, economy), [], 'waits for the final commitment of the day');
assert.deepEqual(getReflectionTasks([first, last, future], now, economy).map(t => t.id), ['first', 'last'], 'reflects finished commitments even if their deadlines are undated or in the future');
assert.deepEqual(getReflectionTasks([first, last, future], new Date(2026, 10, 11), economy).map(t => t.id), ['first', 'last'], 'an interrupted prior-day batch remains available');
const settledFirst = { ...economy, commitments: economy.commitments.map(item => item.id === 'first' ? { ...item, completed: true } : item) };
assert.deepEqual(getReflectionTasks([last, future], now, settledFirst).map(t => t.id), ['last'], 'an already-registered commitment with no task record does not block the next batch');
assert.deepEqual(getReflectionTasks([task('uncommitted-today', '2026-11-10', true, true)], now, activateEconomy(5000, '2026-11-10')).map(t => t.id), ['uncommitted-today'], 'uncommitted tasks preserve the existing daily reflection flow');

const questions = Array.from({ length: 5 }, (_, index) => `Question ${index + 1}`);
const answers = questions.map(() => Array(150).fill('work').join(' '));
const threeCommitments = commitTask(economy, { id: 'third', title: 'Third', date: '2026-11-10', estimatedValueCents: 2000 });
const oneFinished = { ...first, actualMinutes: 20 };
const twoUnfinished = [task('last', '2026-11-12'), task('third')];
assert.deepEqual(getReflectionTasks([oneFinished, ...twoUnfinished], now, threeCommitments), [], 'does not automatically open a partial current-day batch');
assert.deepEqual(taskReflection.getCompletedCommittedReflectionTasks([oneFinished, ...twoUnfinished], now, threeCommitments).map(item => item.id), ['first'], 'explicit reflection offers finished work while other commitments remain unfinished');
const manualPartialDay = taskReflection.applyCompletedTaskReflection({ ...DEFAULT_SEED_DATA, castleEconomy: threeCommitments, quickNotes: [oneFinished, ...twoUnfinished] }, now, now, questions, answers, [oneFinished]);
assert.deepEqual(manualPartialDay.castleEconomy?.commitments.map(item => item.completed), [true, false, false], 'manual reflection registers the finished task and leaves unfinished commitments for settlement');
assert.deepEqual(getReflectionTasks([oneFinished, ...twoUnfinished], new Date(2026, 10, 11), threeCommitments).map(item => item.id), ['first'], 'prior-day finished work remains recoverable when other commitments missed');
const recoveredBeforeSettlement = taskReflection.applyCompletedTaskReflection({ ...DEFAULT_SEED_DATA, castleEconomy: threeCommitments, quickNotes: [oneFinished, ...twoUnfinished] }, new Date(2026, 10, 11), new Date(2026, 10, 11, 9), questions, answers);
assert.deepEqual(recoveredBeforeSettlement.castleEconomy?.ledger.filter(item => item.kind === 'earning').map(item => item.date), ['2026-11-10'], 'prior-day reflection credits the original commitment date before offline settlement');
const justBeforeMidnight = new Date(2026, 10, 10, 23, 59, 59);
const justAfterMidnight = new Date(2026, 10, 11, 0, 0, 1);
const finalData: AppData = { ...DEFAULT_SEED_DATA, castleEconomy: economy, quickNotes: [first, last, future] };
const reflected = taskReflection.applyCompletedTaskReflection(finalData, justBeforeMidnight, justAfterMidnight, questions, answers);
assert.deepEqual(reflected.quickNotes, [future], 'registers the ready batch across midnight without clearing future tasks');
assert.equal(reflected.reflections?.at(-1)?.date, justAfterMidnight.toISOString());
assert.deepEqual(reflected.castleEconomy?.commitments.map(item => item.completed), [true, true]);
assert.deepEqual(reflected.castleEconomy?.ledger.map(item => item.date), ['2026-11-10', '2026-11-10']);
const alreadySettled = { ...finalData, castleEconomy: settlePastDays(economy, '2026-11-11') };
const recovered = taskReflection.applyCompletedTaskReflection(alreadySettled, justBeforeMidnight, justAfterMidnight, questions, answers);
assert.deepEqual(recovered.quickNotes, [future], 'a synced settlement does not drop completed work');
assert.deepEqual(recovered.castleEconomy?.ledger.filter(item => item.kind === 'earning').map(item => item.date), ['2026-11-11', '2026-11-11']);

const mixedEconomy = commitTask(commitTask(activateEconomy(5000, '2026-11-10'), {
  id: 'old', title: 'Old', date: '2026-11-10', estimatedValueCents: 1000,
}), { id: 'new', title: 'New', date: '2026-11-11', estimatedValueCents: 1000 });
const mixedTasks = [{ ...task('old', undefined, true, true), actualMinutes: 60 }, { ...task('new', undefined, true, true), actualMinutes: 60 }];
const mixedData: AppData = { ...DEFAULT_SEED_DATA, castleEconomy: mixedEconomy, quickNotes: mixedTasks };
const mixed = taskReflection.applyCompletedTaskReflection(mixedData, justAfterMidnight, justAfterMidnight, questions, answers, mixedTasks);
assert.deepEqual(mixed.castleEconomy?.commitments.map(item => item.completed), [true, true], 'mixed-day reflection completes each task on its own commitment day');
assert.deepEqual(mixed.castleEconomy?.ledger.filter(item => item.kind === 'earning').map(item => item.date), ['2026-11-10', '2026-11-11']);
const mixedSettled = settlePastDays(mixed.castleEconomy!, '2026-11-12');
assert.equal(mixedSettled.ledger.filter(item => item.kind === 'missed-commitment').length, 0, 'neither reflected commitment is penalized');
assert.equal(taskReflection.applyCompletedTaskReflection(mixed, justAfterMidnight, justAfterMidnight, questions, answers, mixedTasks), mixed, 'replaying a batch does not duplicate rewards');

const aheadOfClockData: AppData = { ...finalData, castleEconomy: settlePastDays(economy, '2026-11-12') };
assert.equal(taskReflection.canRegisterReflectionTasks(aheadOfClockData.castleEconomy!, [first, last], justBeforeMidnight, justAfterMidnight), false);
assert.equal(taskReflection.applyCompletedTaskReflection(aheadOfClockData, justBeforeMidnight, justAfterMidnight, questions, answers), aheadOfClockData, 'a settled submission day leaves tasks and reflection untouched until an open day is available');
const nextOpenDay = new Date(2026, 10, 12, 9);
assert.equal(taskReflection.canRegisterReflectionTasks(aheadOfClockData.castleEconomy!, [first, last], justBeforeMidnight, nextOpenDay), true);
const laterReflection = taskReflection.applyCompletedTaskReflection(aheadOfClockData, justBeforeMidnight, nextOpenDay, questions, answers);
assert.deepEqual(laterReflection.castleEconomy?.ledger.filter(item => item.kind === 'earning').map(item => item.date), ['2026-11-12', '2026-11-12']);

const partialData: AppData = { ...finalData, quickNotes: [task('first'), future] };
const partialEntry = { taskId: 'first', date: '2026-11-10', id: 'partial-1', minutes: 10 };
const partial = taskReflection.applyPartialTaskReflection(partialData, partialEntry, justAfterMidnight, questions, answers);
assert.equal(partial.quickNotes[0].partialMinutes, 10);
assert.equal(partial.quickNotes[0].isDone, false);
assert.equal(partial.castleEconomy?.ledger[0].date, '2026-11-10');
assert.equal(partial.reflections?.at(-1)?.taskTitles[0], 'first');
assert.equal(taskReflection.applyPartialTaskReflection(partial, partialEntry, justAfterMidnight, questions, answers), partial, 'replaying an accepted partial reflection leaves time, journal, and earnings unchanged');
assert.throws(() => taskReflection.applyPartialTaskReflection({ ...partialData, quickNotes: [{ ...partialData.quickNotes[0], partialMinutes: 525599 }] }, partialEntry, now, questions, answers), /remaining/i, 'cannot record partial time beyond the supported final total');
