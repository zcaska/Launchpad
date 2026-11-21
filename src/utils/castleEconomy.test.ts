import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activateEconomy, settlePastDays, balanceCents, useExemption, changeDailyGoal, recordEarning, commitTask, completeCommitment, taskValueCents, recordPartialProgress, substituteCommitment, purchaseAsset, netWorthCents, offerMission, claimMission, registerReflectedTasks, validateCastleEconomy } from './castleEconomy';

const initial = activateEconomy(5000, '2026-11-10');
assert.equal(balanceCents(initial), 0, 'activation never charges historic days');
const returned = settlePastDays(initial, '2026-11-13');
assert.equal(balanceCents(returned), -15000, 'each missed day since activation incurs its shortfall');
assert.equal(balanceCents(settlePastDays(returned, '2026-11-13')), -15000, 'repeated settlement cannot double-charge');
console.log('Castle economy activation and offline settlement tests passed.');

// A month's exemptions apply only on the day selected, and skip that day's penalty.
let exempt = activateEconomy(5000, '2026-11-28');
exempt = useExemption(exempt, '2026-11-28', '2026-11-28');
exempt = useExemption(exempt, '2026-11-29', '2026-11-29');
exempt = useExemption(exempt, '2026-11-30', '2026-11-30');
assert.throws(() => useExemption(exempt, '2026-11-30', '2026-11-30'), /already exempt/i);
assert.throws(() => useExemption(exempt, '2026-11-27', '2026-11-30'), /current/i);
assert.equal(balanceCents(settlePastDays(exempt, '2026-12-01')), 0);
assert.doesNotThrow(() => useExemption(exempt, '2026-12-01', '2026-12-01'), 'allowance resets in a new calendar month');
let noMore = activateEconomy(5000, '2026-11-01');
for (const day of ['2026-11-01', '2026-11-02', '2026-11-03']) noMore = useExemption(noMore, day, day);
assert.throws(() => useExemption(noMore, '2026-11-04', '2026-11-04'), /exemption/i);




// A goal change applies tomorrow, and earned dollars reduce only that day's shortfall.
let goals = activateEconomy(5000, '2026-11-10');
goals = changeDailyGoal(goals, 3000, '2026-11-10');
goals = recordEarning(goals, 'task:a', '2026-11-10', 2000);
goals = recordEarning(goals, 'task:a', '2026-11-10', 2000);
goals = settlePastDays(goals, '2026-11-12');
assert.equal(balanceCents(goals), -4000, 'one $20 earning, $30 old-goal shortfall and $30 new-goal shortfall');
assert.equal(goals.ledger.filter(entry => entry.id === 'earning:task:a').length, 1, 'replayed earnings are idempotent');


// A committed task is assessed even if the original task later disappears.
let commitments = activateEconomy(5000, '2026-11-10');
commitments = commitTask(commitments, { id: 'task-1', title: 'Draft', date: '2026-11-10', estimatedValueCents: 2000 });
commitments = settlePastDays(commitments, '2026-11-11');
assert.equal(balanceCents(commitments), -7000, 'missed task penalty is separate from the daily shortfall');
assert.equal(balanceCents(settlePastDays(commitments, '2026-11-12')), -12000, 'a past task penalty is never repeated');
let completed = activateEconomy(5000, '2026-11-10');
completed = commitTask(completed, { id: 'task-1', title: 'Draft', date: '2026-11-10', estimatedValueCents: 2000 });
completed = completeCommitment(completed, 'task-1', '2026-11-10', 2500);
completed = completeCommitment(completed, 'task-1', '2026-11-10', 2500);
completed = settlePastDays(completed, '2026-11-11');
assert.equal(balanceCents(completed), 0, 'completed commitment earns actual value and avoids task penalty');
assert.throws(() => completeCommitment(commitments, 'task-1', '2026-11-10', 2500), /settled/i);


// Exempt days must still close, so their past state cannot be edited later.
let closedExempt = activateEconomy(5000, '2026-11-10');
closedExempt = useExemption(closedExempt, '2026-11-10', '2026-11-10');
closedExempt = settlePastDays(closedExempt, '2026-11-11');
assert.throws(() => recordEarning(closedExempt, 'late', '2026-11-10', 1000), /settled/i);
assert.throws(() => commitTask(closedExempt, { id: 'late', title: 'Late', date: '2026-11-10', estimatedValueCents: 1000 }), /settled/i);
assert.equal(balanceCents(closedExempt), 0, 'closing an exempt day does not deduct cash');

