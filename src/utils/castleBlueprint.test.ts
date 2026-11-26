import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activateEconomy, balanceCents, changeDailyGoal, netWorthCents, purchaseAsset, recordEarning, settlePastDays, validateCastleEconomy } from './castleEconomy';
import { BLUEPRINT_PARTS, CASTLE_DISTRICTS, getBlueprintLockReason, getBlueprintPrice, getBlueprintProgress, getDisciplineDays, getOwnedBlueprintIds, purchaseBlueprintPart } from './castleBlueprint';

const day = (index: number) => new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
const funded = () => recordEarning(activateEconomy(100, day(0)), 'grant', day(0), 1_000_000);
const inDistrict = (district: number) => BLUEPRINT_PARTS.filter(part => part.district === district);

test('120 immutable stable elements cost 365 activation goals across four districts', () => {
  assert.equal(BLUEPRINT_PARTS.length, 120);
  assert.equal(new Set(BLUEPRINT_PARTS.map(part => part.id)).size, 120);
  assert.equal(new Set(BLUEPRINT_PARTS.map(part => part.modelKey)).size, 120);
  assert.deepEqual(CASTLE_DISTRICTS.map(district => district.number), [1, 2, 3, 4]);
  assert.equal(BLUEPRINT_PARTS.reduce((sum, part) => sum + part.goalUnits, 0), 365);
  BLUEPRINT_PARTS.forEach((part, index) => {
    assert.equal(part.id, 'blueprint-v2-' + String(index + 1).padStart(3, '0'));
    assert.equal(part.district, Math.floor(index / 30) + 1);
    assert.equal(part.slot, index % 30);
    assert.ok(Number.isInteger(part.goalUnits) && part.goalUnits > 0);
    assert.ok(part.lore.trim());
    assert.ok(Object.isFrozen(part));
  });
  assert.deepEqual(BLUEPRINT_PARTS.filter(part => part.category === 'companion').map(part => part.modelKey),
    ['mastiff', 'cat', 'stallion', 'falcon', 'wyvern']);
});

test('work totals follow historical goals, independent of missions, waiting, exemptions and purchases', () => {
  let state = activateEconomy(100, day(0));
  state = changeDailyGoal(state, 200, day(0));
  state = recordEarning(state, 'task:' + day(0) + ':a', day(0), 40);
  state = recordEarning(state, 'progress:' + day(0) + ':b:1', day(0), 60);
  state = recordEarning(state, 'commitment:' + day(1) + ':c', day(1), 199);
  state = recordEarning(state, 'mission:' + day(1), day(1), 10000);
  state = recordEarning(state, 'gift', day(2), 10000);
  state = { ...state, exemptDays: [day(2), day(3)] };
  state = recordEarning(state, 'task:' + day(3) + ':d', day(3), 200);
  assert.equal(getDisciplineDays(state, day(2)), 1);
  assert.equal(getDisciplineDays(state, day(900)), 2);
  assert.equal(getBlueprintPrice(BLUEPRINT_PARTS[1], state), 400);
  assert.equal(getBlueprintPrice({ ...BLUEPRINT_PARTS[1], goalUnits: 0 }, state), 400);
  assert.throws(() => getBlueprintPrice(BLUEPRINT_PARTS[119], { ...state, goalCents: Number.MAX_SAFE_INTEGER }), /safe/);
});

test('prices reflect the relative worth of fittings, structures and companions', () => {
  const units = (key: string) => BLUEPRINT_PARTS.find(part => part.modelKey === key)!.goalUnits;
  assert.equal(units('gatehouse-lanterns'), 1);
  assert.equal(units('banqueting-hall'), 7);
  assert.ok(units('banqueting-hall') > units('hall-lanterns'));
  assert.ok(units('astral-clock-tower') > units('clock-bells'));
  assert.ok(units('north-bastion') > units('bastion-weathercock'));
  assert.ok(units('royal-library') > units('courtyard-benches'));
  assert.ok(units('stallion') > units('cat'));
  assert.ok(units('wyvern') > units('mastiff'));
  assert.deepEqual(CASTLE_DISTRICTS.map(district => inDistrict(district.number)
    .reduce((sum, part) => sum + part.goalUnits, 0)), [82, 83, 89, 111]);
});

test('catalog repricing preserves an existing purchase and charges the current price only once for a new one', () => {
  const moat = BLUEPRINT_PARTS.find(part => part.modelKey === 'moat-excavation')!;
  let state = funded();
  state = purchaseAsset(state, { id: moat.id, label: moat.label, priceCents: 300 }, day(0));
  const snapshot = JSON.stringify(state);
  assert.equal(getBlueprintPrice(moat, state), 400);
  assert.equal(purchaseBlueprintPart(state, moat.id, day(0)), state);
  const restored = validateCastleEconomy(JSON.parse(snapshot));
  assert.equal(purchaseBlueprintPart(restored, moat.id, day(0)), restored);
  assert.equal(JSON.stringify(restored), snapshot);
  assert.equal(balanceCents(restored), 999700);
  assert.equal(netWorthCents(restored), 1_000_000);
  const newPurchase = purchaseBlueprintPart(funded(), moat.id, day(0));
  assert.equal(newPurchase.assets[0].priceCents, 400);
  assert.equal(newPurchase.ledger.find(entry => entry.id === `asset:${moat.id}`)?.amountCents, -400);
  assert.equal(purchaseBlueprintPart(newPurchase, moat.id, day(0)), newPurchase);
});

