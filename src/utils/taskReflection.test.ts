import assert from 'node:assert/strict';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import type { AppData, QuickNote } from '../types';
import { activateEconomy, commitTask, recordPartialProgress, settlePastDays } from './castleEconomy';
import { formatDateKey } from './gamification';
import { sanitizeAppData } from './storage';
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
  assert.equal(result.notes[0].completedOn, formatDateKey(new Date(4000)));
  assert.equal(result.notes[0].timeSpentSeconds, 14);
  assert(result.notes[0].subtasks?.every(s => s.isDone));
  assert.equal(result.timer, null);
  assert.equal(result.notes[1], future);

  const confirmed = transitionTask([draft, future], timer, draft.id, action, 4000, 25);
  assert.equal(confirmed.completedTask?.actualMinutes, 25, 'every action that finishes a task saves the manually entered time');
  assert.equal(confirmed.completedTask, confirmed.notes[0], 'the saved completion carries the actual time');
  assert.equal(confirmed.notes[0].timeSpentSeconds, 14, 'recorded timer data remains separate');

  const repeatedConfirmation = transitionTask(confirmed.notes, confirmed.timer, draft.id, action, 4000, 30);
  assert.equal(repeatedConfirmation.notes, confirmed.notes, 'confirming a completion twice must preserve the current task');
  const reopened = transitionTask(confirmed.notes, confirmed.timer, draft.id, { kind: 'toggleTask' }, 4000);
  assert.equal(reopened.notes[0].actualMinutes, undefined, 'reopening clears the actual time from the prior completion');
}
const partialDraft = [{ ...draft, partialMinutes: 20 }];
for (const invalid of [19, 20.5, 525601]) {
  const result = transitionTask(partialDraft, timer, draft.id, { kind: 'toggleTask' }, 4000, invalid);
  assert.equal(result.notes, partialDraft, 'invalid completion time must preserve the task');
  assert.equal(result.timer, timer, 'invalid completion time must preserve the timer');
}
const alreadyCounted = transitionTask(partialDraft, timer, draft.id, { kind: 'toggleTask' }, 4000, 20);
assert.equal(alreadyCounted.completedTask?.actualMinutes, 20, 'total time can equal the recorded partial time');
const finished = transitionTask([draft], timer, draft.id, edit, 4000);
const replay = transitionTask(finished.notes, finished.timer, draft.id, edit, 9000);
assert.equal(replay.completedTask, undefined);
assert.equal(replay.notes[0].timeSpentSeconds, 14);
const reopen = transitionTask(replay.notes, null, draft.id, {
  kind: 'edit', fields: { text: 'Reopened', subtasks: [checked, unchecked] },
}, 9000);
assert.equal(reopen.notes[0].isDone, false);
assert.equal(reopen.notes[0].pendingReflection, false);
assert.equal(reopen.notes[0].completedOn, undefined);
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