// Time and priority affect the dollar value; a task due today gets an urgency premium.
assert.equal(taskValueCents(60, 'low', '2026-11-10', '2026-11-10'), 1250);
assert.equal(taskValueCents(120, 'high', '2026-11-10', '2026-11-10'), 5000);
assert.equal(taskValueCents(60, 'low', '2026-11-11', '2026-11-10'), 1000);
assert.throws(() => taskValueCents(0, 'low', undefined, '2026-11-10'));


// Partial progress earns once but the unfinished commitment still has its penalty.
let partial = activateEconomy(5000, '2026-11-10');
partial = commitTask(partial, { id: 'b', title: 'Research', date: '2026-11-10', estimatedValueCents: 2000 });
partial = recordPartialProgress(partial, 'b', '2026-11-10', 'log-1', 1000);
partial = recordPartialProgress(partial, 'b', '2026-11-10', 'log-1', 1000);
partial = settlePastDays(partial, '2026-11-11');
assert.equal(balanceCents(partial), -5000, 'partial earning, shortfall and unfinished-task penalty are each counted once');


let excusedCommitment = activateEconomy(5000, '2026-11-10');
excusedCommitment = commitTask(excusedCommitment, { id: 'c', title: 'Task', date: '2026-11-10', estimatedValueCents: 2000 });
excusedCommitment = useExemption(excusedCommitment, '2026-11-10', '2026-11-10');
excusedCommitment = settlePastDays(excusedCommitment, '2026-11-11');
assert.equal(balanceCents(excusedCommitment), 0, 'exemption waives both goal and missed task penalties');
assert.throws(() => activateEconomy(1000, '2026-02-30'), /date/i);
assert.throws(() => recordEarning(activateEconomy(1000, '2026-11-10'), 'a', '2026-11-10', Infinity), /invalid/i);

// Replacements must preserve value initially and actual completed work must cover it.
let swap = activateEconomy(1000, '2026-11-10');
swap = commitTask(swap, { id: 'original', title: 'Original', date: '2026-11-10', estimatedValueCents: 2000 });
assert.throws(() => substituteCommitment(swap, 'original', '2026-11-10', [{ id: 'small', title: 'Small', date: '2026-11-10', estimatedValueCents: 1000 }]), /value/i);
swap = substituteCommitment(swap, 'original', '2026-11-10', [
  { id: 'r1', title: 'First', date: '2026-11-10', estimatedValueCents: 1000 },
  { id: 'r2', title: 'Second', date: '2026-11-10', estimatedValueCents: 1000 },
]);
swap = completeCommitment(swap, 'r1', '2026-11-10', 500);
swap = completeCommitment(swap, 'r2', '2026-11-10', 1000);
swap = settlePastDays(swap, '2026-11-11');
assert.equal(balanceCents(swap), 1000, 'earned $15 less $5 uncovered replacement obligation');
assert.equal(balanceCents(settlePastDays(swap, '2026-11-11')), 1000, 'replacement settlement is idempotent');
let missingSwap = activateEconomy(1000, '2026-11-10');
missingSwap = commitTask(missingSwap, { id: 'original', title: 'Original', date: '2026-11-10', estimatedValueCents: 2000 });
missingSwap = substituteCommitment(missingSwap, 'original', '2026-11-10', [{ id: 'r1', title: 'Replacement', date: '2026-11-10', estimatedValueCents: 2000 }]);
missingSwap = settlePastDays(missingSwap, '2026-11-11');
assert.equal(balanceCents(missingSwap), -3000, 'missing replacement is charged once plus the goal shortfall');


