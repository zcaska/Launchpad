import { purchaseAsset, validateCastleEconomy, type CastleEconomy } from './castleEconomy';
import { BLUEPRINT_PARTS, CASTLE_DISTRICTS, type BlueprintPart, type CastleDistrict } from './castleBlueprintCatalog';

export { BLUEPRINT_PARTS, CASTLE_DISTRICTS };
export type { BlueprintCategory, BlueprintPart, CastleDistrict } from './castleBlueprintCatalog';

const partsById = new Map(BLUEPRINT_PARTS.map(part => [part.id, part]));
const legacyBlueprintIds = new Map([
  ['foundation', 'blueprint-v2-001'],
  ['brick-left', 'blueprint-v2-008'],
  ['brick-center', 'blueprint-v2-009'],
  ['brick-right', 'blueprint-v2-010'],
  ['walls', 'blueprint-v2-021'],
  ['tower', 'blueprint-v2-077'],
  ['crown', 'blueprint-v2-120'],
]);

export function resolveBlueprintId(assetId: string): string | undefined {
  const id = legacyBlueprintIds.get(assetId) ?? assetId;
  return partsById.has(id) ? id : undefined;
}

/** Project historical ownership without changing any paid asset or ledger record. */
export function getOwnedBlueprintIds(economy: CastleEconomy): Set<string> {
  const owned = new Set<string>();
  for (const asset of economy.assets) {
    const id = resolveBlueprintId(asset.id);
    if (id) owned.add(id);
  }
  return owned;
}

function checkDate(day: string): void {
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) throw new Error('Invalid local date');
}

function canonicalPart(part: BlueprintPart): BlueprintPart {
  const canonical = partsById.get(part.id);
  if (!canonical) throw new Error('Unknown blueprint part');
  return canonical;
}

/** Count actual recorded work dates, never elapsed time or mission bonuses. */
export function getDisciplineDays(economy: CastleEconomy, today: string): number {
  checkDate(today);
  const earnings = new Map<string, bigint>();
  const seen = new Set<string>();
  for (const entry of economy.ledger) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (entry.kind !== 'earning' || !/^earning:(?:commitment|task|progress):/.test(entry.id)
      || entry.date < economy.activatedOn || entry.date > today) continue;
    checkDate(entry.date);
    if (!Number.isSafeInteger(entry.amountCents) || entry.amountCents < 0) throw new Error('Invalid work earning');
    earnings.set(entry.date, (earnings.get(entry.date) ?? 0n) + BigInt(entry.amountCents));
  }
  let days = 0;
  for (const [day, earned] of earnings) {
    const goal = economy.goalChanges.reduce((latest, change) => change.effectiveOn <= day
      && (!latest || change.effectiveOn >= latest.effectiveOn) ? change : latest,
    undefined as CastleEconomy['goalChanges'][number] | undefined)?.amountCents ?? economy.goalCents;
    if (earned >= BigInt(goal)) days++;
  }
  return days;
}

export function getBlueprintPrice(part: BlueprintPart, economy: CastleEconomy): number {
  const price = economy.goalCents * canonicalPart(part).goalUnits;
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error('Blueprint price exceeds safe whole cents');
  return price;
}

export function getBlueprintProgress(economy: CastleEconomy, today: string) {
  const owned = getOwnedBlueprintIds(economy);
  const ownedCount = owned.size;
  return {
    ownedCount,
    total: 120 as const,
    qualifyingDays: getDisciplineDays(economy, today),
    complete: ownedCount === 120,
    nextPart: BLUEPRINT_PARTS.find(part => !owned.has(part.id) && missingDistrictPieces(part.district, owned) === 0),
  };
}

function missingDistrictPieces(district: CastleDistrict, owned: ReadonlySet<string>): number {
  if (district === 1) return 0;
  const ownedInPrevious = BLUEPRINT_PARTS.filter(part => part.district === district - 1 && owned.has(part.id)).length;
  return Math.max(0, 18 - ownedInPrevious);
}

export function getBlueprintLockReason(economy: CastleEconomy, part: BlueprintPart, today: string): string | undefined {
  checkDate(today);
  const canonical = canonicalPart(part);
  const owned = getOwnedBlueprintIds(economy);
  if (owned.has(canonical.id)) return undefined;
  if (today < economy.activatedOn) return 'Date precedes activation.';
  if (economy.ledger.some(entry => entry.id === `shortfall:${today}`)) return 'Day has already settled.';
  const missing = missingDistrictPieces(canonical.district, owned);
  if (missing > 0) return `Own ${missing} more ${missing === 1 ? 'asset' : 'assets'} in ${CASTLE_DISTRICTS[canonical.district - 2].label}.`;
  return undefined;
}

/** Enforce all gates against the supplied latest state; callers cannot supply a price. */
export function purchaseBlueprintPart(state: CastleEconomy, id: string, day: string): CastleEconomy {
  validateCastleEconomy(state);
  checkDate(day);
  const part = partsById.get(id);
  if (!part) throw new Error('Unknown blueprint part');
  if (getOwnedBlueprintIds(state).has(id)) return state;
  if (day < state.activatedOn) throw new Error('Date precedes activation');
  const locked = getBlueprintLockReason(state, part, day);
  if (locked) throw new Error(locked);
  return purchaseAsset(state, { id: part.id, label: part.label, priceCents: getBlueprintPrice(part, state) }, day);
}
