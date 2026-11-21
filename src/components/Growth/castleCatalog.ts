import type { CastleAsset, CastleEconomy } from '../../utils/castleEconomy';

export const CASTLE_CATALOG: readonly CastleAsset[] = [
  { id: 'foundation', label: 'Foundation', priceCents: 2000 },
  { id: 'brick-left', label: 'Gold brick: west', priceCents: 1000 },
  { id: 'brick-center', label: 'Gold brick: centre', priceCents: 1000 },
  { id: 'brick-right', label: 'Gold brick: east', priceCents: 1000 },
  { id: 'walls', label: 'Golden walls', priceCents: 4000 },
  { id: 'tower', label: 'Tower', priceCents: 6000 },
  { id: 'crown', label: 'Crown spire', priceCents: 10000 },
];

export const CASTLE_CATALOG_IDS = new Set(CASTLE_CATALOG.map(asset => asset.id));

export function assertCastleBuildPrerequisite(economy: CastleEconomy, assetId: string): void {
  const index = CASTLE_CATALOG.findIndex(asset => asset.id === assetId);
  if (index < 0) throw new Error('Unknown castle addition');
  const owned = new Set(economy.assets.map(asset => asset.id));
  if (index > 0 && !owned.has(CASTLE_CATALOG[index - 1].id)) throw new Error('Build previous addition first');
}

// Legacy catalog above preserves historical IDs and prices.
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
export const CASTLE_PHASES = Array.from({ length: 12 }, (_, index) => {
 const parts = BLUEPRINT_PARTS.filter(part => part.phase === index + 1);
 return { number: index + 1, label: parts[0].kind.replace(/-/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase()), firstDay: parts[0].requiredDays, lastDay: parts[9].requiredDays };
});