// Purchasing an asset transfers money into castle value and never destroys owned work.
let castle = activateEconomy(1000, '2026-11-10');
castle = recordEarning(castle, 'seed-work', '2026-11-10', 3000);
castle = purchaseAsset(castle, { id: 'foundation', label: 'Foundation', priceCents: 2000 }, '2026-11-10');
assert.equal(balanceCents(castle), 1000);
assert.equal(netWorthCents(castle), 3000, 'purchase transfers value into the castle');
assert.equal(purchaseAsset(castle, { id: 'foundation', label: 'Foundation', priceCents: 2000 }, '2026-11-10'), castle, 'replay never charges twice');
const orphanedPurchase = validateCastleEconomy({ ...recordEarning(castle, 'extra-work', '2026-11-10', 3000), assets: [] });
assert.throws(() => purchaseAsset(orphanedPurchase, { id: 'foundation', label: 'Foundation', priceCents: 2000 }, '2026-11-10'), /purchase.*record/i, 'an existing purchase record without ownership must not be charged again');
assert.equal(orphanedPurchase.ledger.filter(entry => entry.id === 'asset:foundation').length, 1, 'conflicting historical ledger remains intact');
const legacyOwnership = validateCastleEconomy({ ...castle, ledger: castle.ledger.filter(entry => entry.kind !== 'asset-purchase') });
assert.equal(purchaseAsset(legacyOwnership, { id: 'foundation', label: 'Foundation', priceCents: 2000 }, '2026-11-10'), legacyOwnership, 'legacy ownership without a purchase entry remains owned');
assert.throws(() => purchaseAsset(castle, { id: 'tower', label: 'Tower', priceCents: 2000 }, '2026-11-10'), /balance/i);
castle = settlePastDays(castle, '2026-11-13');
assert.equal(castle.assets.length, 1, 'missed days never damage castle assets');


// Rare missions are optional, tied to real reflected work, and cannot be claimed twice.
let missionState = activateEconomy(1000, '2026-11-10');
missionState = offerMission(missionState, '2026-11-10', 0.01);
assert.equal(missionState.missions.length, 1, 'a rare draw can create an opportunity');
assert.equal(offerMission(missionState, '2026-11-11', 0).missions.length, 1, 'mission opportunities are spaced apart');
assert.throws(() => claimMission(missionState, missionState.missions[0].id, '2026-11-10'), /requirements/i);
missionState = commitTask(missionState, { id: 'm1', title: 'One', date: '2026-11-10', estimatedValueCents: 3000 });
missionState = commitTask(missionState, { id: 'm2', title: 'Two', date: '2026-11-10', estimatedValueCents: 3000 });
missionState = completeCommitment(missionState, 'm1', '2026-11-10', 3000);
missionState = completeCommitment(missionState, 'm2', '2026-11-10', 3000);
missionState = claimMission(missionState, missionState.missions[0].id, '2026-11-10');
const afterClaim = balanceCents(missionState);
assert.equal(afterClaim, 7500, 'two separate earnings worth $60 unlock the $15 bonus');
assert.equal(balanceCents(claimMission(missionState, missionState.missions[0].id, '2026-11-10')), afterClaim, 'mission reward is idempotent');


const ambitiousMission = offerMission(activateEconomy(1000, '2026-11-10'), '2026-11-10', 0.08).missions[0];
assert.ok(ambitiousMission.targetCents > 6000 && ambitiousMission.requiredTasks > 2 && ambitiousMission.bonusCents > 1500, 'more demanding missions offer a larger reward');

// A final total includes prior partial work; it must not pay those minutes twice.
let finishedPartial = activateEconomy(1000, '2026-11-10');
finishedPartial = commitTask(finishedPartial, { id: 'partial', title: 'Study', date: '2026-11-10', estimatedValueCents: 2000 });
finishedPartial = recordPartialProgress(finishedPartial, 'partial', '2026-11-10', 'first', 1000);
finishedPartial = completeCommitment(finishedPartial, 'partial', '2026-11-10', 2500);
assert.equal(balanceCents(finishedPartial), 2500, 'total credit equals final actual value, not actual plus prior partial');

// A reflected completion uses manual actual time, not the estimate or focus timer.
let reflectionEconomy = activateEconomy(1000, '2026-11-10');
reflectionEconomy = commitTask(reflectionEconomy, { id: 'reflected', title: 'Writing', date: '2026-11-10', estimatedValueCents: 1000 });
const reflectedTask = { id: 'reflected', text: 'Writing', isDone: true, createdAt: 0, durationMinutes: 60, timeSpentSeconds: 9000, actualMinutes: 30, priority: 'low' as const };
reflectionEconomy = registerReflectedTasks(reflectionEconomy, [reflectedTask], '2026-11-10');
assert.equal(balanceCents(reflectionEconomy), 500, 'manually recorded 30 minutes earns $5, regardless of estimate or timer');
assert.throws(() => registerReflectedTasks(activateEconomy(1000, '2026-11-10'), [{ ...reflectedTask, actualMinutes: undefined }], '2026-11-10'), /actual time/i);


