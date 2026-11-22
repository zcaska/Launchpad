import assert from 'node:assert/strict';
import { FEATURE_GUIDES, computeGuidePosition } from '../../data/featureGuides';

// 1. Registry verification
const expectedKeys = [
  'header.brand',
  'header.newTask',
  'header.sparkIdea',
  'header.scratchpad',
  'castle.hero',
  'castle.finances',
  'castle.dailyStrip',
  'castle.commitments',
  'castle.reflection',
  'castle.store',
  'growth.analytics',
  'growth.streak',
  'growth.xp',
  'dashboard.focus',
  'dashboard.timeRadar',
];

for (const key of expectedKeys) {
  const guide = FEATURE_GUIDES[key];
  assert.ok(guide, `Guide missing for key: ${key}`);
  assert.ok(guide.title.length > 0, `Title missing for key: ${key}`);
  assert.ok(guide.summary.length > 0, `Summary missing for key: ${key}`);
  assert.ok(guide.category.length > 0, `Category missing for key: ${key}`);
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(guide.title + guide.summary), false, `No emojis allowed in guide: ${key}`);
}

// 2. Position math verification
// Normal placement: below anchor
const anchor1 = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 } as DOMRect;
const pos1 = computeGuidePosition(anchor1, 280, 120, 1024, 768);
assert.equal(pos1.placement, 'bottom');
assert.ok(pos1.top >= 144, 'Should be placed below anchor with gap');
assert.ok(pos1.left >= 0 && pos1.left + 280 <= 1024, 'Should be clamped horizontally');

// Bottom screen edge: flips to top
const anchor2 = { top: 700, bottom: 740, left: 200, right: 300, width: 100, height: 40 } as DOMRect;
const pos2 = computeGuidePosition(anchor2, 280, 120, 1024, 768);
assert.equal(pos2.placement, 'top', 'Should flip above anchor when close to bottom edge');
assert.ok(pos2.top < 700, 'Top should be above anchor');

// Right screen edge: clamps left coordinate
const anchor3 = { top: 200, bottom: 240, left: 950, right: 1010, width: 60, height: 40 } as DOMRect;
const pos3 = computeGuidePosition(anchor3, 280, 120, 1024, 768);
assert.ok(pos3.left + 280 <= 1024 - 12, 'Must not overflow right edge');

console.log('Feature guides registry and positioning math passed.');