const questions = Array.from({ length: 5 }, (_, index) => `Question ${index + 1}`);
const answers = questions.map(() => Array(150).fill('work').join(' '));
const backlog = [
  task('overdue-done', '2026-11-09', true, true),
  task('undated-done', undefined, true, true),
  future,
  undated,
  task('legacy-complete', undefined, true),
];
assert.deepEqual(getReflectionTasks(backlog, now), [], 'open backlog still prevents an automatic reflection prompt');
const reviewTasks = taskReflection.getDailyReviewTasks(backlog);
assert.deepEqual(reviewTasks.map(item => item.id), ['overdue-done', 'undated-done'], 'manual review finds work left pending by the automatic trigger');
const reviewResult = taskReflection.applyCompletedTaskReflection({ ...DEFAULT_SEED_DATA, quickNotes: backlog }, now, now, questions, answers, reviewTasks);
assert.deepEqual(reviewResult.quickNotes, backlog.slice(2), 'review leaves unrelated open work and legacy completions in place');
assert.deepEqual(reviewResult.reflections?.at(-1)?.taskTitles, ['overdue-done', 'undated-done']);
assert.equal(taskReflection.applyCompletedTaskReflection(reviewResult, now, now, questions, answers, reviewTasks), reviewResult, 'manual review credit remains idempotent');
const economy = commitTask(commitTask(activateEconomy(5000, '2026-11-10'), {
  id: 'first', title: 'First', date: '2026-11-10', estimatedValueCents: 2000,
}), { id: 'last', title: 'Last', date: '2026-11-10', estimatedValueCents: 2000 });
const first = { ...task('first', undefined, true, true), actualMinutes: 20 };
const last = { ...task('last', '2026-11-12', true, true), actualMinutes: 20 };
const noEstimate = { ...first, actualMinutes: 60 };
const restoredNoEstimate = sanitizeAppData(JSON.parse(JSON.stringify({ ...DEFAULT_SEED_DATA, castleEconomy: economy, quickNotes: [noEstimate] })), false);
const reflectedNoEstimate = taskReflection.applyCompletedTaskReflection(restoredNoEstimate, now, now, questions, answers, [noEstimate]);
assert.equal(reflectedNoEstimate.castleEconomy?.ledger.at(-1)?.amountCents, 0, 'restoring a legacy task with no estimate does not make it eligible');
assert.deepEqual(getReflectionTasks([first, { ...last, isDone: false }, future], now, economy), [], 'waits for the final commitment of the day');
assert.deepEqual(getReflectionTasks([first, last, future], now, economy).map(t => t.id), ['first', 'last'], 'reflects finished commitments even if their deadlines are undated or in the future');
assert.deepEqual(getReflectionTasks([first, last, future], new Date(2026, 10, 11), economy).map(t => t.id), ['first', 'last'], 'an interrupted prior-day batch remains available');
const settledFirst = { ...economy, commitments: economy.commitments.map(item => item.id === 'first' ? { ...item, completed: true } : item) };
assert.deepEqual(getReflectionTasks([last, future], now, settledFirst).map(t => t.id), ['last'], 'an already-registered commitment with no task record does not block the next batch');
assert.deepEqual(getReflectionTasks([task('uncommitted-today', '2026-11-10', true, true)], now, activateEconomy(5000, '2026-11-10')).map(t => t.id), ['uncommitted-today'], 'uncommitted tasks preserve the existing daily reflection flow');

const earningDay = '2026-11-10';
const reflectWork = (estimate: number | undefined, actualMinutes: number, committed = true) => {
  const completed = { ...task('measured', undefined, true, true), durationMinutes: 60, actualMinutes };
  const active = activateEconomy(5000, earningDay);
  const castleEconomy = committed ? commitTask(active, {
    id: completed.id, title: completed.text, date: earningDay, estimatedValueCents: 1500, estimatedMinutes: estimate,
  }) : active;
  const data = { ...DEFAULT_SEED_DATA, castleEconomy, quickNotes: [completed] };
  return taskReflection.applyCompletedTaskReflection(data, now, now, questions, answers, [completed]);
};
for (const [estimate, actual, expected] of [[29, 30, 0], [30, 29, 0], [30, 30, 750], [60, 239, 5975], [60, 240, 6000], [60, 241, 6000], [undefined, 30, 750]] as const) {
  const result = reflectWork(estimate, actual);
  assert.equal(result.castleEconomy?.ledger.reduce((sum, entry) => sum + entry.amountCents, 0), expected, `estimate ${estimate}, actual ${actual}`);
  assert.equal(result.castleEconomy?.commitments[0].completed, true);
  assert.deepEqual(result.quickNotes, []);
}
const normalTask = reflectWork(60, 60, false);
assert.equal(normalTask.castleEconomy?.ledger.reduce((sum, entry) => sum + entry.amountCents, 0), 0, 'uncommitted task earns no dollars');
assert.equal(normalTask.reflections?.length, 1);
assert.ok(normalTask.gamification.currentXp > DEFAULT_SEED_DATA.gamification.currentXp);