// Previously reflected work from another day is not paid again at final completion.
let multiDay = activateEconomy(1000, '2026-11-10');
multiDay = commitTask(multiDay, { id: 'multi', title: 'Long task', date: '2026-11-10', estimatedValueCents: 2000 });
multiDay = recordPartialProgress(multiDay, 'multi', '2026-11-10', 'part', 1000);
multiDay = settlePastDays(multiDay, '2026-11-11');
multiDay = commitTask(multiDay, { id: 'multi', title: 'Long task', date: '2026-11-11', estimatedValueCents: 1000 });
multiDay = registerReflectedTasks(multiDay, [{ id: 'multi', text: 'Long task', isDone: true, createdAt: 0, priority: 'low', actualMinutes: 120, partialMinutes: 60 }], '2026-11-11');
assert.equal(balanceCents(multiDay), 0, '$10 earlier earning, $20 task penalty, then only $10 for new work');
assert.equal(taskValueCents(60, 'low', '15:00', '2026-11-10'), 1250, 'time-only deadline is due today');
assert.equal(taskValueCents(1800, 'low', undefined, '2026-11-10'), 30000, 'a task spanning days can report more than 24 hours total');
assert.ok(taskValueCents(60, 'low', '2026-11-09', '2026-11-10') < taskValueCents(60, 'low', '2026-11-09', '2026-11-09'), 'late completion earns less than on-time completion');
assert.ok(taskValueCents(60, 'low', '2026-11-09', '2026-11-11') < taskValueCents(60, 'low', '2026-11-09', '2026-11-10'), 'later completion earns progressively less');
let sameDayPartial = activateEconomy(1000, '2026-11-10');
sameDayPartial = commitTask(sameDayPartial, { id: 'same', title: 'Long task', date: '2026-11-10', estimatedValueCents: 2000 });
sameDayPartial = recordPartialProgress(sameDayPartial, 'same', '2026-11-10', 'part', 1000);
sameDayPartial = registerReflectedTasks(sameDayPartial, [{ id: 'same', text: 'Long task', isDone: true, createdAt: 0, priority: 'low', actualMinutes: 120, partialMinutes: 60 }], '2026-11-10');
assert.equal(balanceCents(sameDayPartial), 2000, 'same-day partial and completion together pay only for the total actual time');
let retired = activateEconomy(1000, '2026-11-10');
retired = commitTask(retired, { id: 'old', title: 'Old', date: '2026-11-10', estimatedValueCents: 1000 });
retired = substituteCommitment(retired, 'old', '2026-11-10', [{ id: 'new', title: 'New', date: '2026-11-10', estimatedValueCents: 1000 }]);
assert.throws(() => recordPartialProgress(retired, 'old', '2026-11-10', 'part', 500), /unfinished/i, 'replaced commitments cannot receive commitment progress');
assert.throws(() => validateCastleEconomy({ ...castle, assets: [...castle.assets, ...castle.assets] }), /invalid/i, 'duplicate castle assets cannot inflate net worth on import');

test('a restored task cannot earn final reflection credit again on another day', () => {
  for (const committed of [false, true]) {
    const today = '2026-11-30';
    const tomorrow = '2026-12-01';
    const task = { ...reflectedTask, actualMinutes: 60 };
    let economy = activateEconomy(1000, today);
    if (committed) economy = commitTask(economy, { id: task.id, title: task.text, date: today, estimatedValueCents: 1000 });
    economy = registerReflectedTasks(economy, [task], today);
    economy = validateCastleEconomy(JSON.parse(JSON.stringify(settlePastDays(economy, tomorrow))));
    assert.equal(registerReflectedTasks(economy, [task], tomorrow), economy);
    assert.throws(() => commitTask(economy, { id: task.id, title: task.text, date: tomorrow, estimatedValueCents: 1000 }), /complete/i);
  }
});

