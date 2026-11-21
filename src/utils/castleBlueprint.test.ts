import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activateEconomy, balanceCents, changeDailyGoal, netWorthCents, purchaseAsset, recordEarning, settlePastDays, validateCastleEconomy } from './castleEconomy';
import { BLUEPRINT_PARTS, getBlueprintLockReason, getBlueprintPrice, getBlueprintProgress, getDisciplineDays, purchaseBlueprintPart } from './castleBlueprint';

const day = (index: number) => new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
const funded = () => recordEarning(activateEconomy(100, day(0)), 'grant', day(0), 1_000_000);

test('120 immutable stable elements cost 365 activation goals and unlock over 365 days', () => {
  assert.equal(BLUEPRINT_PARTS.length, 120);
  assert.equal(new Set(BLUEPRINT_PARTS.map(part => part.id)).size, 120);
  assert.equal(BLUEPRINT_PARTS[0].id, 'blueprint-v2-001');
  assert.equal(BLUEPRINT_PARTS[119].id, 'blueprint-v2-120');
  assert.equal(BLUEPRINT_PARTS.reduce((sum, part) => sum + part.goalUnits, 0), 365);
  BLUEPRINT_PARTS.forEach((part, index) => {
    assert.equal(part.requiredDays, 1 + Math.floor(index * 364 / 119));
    assert.equal(part.phase, Math.floor(index / 10) + 1);
    assert.equal(part.slot, index % 10);
  });
  assert.throws(() => purchaseBlueprintPart(funded(), BLUEPRINT_PARTS[0].id, day(800)), /qualifying/);
  assert.equal(getDisciplineDays(settlePastDays(funded(), day(800)), day(800)), 0);
});

test('work totals follow historical goals, independent of missions, waiting, exemptions and purchases', () => {
  let state = activateEconomy(100, day(0));
  state = changeDailyGoal(state, 200, day(0));
  state = recordEarning(state, `task:${day(0)}:a`, day(0), 40);
  state = recordEarning(state, `progress:${day(0)}:b:1`, day(0), 60);
  state = recordEarning(state, `commitment:${day(1)}:c`, day(1), 199);
  state = recordEarning(state, `mission:${day(1)}`, day(1), 10000);
  state = recordEarning(state, 'gift', day(2), 10000);
  state = { ...state, exemptDays: [day(2), day(3)] };
  state = recordEarning(state, `task:${day(3)}:d`, day(3), 200);
  assert.equal(getDisciplineDays(state, day(2)), 1);
  assert.equal(getDisciplineDays(state, day(900)), 2);
  assert.equal(getBlueprintPrice(BLUEPRINT_PARTS[1], state), 300);
  assert.equal(getBlueprintPrice({ ...BLUEPRINT_PARTS[1], goalUnits: 0 }, state), 300);
  assert.throws(() => getBlueprintPrice(BLUEPRINT_PARTS[119], { ...state, goalCents: Number.MAX_SAFE_INTEGER }), /safe/);
});

test('365 distinct work dates are mandatory even with enormous cash and all prior pieces', () => {
  let state = funded();
  for (let i = 0; i < 364; i++) state = recordEarning(state, `task:${day(i)}:work`, day(i), 100);
  for (const part of BLUEPRINT_PARTS.slice(0, -1)) state = purchaseBlueprintPart(state, part.id, day(363));
  const last = BLUEPRINT_PARTS[119];
  assert.equal(getBlueprintProgress(state, day(900)).ownedCount, 119);
  assert.throws(() => purchaseBlueprintPart(state, last.id, day(900)), /365 qualifying/);
  state = recordEarning(state, `progress:${day(364)}:work:1`, day(364), 100);
  assert.throws(() => purchaseBlueprintPart(state, last.id, day(363)), /365 qualifying/);
  assert.throws(() => purchaseBlueprintPart(state, last.id, day(364)), /365 calendar days/);
  state = purchaseBlueprintPart(state, last.id, day(365));
  assert.deepEqual(getBlueprintProgress(state, day(365)), { ownedCount: 120, total: 120, qualifyingDays: 365, complete: true, nextPart: undefined });
  assert.equal(state.assets.reduce((sum, asset) => sum + asset.priceCents, 0), 36500);
  assert.equal(purchaseBlueprintPart(state, last.id, day(365)), state);
  const imported = validateCastleEconomy(JSON.parse(JSON.stringify(state)));
  assert.equal(getBlueprintProgress(imported, day(364)).complete, true);
});

test('canonical purchases enforce sequence, cash, dates and replay while preserving legacy money', () => {
  let state = funded();
  state = purchaseAsset(state, { id: 'legacy-keep', label: 'Old keep', priceCents: 700 }, day(0));
  state = recordEarning(state, `task:${day(0)}:work`, day(0), 100);
  const worth = netWorthCents(state);
  assert.equal(getBlueprintProgress(state, day(0)).ownedCount, 0);
  assert.throws(() => purchaseBlueprintPart(state, 'legacy-keep', day(0)), /Unknown/);
  assert.throws(() => purchaseBlueprintPart(state, BLUEPRINT_PARTS[0].id, '2026-02-30'), /date/);
  assert.throws(() => purchaseBlueprintPart(state, BLUEPRINT_PARTS[0].id, '2025-12-31'), /activation/);
  const first = purchaseBlueprintPart(state, BLUEPRINT_PARTS[0].id, day(0));
  assert.equal(balanceCents(first), balanceCents(state) - 100);
  assert.equal(netWorthCents(first), worth);
  assert.equal(first.assets[0], state.assets[0]);
  assert.equal(purchaseBlueprintPart(first, BLUEPRINT_PARTS[0].id, day(0)), first);
  assert.equal(getBlueprintLockReason(first, BLUEPRINT_PARTS[0], day(0)), undefined);
  let enoughDays = state;
  for (let i = 1; i < 10; i++) enoughDays = recordEarning(enoughDays, `task:${day(i)}:work`, day(i), 100);
  assert.throws(() => purchaseBlueprintPart(enoughDays, BLUEPRINT_PARTS[1].id, day(9)), /earlier/);
  assert.throws(() => purchaseBlueprintPart(settlePastDays(state, day(1)), BLUEPRINT_PARTS[0].id, day(0)), /settled/);
  const poor = { ...state, ledger: state.ledger.filter(entry => entry.id !== 'earning:grant').map(entry => entry.kind === 'earning' ? { ...entry, amountCents: 100 } : entry) };
  assert.throws(() => purchaseBlueprintPart(poor, BLUEPRINT_PARTS[0].id, day(0)), /balance/);
});