const partialTask = { ...task('cumulative'), durationMinutes: 60 };
const partialEconomy = commitTask(activateEconomy(5000, earningDay), { id: partialTask.id, title: partialTask.text, date: earningDay, estimatedValueCents: 1500, estimatedMinutes: 60 });
const partialStart = { ...DEFAULT_SEED_DATA, castleEconomy: partialEconomy, quickNotes: [partialTask] };
let partialWork: AppData = partialStart;
for (const [id, minutes, expected] of [['first-fragment', 29, 0], ['floor', 1, 750], ['cap', 211, 5250], ['above-cap', 10, 0]] as const) {
  const entry = { taskId: partialTask.id, date: earningDay, id, minutes };
  partialWork = taskReflection.applyPartialTaskReflection(partialWork, entry, now, questions, answers);
  assert.equal(partialWork.castleEconomy?.ledger.at(-1)?.amountCents, expected, id);
  assert.equal(taskReflection.applyPartialTaskReflection(partialWork, entry, now, questions, answers), partialWork);
}
assert.equal(partialWork.quickNotes[0].partialMinutes, 251, 'the cap does not truncate reported time');
const partialClosed = settlePastDays(partialWork.castleEconomy!, '2026-11-11');
const partialFinished = { ...partialWork.quickNotes[0], isDone: true, pendingReflection: true, actualMinutes: 270 };
const tomorrow = new Date(2026, 10, 11, 9);
const lateCapped = taskReflection.applyCompletedTaskReflection({ ...partialWork, castleEconomy: partialClosed, quickNotes: [partialFinished] }, now, tomorrow, questions, answers, [{ ...partialFinished, actualMinutes: 251 }]);
assert.equal(lateCapped.castleEconomy?.commitments[0].actualValueCents, 6750, 'registration reads the latest actual minutes, which remain available to replacement coverage');
assert.equal(lateCapped.castleEconomy?.ledger.at(-1)?.amountCents, 0, 'late completion does not pay beyond the cap');

const legacyPartial = recordPartialProgress(partialEconomy, partialTask.id, earningDay, 'historical', 8000);
const legacyClosed = settlePastDays(legacyPartial, '2026-11-11');
const legacyWork = { ...partialStart, castleEconomy: legacyClosed, quickNotes: [{ ...partialTask, partialMinutes: 320 }] };
const latePartialEntry = { taskId: partialTask.id, date: earningDay, id: 'late-partial', minutes: 10 };
const latePartial = taskReflection.applyPartialTaskReflection(legacyWork, latePartialEntry, tomorrow, questions, answers);
assert.equal(latePartial.quickNotes[0].partialMinutes, 330);
assert.deepEqual(latePartial.castleEconomy?.ledger.slice(0, legacyClosed.ledger.length), legacyClosed.ledger);
assert.deepEqual(latePartial.castleEconomy?.ledger.at(-1), {
  id: `earning:progress:${earningDay}:${partialTask.id}:late-partial`, date: '2026-11-11', kind: 'earning', amountCents: 0,
});
assert.equal(taskReflection.applyPartialTaskReflection(latePartial, latePartialEntry, tomorrow, questions, answers), latePartial);