test('an uncommitted task finalized using only earlier progress remains finalized after restore', () => {
  const today = '2026-11-30';
  const tomorrow = '2026-12-01';
  const followingDay = '2026-12-02';
  const task = { ...reflectedTask, actualMinutes: 60, partialMinutes: 60 };
  let economy = activateEconomy(1000, today);
  economy = commitTask(economy, { id: task.id, title: task.text, date: today, estimatedValueCents: 1000 });
  economy = recordPartialProgress(economy, task.id, today, 'progress', 1000);
  economy = settlePastDays(economy, tomorrow);
  economy = registerReflectedTasks(economy, [task], tomorrow);
  assert.equal(balanceCents(economy), 0);
  economy = validateCastleEconomy(JSON.parse(JSON.stringify(settlePastDays(economy, followingDay))));
  assert.equal(registerReflectedTasks(economy, [{ ...task, actualMinutes: 120 }], followingDay), economy);
});

test('an imported duplicate commitment cannot trigger the same penalty twice', () => {
  const today = '2026-11-30';
  const economy = commitTask(activateEconomy(1000, today), { id: 'duplicate', title: 'Task', date: today, estimatedValueCents: 1000 });
  assert.throws(() => validateCastleEconomy({ ...economy, commitments: [...economy.commitments, ...economy.commitments] }), /invalid/i);
});

test('import rejects replacement records that claim coverage from the same task twice', () => {
  const today = '2026-11-30';
  const original = { id: 'original', title: 'Original', date: today, estimatedValueCents: 2000 };
  const replacement = { id: 'replacement', title: 'Replacement', date: today, estimatedValueCents: 1000 };
  let economy = commitTask(activateEconomy(1000, today), original);
  economy = commitTask(economy, replacement);
  const [parent, child] = economy.commitments;
  assert.throws(() => validateCastleEconomy({ ...economy, commitments: [{ ...parent, replacementIds: [child.id, child.id] }, child] }), /invalid/i);
});

test('import rejects duplicate mission offers for the same day', () => {
  const today = '2026-11-30';
  const economy = offerMission(activateEconomy(1000, today), today, 0);
  assert.throws(() => validateCastleEconomy({ ...economy, missions: [...economy.missions, { ...economy.missions[0], id: 'different-id' }] }), /invalid/i);
});

test('a closed day cannot be used to backdate a new goal, purchase, or mission offer', () => {
  const today = '2026-11-30';
  const tomorrow = '2026-12-01';
  let economy = recordEarning(activateEconomy(1000, today), 'work', today, 3000);
  economy = settlePastDays(economy, tomorrow);
  assert.throws(() => changeDailyGoal(economy, 2000, today), /settled/i);
  assert.throws(() => purchaseAsset(economy, { id: 'wall', label: 'Wall', priceCents: 1000 }, today), /settled/i);
  assert.equal(offerMission(economy, today, 0), economy);
});

test('offline catch-up preserves a closed day even when an import contains a stale commitment for it', () => {
  const beforeLeapDay = '2028-02-28';
  const initial = activateEconomy(1000, beforeLeapDay);
  const settled = settlePastDays(initial, '2028-02-29');
  const staleCommitment = commitTask(initial, { id: 'stale', title: 'Old task', date: beforeLeapDay, estimatedValueCents: 1000 });
  const restored = validateCastleEconomy({ ...settled, commitments: staleCommitment.commitments });
  const returned = settlePastDays(restored, '2028-03-01');
  assert.equal(balanceCents(returned), -2000);
  assert.deepEqual(returned.ledger.slice(0, settled.ledger.length), settled.ledger);
  assert.ok(returned.ledger.some(entry => entry.kind === 'goal-shortfall' && entry.date === '2028-02-29'));
});

test('reflections ignore malformed deadlines preserved in existing tasks', () => {
  const day = '2026-11-30';
  const economy = registerReflectedTasks(activateEconomy(1000, day), [{ ...reflectedTask, deadline: '2026-02-30', actualMinutes: 60 }], day);
  assert.equal(balanceCents(economy), 1000);
});

test('settling an already closed date range preserves identity', () => {
  const state = settlePastDays(activateEconomy(1000, '2026-11-10'), '2026-11-11');
  assert.equal(settlePastDays(state, '2026-11-11'), state, 'allows an effect to safely respond to replacement snapshots');
});