test('18 unique pieces unlock each next district and companions and crown may be purchased first', () => {
  let state = funded();
  const mastiff = inDistrict(1).find(part => part.modelKey === 'mastiff')!;
  const crown = inDistrict(4).find(part => part.modelKey === 'imperial-crown')!;
  state = purchaseBlueprintPart(state, mastiff.id, day(0));
  for (const part of inDistrict(1).filter(part => part !== mastiff).slice(0, 16)) {
    state = purchaseBlueprintPart(state, part.id, day(0));
  }
  const overlapping = purchaseAsset(state, { id: 'foundation', label: 'Old foundation', priceCents: 2000 }, day(0));
  const next = inDistrict(2)[0];
  assert.equal(getBlueprintProgress(overlapping, day(0)).ownedCount, 17);
  assert.throws(() => purchaseBlueprintPart(overlapping, next.id, day(0)), /1 more/);
  assert.equal(getBlueprintProgress(state, day(0)).ownedCount, 17);
  state = purchaseBlueprintPart(state, inDistrict(1)[16].id, day(0));
  assert.equal(getBlueprintLockReason(state, next, day(0)), undefined);
  for (const district of [2, 3]) {
    for (const part of inDistrict(district).slice(0, 18)) state = purchaseBlueprintPart(state, part.id, day(0));
  }
  state = purchaseBlueprintPart(state, crown.id, day(0));
  assert.equal(getDisciplineDays(state, day(0)), 0);
  for (const part of BLUEPRINT_PARTS) state = purchaseBlueprintPart(state, part.id, day(0));
  assert.deepEqual(getBlueprintProgress(state, day(0)), { ownedCount: 120, total: 120, qualifyingDays: 0, complete: true, nextPart: undefined });
  assert.equal(state.assets.reduce((sum, asset) => sum + asset.priceCents, 0), 36500);
  assert.equal(purchaseBlueprintPart(state, crown.id, day(0)), state);
  assert.equal(getBlueprintProgress(validateCastleEconomy(JSON.parse(JSON.stringify(state))), day(0)).complete, true);
});

test('grandfathered ownership and overlapping claims retain historical money and replay safely', () => {
  let state = funded();
  const first = BLUEPRINT_PARTS[0];
  const late = BLUEPRINT_PARTS[119];
  state = purchaseAsset(state, { id: 'legacy-keep', label: 'Old keep', priceCents: 700 }, day(0));
  state = purchaseAsset(state, { id: 'foundation', label: 'Foundation', priceCents: 2000 }, day(0));
  state = purchaseAsset(state, { id: late.id, label: 'Old crown', priceCents: 1000 }, day(0));
  assert.deepEqual([...getOwnedBlueprintIds(state)], [first.id, late.id]);
  assert.equal(purchaseBlueprintPart(state, first.id, day(0)), state);
  assert.equal(getBlueprintLockReason(state, late, day(0)), undefined);
  state = purchaseAsset(state, { id: first.id, label: 'Old blueprint foundation', priceCents: 100 }, day(0));
  assert.equal(getBlueprintProgress(state, day(0)).ownedCount, 2);
  assert.equal(netWorthCents(state), 1_000_000);
  assert.equal(balanceCents(state), 996200);
});

test('canonical purchases validate price, dates, ownership and available cash', () => {
  const state = funded();
  const first = BLUEPRINT_PARTS[0];
  assert.throws(() => purchaseBlueprintPart(state, 'legacy-keep', day(0)), /Unknown/);
  assert.throws(() => purchaseBlueprintPart(state, first.id, '2026-02-30'), /date/);
  assert.throws(() => purchaseBlueprintPart(state, first.id, '2025-12-31'), /activation/);
  const settled = settlePastDays(state, day(1));
  assert.match(getBlueprintLockReason(settled, first, day(0)) ?? '', /settled/);
  assert.throws(() => purchaseBlueprintPart(settled, first.id, day(0)), /settled/);
  const ownedAndSettled = settlePastDays(purchaseBlueprintPart(state, first.id, day(0)), day(1));
  assert.equal(getBlueprintLockReason(ownedAndSettled, first, day(0)), undefined);
  assert.throws(() => purchaseBlueprintPart(activateEconomy(100, day(0)), first.id, day(0)), /balance/);
});