const underFloor = { ...partialTask, isDone: true, pendingReflection: true, actualMinutes: 29 };
const awaitingReflection = { ...partialStart, quickNotes: [underFloor] };
assert.equal(taskReflection.applyCompletedTaskReflection(awaitingReflection, now, now, questions, []), awaitingReflection);
const abandoned = { ...awaitingReflection, quickNotes: resetReflectionTasks(awaitingReflection.quickNotes, now, awaitingReflection.castleEconomy) };
assert.equal(taskReflection.applyCompletedTaskReflection(abandoned, now, now, questions, answers, [underFloor]), abandoned);
const completedBelowFloor = taskReflection.applyCompletedTaskReflection(awaitingReflection, now, now, questions, answers, [underFloor]);
assert.equal(completedBelowFloor.castleEconomy?.commitments[0].completed, true);
assert.equal(taskReflection.applyCompletedTaskReflection(completedBelowFloor, now, tomorrow, questions, answers, [underFloor]), completedBelowFloor);
const threeCommitments = commitTask(economy, { id: 'third', title: 'Third', date: '2026-11-10', estimatedValueCents: 2000 });
const oneFinished = { ...first, actualMinutes: 30, durationMinutes: 30 };
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
const finalData: AppData = { ...DEFAULT_SEED_DATA, castleEconomy: economy, quickNotes: [{ ...first, actualMinutes: 30, durationMinutes: 30 }, { ...last, actualMinutes: 30, durationMinutes: 30 }, future] };
const reflected = taskReflection.applyCompletedTaskReflection(finalData, justBeforeMidnight, justAfterMidnight, questions, answers);
assert.deepEqual(reflected.quickNotes, [future], 'registers the ready batch across midnight without clearing future tasks');
assert.equal(reflected.reflections?.at(-1)?.date, justAfterMidnight.toISOString());
assert.deepEqual(reflected.castleEconomy?.commitments.map(item => item.completed), [true, true]);
assert.deepEqual(reflected.castleEconomy?.ledger.map(item => item.date), ['2026-11-10', '2026-11-10']);
const alreadySettled = { ...finalData, castleEconomy: settlePastDays(economy, '2026-11-11') };
const recovered = taskReflection.applyCompletedTaskReflection(alreadySettled, justBeforeMidnight, justAfterMidnight, questions, answers);
assert.deepEqual(recovered.quickNotes, [future], 'a synced settlement does not drop completed work');
assert.deepEqual(recovered.castleEconomy?.ledger.filter(item => item.kind === 'earning').map(item => item.date), ['2026-11-11', '2026-11-11']);
assert.deepEqual(recovered.castleEconomy?.ledger.slice(0, alreadySettled.castleEconomy.ledger.length), alreadySettled.castleEconomy.ledger);
assert.deepEqual(recovered.castleEconomy?.commitments.map(item => [item.date, item.completed]), [['2026-11-10', true], ['2026-11-10', true]]);
assert.equal(recovered.castleEconomy?.ledger.at(-1)?.amountCents, 750);

const friday = new Date(2026, 10, 13, 9);
const originalCommitment = commitTask(activateEconomy(5000, earningDay), {
  id: partialTask.id, title: partialTask.text, date: earningDay, estimatedValueCents: 1500, estimatedMinutes: 60,
});
const oldClosed = settlePastDays(originalCommitment, '2026-11-13');
const finishedFriday = transitionTask([partialTask], null, partialTask.id, { kind: 'toggleTask' }, friday.getTime()).notes[0];
const fridayData = sanitizeAppData(JSON.parse(JSON.stringify({ ...partialStart, castleEconomy: oldClosed, quickNotes: [{ ...finishedFriday, actualMinutes: 60 }] })), false);
assert.equal(fridayData.quickNotes[0].completedOn, '2026-11-13', 'completion day survives reload');
const reflectedFriday = taskReflection.applyCompletedTaskReflection(fridayData, friday, friday, questions, answers, fridayData.quickNotes);
assert.equal(reflectedFriday.castleEconomy?.commitments[0].completed, false, 'work completed on an uncommitted day does not satisfy an expired commitment');
assert.equal(reflectedFriday.castleEconomy?.ledger.at(-1)?.amountCents, 0);
assert.deepEqual(reflectedFriday.quickNotes, []);
const actuallyLate = { ...fridayData, quickNotes: [{ ...fridayData.quickNotes[0], completedOn: earningDay }] };
const reflectedLate = taskReflection.applyCompletedTaskReflection(actuallyLate, friday, friday, questions, answers, actuallyLate.quickNotes);
assert.equal(reflectedLate.castleEconomy?.commitments[0].completed, true, 'truly late reflection still registers the original work');
assert.equal(reflectedLate.castleEconomy?.ledger.at(-1)?.date, '2026-11-13');
assert.equal(reflectedLate.castleEconomy?.ledger.at(-1)?.amountCents, 1500);
const legacyFriday = { ...fridayData, quickNotes: [{ ...fridayData.quickNotes[0], completedOn: undefined }] };
const reflectedLegacyFriday = taskReflection.applyCompletedTaskReflection(legacyFriday, friday, friday, questions, answers, legacyFriday.quickNotes);
assert.equal(reflectedLegacyFriday.castleEconomy?.commitments[0].completed, false, 'legacy notes cannot claim an arbitrarily old commitment');

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
