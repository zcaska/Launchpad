import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Box3, NoColorSpace, SRGBColorSpace, Vector3 } from 'three';
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
import { CastlePartPreview } from './CastlePartPreview';
import { getCastlePreview } from './castlePartPreviewRenderer';
import { CASTLE_ELEMENTS, castleElements, getCastleElement, getCastleElementBounds } from './castleModel';
import { CASTLE_PATTERN_KEYS, createCastleMaterials } from './castleTextures';

assert.deepEqual(castleElements([]), []);
assert.deepEqual(castleElements(['foundation', 'brick-left', 'unknown']), []);
assert.equal(CASTLE_ELEMENTS.length, 120);
assert.equal(new Set(CASTLE_ELEMENTS.map(element => element.id)).size, 120);
assert.deepEqual(CASTLE_ELEMENTS.map(element => element.id), BLUEPRINT_PARTS.map(part => part.id),
  'Architectural additions belong to the same 120 purchased elements');
assert.deepEqual(castleElements(BLUEPRINT_PARTS.map(part => part.id)), CASTLE_ELEMENTS,
  'Existing complete ownership exposes the whole enriched castle');

// Keep the richer castle instanced: detail can grow without multiplying
// draw calls, animated objects, or the estate's horizontal footprint.
const allPrimitives = CASTLE_ELEMENTS.flatMap(element => element.primitives);
const staticBatches = new Set(allPrimitives.filter(piece => !piece.joint)
  .map(piece => `${piece.shape}:${piece.material}`));
assert.ok(allPrimitives.length >= 3500 && allPrimitives.length <= 4200,
  'Expanded architecture stays within its static instance budget');
assert.ok(staticBatches.size <= 56, 'Structural decoration reuses shape/material batches');
assert.equal(allPrimitives.filter(piece => piece.joint).length, 66,
  'Architectural detail adds no per-frame joint animation');
const estate = new Box3();
for (const element of CASTLE_ELEMENTS) estate.union(getCastleElementBounds(element));
const estateSize = estate.getSize(new Vector3());
assert.ok(estateSize.x <= 30 && estateSize.z <= 31 && estateSize.y >= 15 && estateSize.y <= 16,
  'Taller royal roofs fit the existing estate and a bounded skyline');
assert.ok(estate.min.y >= -.01, 'Detail does not extend below the established ground plane');
for (const part of BLUEPRINT_PARTS) {
  const element = getCastleElement(part.id)!;
  assert.ok(element, `${part.id} is modeled`);
  assert.deepEqual(castleElements([part.id, part.id]), [element]);
  assert.ok(element.anchor.every(Number.isFinite), part.id);
  assert.ok(element.primitives.length > 0, part.id);
  for (const primitive of element.primitives) {
    assert.ok(primitive.position.every(Number.isFinite), part.id);
    assert.ok(primitive.size.every(value => Number.isFinite(value) && value > 0), part.id);
    if (primitive.joint) assert.ok(primitive.joint.pivot.every(Number.isFinite), part.id);
  }
  const bounds = getCastleElementBounds(element);
  for (const axis of ['x', 'y', 'z'] as const) {
    assert.ok(Number.isFinite(bounds.min[axis]) && Number.isFinite(bounds.max[axis]));
    assert.ok(bounds.max[axis] > bounds.min[axis], part.id);
  }
}

const model = (modelKey: string) => getCastleElement(BLUEPRINT_PARTS.find(part => part.modelKey === modelKey)!.id)!;
assert.ok(model('mastiff').primitives.some(part => part.shape === 'torus' && part.joint?.kind === 'head'));
assert.ok(model('cat').primitives.filter(part => part.joint?.kind === 'tail').length >= 2);
assert.ok(model('stallion').primitives.some(part => part.shape === 'wedge' && part.joint?.kind === 'head'));
assert.ok(model('falcon').primitives.some(part => part.shape === 'teardrop'));
assert.ok(model('falcon').primitives.some(part => part.shape === 'wedge' && part.joint?.kind === 'wing'));
assert.ok(model('wyvern').primitives.some(part => part.joint?.kind === 'ember'));
assert.ok(model('wyvern').primitives.filter(part => part.joint?.kind === 'wing').length >= 2);
assert.ok(getCastleElementBounds(model('imperial-crown')).max.y > getCastleElementBounds(model('cathedral-spire')).max.y,
  'The crown sits above the central cathedral spire');
assert.ok(getCastleElementBounds(model('cathedral-spire')).max.y > 14,
  'The royal skyline has a materially taller silhouette');
assert.ok(getCastleElementBounds(model('wyvern')).min.y < .01,
  'The higher wyvern perch retains its ground-reaching support');
assert.ok(getCastleElementBounds(model('moat-excavation')).max.y < .13, 'Moat water remains at ground level');
assert.ok(getCastleElementBounds(model('heavy-drawbridge')).min.y < .2, 'The drawbridge approaches at ground level');

const arch = BLUEPRINT_PARTS.find(part => part.label.includes('Gatehouse'))!;
const cat = model('cat');
const catFaces = getCastlePreview(cat.id);
const archFaces = getCastlePreview(arch.id);
assert.ok(catFaces.some(face => face.material === 'catPelt') && archFaces.some(face => face.material === 'stone'));
assert.ok(catFaces.length > 0 && archFaces.length > 0);
assert.notDeepEqual(catFaces.map(face => face.points), archFaces.map(face => face.points));
assert.match(renderToStaticMarkup(createElement(CastlePartPreview, { assetId: cat.id, label: 'Courtyard Calico Cat' })),
  /role="img" aria-label="Construction preview: Courtyard Calico Cat"/);

let canvasCount = 0;
const fakeContext = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
const resources = createCastleMaterials(() => {
  canvasCount++;
  return { getContext: () => fakeContext } as unknown as HTMLCanvasElement;
});
assert.equal(CASTLE_PATTERN_KEYS.length, 10);
assert.equal(canvasCount, 18, 'Ten color patterns and eight surface data maps, including brushed gold relief');
const { stone, timber, slate, water, gold, wyvernScale } = resources.materials;
for (const masonry of [stone, timber]) {
  assert.equal(masonry.map?.colorSpace, SRGBColorSpace);
  for (const map of [masonry.bumpMap, 'roughnessMap' in masonry && masonry.roughnessMap]) {
    assert.ok(map && map.colorSpace === NoColorSpace);
  }
}
assert.ok('specularMap' in slate && slate.specularMap?.colorSpace === NoColorSpace);
assert.equal(slate.bumpMap?.colorSpace, NoColorSpace);
assert.equal(water.map, resources.waterTexture);
assert.equal(wyvernScale.bumpMap?.colorSpace, NoColorSpace);
assert.equal(gold.bumpMap?.colorSpace, NoColorSpace);
assert.ok('metalness' in gold && gold.metalness === .82);
assert.equal(gold.roughness, .25);
const releases = new Map<object, number>();
for (const material of Object.values(resources.materials)) {
  for (const resource of [material, material.map, material.bumpMap,
    'roughnessMap' in material && material.roughnessMap, 'specularMap' in material && material.specularMap]) {
    if (!resource || releases.has(resource)) continue;
    releases.set(resource, 0);
    resource.addEventListener('dispose', () => releases.set(resource, releases.get(resource)! + 1));
  }
}
resources.dispose();
resources.dispose();
assert.ok([...releases.values()].every(count => count === 1), 'Each owned texture and material is released exactly once');
console.log('120 castle models, companion silhouettes and pivots, procedural maps and disposal passed.');
