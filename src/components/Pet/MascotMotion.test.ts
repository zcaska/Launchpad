import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mascot } from './Mascot';
import { MASCOT_EXPRESSIONS } from './mascotManifest';
import { nextPet } from '../../utils/petState';
const context = { pendingCount: 1, vibrateOk: true };
assert.equal(Object.keys(MASCOT_EXPRESSIONS).length, 8);
for (const expression of Object.values(MASCOT_EXPRESSIONS)) {
  assert(expression.eyeOpenness >= 0 && expression.eyeOpenness <= 1);
  const svg = renderToStaticMarkup(createElement(Mascot, { expression: expression.id, reducedMotion: false }));
  assert(svg.includes(`data-expression="${expression.id}"`));
  assert(svg.includes('mascot-breath'));
  assert(svg.includes('mascot-fin-breathe-l'));
}
assert.equal(nextPet('idle', 'feed-task-done', context).state, 'happy');
assert.equal(nextPet('happy', 'feed-task-done', context).state, 'happy');
assert.equal(nextPet('idle', 'feed-streak-milestone', context).state, 'celebration-streak');
assert.equal(nextPet('sleeping', 'feed-user-wake', context).state, 'welcome-back');
assert.equal(nextPet('happy', 'env-transient-end', context).state, 'idle');
console.log('Eight companion expressions, living motion layers and reaction transitions passed.');