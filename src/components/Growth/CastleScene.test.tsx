import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CastleScene, CASTLE_PARTS } from './CastleScene';
import { Box3, Vector3 } from 'three';
import { getCastleInspectionFrame } from './castleSceneRuntime';
const empty=renderToStaticMarkup(<CastleScene ownedIds={[]} />);
assert.match(empty,/data-built-count="0"/);assert.match(empty,/data-phantom-count="120"/);assert.match(empty,/Your castle construction site/);assert.match(empty,/Loading interactive 3D/);assert.doesNotMatch(empty,/\.jpg|<image|<svg/);
for(const p of CASTLE_PARTS){const one=renderToStaticMarkup(<CastleScene ownedIds={[p.id,p.id]} />);assert.match(one,/data-built-count="1"/);assert.ok(one.includes(p.label.replace(/&/g,'&amp;')));}
const all=renderToStaticMarkup(<CastleScene ownedIds={CASTLE_PARTS.map(p=>p.id)} />);assert.match(all,/data-complete="true"/);assert.match(all,/120 of 120 physical elements/);
assert.match(renderToStaticMarkup(<CastleScene ownedIds={['foundation','unknown']} />),/data-built-count="0"/);
const multiple=renderToStaticMarkup(<><CastleScene ownedIds={[]} /><CastleScene ownedIds={[]} /></>);const ids=[...multiple.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
assert.match(empty,/Rotate castle left/);assert.match(empty,/Zoom into castle/);assert.match(empty,/Reset view/);
const target = CASTLE_PARTS[0];
const inspected = renderToStaticMarkup(<CastleScene ownedIds={[]} inspection={{ assetId: target.id, request: 2 }} />);
assert.match(inspected, /data-inspected-asset="blueprint-v2-001"/);
const frame = getCastleInspectionFrame(new Box3(new Vector3(4, 6, -8), new Vector3(6, 10, -6)));
assert.deepEqual(frame.center.toArray(), [5, 8, -7]);
assert.equal(frame.radius, Math.sqrt(6));
console.log('Castle SSR summary, controls, 120-piece ownership and legacy isolation passed.');
