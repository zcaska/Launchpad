import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CastlePanel, CastleStore } from './CastlePanel';
import { CASTLE_CATALOG } from './castleCatalog';
import { BLUEPRINT_PARTS, purchaseBlueprintPart } from '../../utils/castleBlueprint';
import { activateEconomy, recordEarning, type CastleEconomy } from '../../utils/castleEconomy';

const day = '2026-11-10';
const base = activateEconomy(5000, day);
const render = (economy: CastleEconomy) => renderToStaticMarkup(
  <CastlePanel economy={economy} today={day} currentStreak={7} onChange={() => {}} />,
);
const renderStore = (economy: CastleEconomy) => renderToStaticMarkup(
  <CastleStore economy={economy} today={day} onBuy={() => {}} onSelect={() => {}} />,
);

test('opens with a castle view and a Store button, with the catalog closed', () => {
  const view = render(base);
  assert.match(view, /aria-label="Castle view"/);
  assert.doesNotMatch(view, /Castle building encouragement|data-expression="welcoming"/);
  assert.match(view, /aria-haspopup="dialog"[^>]*>.*? Store<\/button>/);
  assert.doesNotMatch(view, /<dialog|data-asset=|Financial summary|Daily summary/);
});

test('browses four districts and filters the first district by category', () => {
  const empty = renderStore(base);
  assert.equal((empty.match(/data-asset="blueprint-v2-/g) ?? []).length, 30);
  assert.equal((empty.match(/role="tab"/g) ?? []).length, 4);
  for (const label of ['Monuments', 'Fortifications', 'Decorations', 'Companions', 'Construction preview']) {
    assert.ok(empty.includes(label), label);
  }
  assert.match(empty, /Need \$\d+\.\d{2}/);
  assert.doesNotMatch(empty, /cp-item-lore|aria-label="Inspect/);
});

test('funded players can build in the first district, and ownership projects into the scene', () => {
  const funded = recordEarning(base, 'grant', day, 1_000_000);
  const asset = BLUEPRINT_PARTS[1];
  assert.match(renderStore(funded), /data-state="available"/);
  const bought = purchaseBlueprintPart(funded, asset.id, day);
  assert.match(render(bought), /data-built-count="1"/);
  assert.match(renderStore(bought), /data-state="owned"/);
  assert.ok(renderStore(bought).includes(`aria-label="Select · ${asset.label}"`));
});

test('legacy investments represent owned castle pieces', () => {
  const legacy = render({ ...base, assets: [...CASTLE_CATALOG] });
  assert.match(legacy, /data-built-count="7"/);
});

test('completed castles keep the full scene and the Store entry point', () => {
  const economy = {
    ...base,
    assets: BLUEPRINT_PARTS.map(part => ({ id: part.id, label: part.label, priceCents: 5000 * part.goalUnits })),
  };
  const full = render(economy);
  assert.match(full, /data-built-count="120"/);
  assert.match(full, / Store<\/button>/);
  assert.equal((renderStore(economy).match(/30\/30/g) ?? []).length, 4);
});
