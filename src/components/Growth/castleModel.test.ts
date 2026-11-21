import assert from 'node:assert/strict';
import { castleElements } from './castleModel';
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
assert.deepEqual(castleElements([]),[]);
assert.deepEqual(castleElements(['foundation','brick-left','brick-center','brick-right','walls','tower','crown','unknown']),[],'Legacy art is not blueprint construction');
const all=castleElements(BLUEPRINT_PARTS.map(p=>p.id));
assert.equal(all.length,120);
assert.equal(new Set(all.map(p=>p.id)).size,120);
for(const part of BLUEPRINT_PARTS){const one=castleElements([part.id,part.id]);assert.equal(one.length,1);assert.ok(one[0].primitives.length>0,`${part.id} has physical geometry`);assert.deepEqual(one[0],all.find(p=>p.id===part.id));for(const primitive of one[0].primitives){assert.ok(primitive.position.every(Number.isFinite));assert.ok(primitive.size.every(n=>Number.isFinite(n)&&n>0));}}
assert.ok(all.flatMap(p=>p.primitives).some(p=>p.shape==='cone'));
assert.ok(all.flatMap(p=>p.primitives).some(p=>p.material==='gold'));
console.log('120 deterministic physical castle elements, legacy isolation and geometry bounds passed.');
// The gate remains physically open through both south-wall courses.
const south=BLUEPRINT_PARTS.filter(p=>p.kind==='south-wall');
for(const part of castleElements(south.map(p=>p.id))) for(const p of part.primitives) {
  const overlapsDoorX=Math.abs(p.position[0])-p.size[0]/2<1.1;
  const overlapsDoorY=p.position[1]-p.size[1]/2<2.5;
  assert.ok(!(overlapsDoorX&&overlapsDoorY),'South masonry must leave the central doorway unobstructed');
}
// Crown ornaments sit above the central keep roofs they decorate; distant higher
// turret roofs do not occlude them and must not force five-metre antenna poles.
const roofs=castleElements(BLUEPRINT_PARTS.filter(p=>p.kind==='roofs' && (p.slot===6 || p.slot===7)).map(p=>p.id)).flatMap(p=>p.primitives);
const highestRoof=Math.max(...roofs.map(p=>p.position[1]+p.size[1]/2));
for(const crown of castleElements(BLUEPRINT_PARTS.filter(p=>p.kind==='crown').map(p=>p.id))) {
  assert.ok(crown.primitives.some(p=>p.position[1]-p.size[1]/2>highestRoof),'Every crown purchase is exposed above the roofs');
}
assert.ok(all.flatMap(p=>p.primitives).some(p=>p.material==='wood'),'Completed gateway has distinct recessed doors');

