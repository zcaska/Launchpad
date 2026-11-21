import { purchaseAsset, validateCastleEconomy, type CastleEconomy } from './castleEconomy';

export interface BlueprintPart {
  readonly id: string;
  readonly label: string;
  readonly phase: number;
  readonly kind: string;
  readonly slot: number;
  readonly requiredDays: number;
  readonly goalUnits: number;
}

const kinds = ['foundation', 'west-wall', 'east-wall', 'north-wall', 'south-wall', 'gatehouse', 'west-tower', 'east-tower', 'keep', 'roofs', 'banners', 'crown'] as const;

/** Stable construction metadata shared by the domain, store and genuine 3D model. */
export const BLUEPRINT_PARTS: readonly BlueprintPart[] = Object.freeze(Array.from({ length: 120 }, (_, index) => {
  const kind = kinds[Math.floor(index / 10)];
  return Object.freeze({
    id: `blueprint-v2-${String(index + 1).padStart(3, '0')}`,
    label: `${kind.replace(/-/g, ' ').replace(/^./, letter => letter.toUpperCase())} ${index % 10 + 1}`,
    phase: Math.floor(index / 10) + 1,
    kind,
    slot: index % 10,
    requiredDays: 1 + Math.floor(index * 364 / 119),
    goalUnits: index === 0 ? 1 : index === 119 ? 10 : 3,
  });
}));

function checkDate(day: string): void {
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day) throw new Error('Invalid local date');
}

function canonicalPart(part: BlueprintPart): BlueprintPart {
  const canonical = BLUEPRINT_PARTS.find(item => item.id === part.id);
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
  const owned = new Set(economy.assets.map(asset => asset.id));
  const ownedCount = BLUEPRINT_PARTS.filter(part => owned.has(part.id)).length;
  return {
    ownedCount,
    total: 120 as const,
    qualifyingDays: getDisciplineDays(economy, today),
    complete: ownedCount === 120,
    nextPart: BLUEPRINT_PARTS.find(part => !owned.has(part.id)),
  };
}

export function getBlueprintLockReason(economy: CastleEconomy, part: BlueprintPart, today: string): string | undefined {
  checkDate(today);
  const canonical = canonicalPart(part);
  const owned = new Set(economy.assets.map(asset => asset.id));
  if (owned.has(canonical.id)) return undefined;
  const days = getDisciplineDays(economy, today);
  if (canonical.id === BLUEPRINT_PARTS[119].id) {
    checkDate(economy.activatedOn);
    const elapsed = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${economy.activatedOn}T00:00:00Z`)) / 86400000;
    if (elapsed < 365 || days < 365) return `Requires 365 qualifying work days (${days} earned) and 365 calendar days since activation (${elapsed} elapsed).`;
  }
  if (days < canonical.requiredDays) return `Requires ${canonical.requiredDays} qualifying work days (${days} earned).`;
  if (BLUEPRINT_PARTS.slice(0, BLUEPRINT_PARTS.indexOf(canonical)).some(earlier => !owned.has(earlier.id))) {
    return 'Purchase the earlier blueprint elements first.';
  }
  return undefined;
}

/** Enforce all gates against the supplied latest state; callers cannot supply a price. */
export function purchaseBlueprintPart(state: CastleEconomy, id: string, day: string): CastleEconomy {
  validateCastleEconomy(state);
  checkDate(day);
  const part = BLUEPRINT_PARTS.find(item => item.id === id);
  if (!part) throw new Error('Unknown blueprint part');
  if (state.assets.some(asset => asset.id === id)) return state;
  if (day < state.activatedOn) throw new Error('Date precedes activation');
  const locked = getBlueprintLockReason(state, part, day);
  if (locked) throw new Error(locked);
  return purchaseAsset(state, { id: part.id, label: part.label, priceCents: getBlueprintPrice(part, state) }, day);
}
