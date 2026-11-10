import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { earnedPetLevel, petAccessories, petEvolutionMessage } from './petEvolution';
import { HERO_ROSTER } from '../data/heroRoster';
import { Mascot } from '../components/Pet/Mascot';
import { resolveMascotVisual } from '../components/Pet/PetSprite';
import { nextPet } from './petState';
import type { GamificationState } from '../types';

const progress: GamificationState = {
  currentXp: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: '',
  unlockedHeroIds: [HERO_ROSTER[0].id], activeHeroId: HERO_ROSTER[0].id, lastBackupTimestamp: 0,
};
assert.equal(earnedPetLevel(), 1);
for (const hero of HERO_ROSTER) {
  const saved = { ...progress, unlockedHeroIds: [hero.id] };
  assert.equal(earnedPetLevel(saved), hero.level, 'Saved unlocks survive streak reset and equipping a lower hero');
  assert.equal(earnedPetLevel({ ...progress, currentXp: hero.minLifetimeXp }), hero.level, 'XP progression uses the real hero thresholds');
}
assert.deepEqual(petAccessories(1), { scarf: false, glasses: false, headphones: false, star: false, crown: null });
assert.equal(petAccessories(3).glasses, true);
assert.equal(petAccessories(4).headphones, true);
assert.equal(petAccessories(5).star, true);
assert.equal(petAccessories(6).headphones, false, 'Crown replaces headphones without cluttering the head');
assert.equal(petAccessories(7).crown, 'jeweled');
assert.match(petEvolutionMessage(2), /Next at level 3/);
assert.doesNotMatch(petEvolutionMessage(7), /Next at level 8/);

for (const level of [1, 2, 3, 4, 5, 6, 7]) {
  const svg = renderToStaticMarkup(createElement(Mascot, { evolutionLevel: level, reducedMotion: true }));
  assert.equal(svg.includes('data-accessory="scarf"'), level >= 2);
  assert.equal(svg.includes('data-accessory="glasses"'), level >= 3);
  assert.equal(svg.includes('data-accessory="headphones"'), level >= 4 && level < 6);
  assert.equal(svg.includes('data-accessory="crown"'), level === 6);
  assert.equal(svg.includes('data-accessory="jeweled-crown"'), level === 7);
}
// Test the actual renderer: a pose must not silently replace a requested face.
const excited = renderToStaticMarkup(createElement(Mascot, { expression: 'excited', pose: 'task_completion', reducedMotion: true }));
assert.match(excited, /data-expression="excited"/);
assert.equal(resolveMascotVisual('thinking', false, false).expression, 'curious');
assert.equal(resolveMascotVisual('welcome-back', false, false).expression, 'welcoming');
assert.equal(resolveMascotVisual('idle', false, false, 'happy').expression, 'happy');
assert.equal(resolveMascotVisual('roaming', false, false, 'happy').expression, 'happy');
assert.equal(nextPet('celebration-streak', 'feed-task-done', { pendingCount: 2, vibrateOk: true }).state,
  'celebration-streak', 'Simultaneous routine completion does not replace a level-up celebration');
console.log('Pet evolution, permanent unlocks, rendered accessories and expression precedence tests passed.');
