import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CastleScene, CASTLE_PARTS } from './CastleScene';
const empty=renderToStaticMarkup(<CastleScene ownedIds={[]} />);
assert.match(empty,/data-built-count="0"/);assert.match(empty,/Your castle construction site/);assert.match(empty,/Loading interactive 3D/);assert.doesNotMatch(empty,/\.jpg|<image|<svg/);
for(const p of CASTLE_PARTS){const one=renderToStaticMarkup(<CastleScene ownedIds={[p.id,p.id]} />);assert.match(one,/data-built-count="1"/);assert.ok(one.includes(p.label.replace(/&/g,'&amp;')));}
const all=renderToStaticMarkup(<CastleScene ownedIds={CASTLE_PARTS.map(p=>p.id)} />);assert.match(all,/data-complete="true"/);assert.match(all,/120 of 120 physical elements/);
assert.match(renderToStaticMarkup(<CastleScene ownedIds={['foundation','unknown']} />),/data-built-count="0"/);
const multiple=renderToStaticMarkup(<><CastleScene ownedIds={[]} /><CastleScene ownedIds={[]} /></>);const ids=[...multiple.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
assert.match(empty,/Rotate castle left/);assert.match(empty,/Zoom into castle/);assert.match(empty,/Reset view/);
console.log('Castle SSR summary, controls, 120-piece ownership and legacy isolation passed.');
