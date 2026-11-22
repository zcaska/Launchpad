import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeatureGuideProvider, useFeatureGuide, getCategoryIcon } from './FeatureGuideContext';

// 1. Static rendering test
const html = renderToStaticMarkup(
  <FeatureGuideProvider>
    <div id="test-child">App Content</div>
  </FeatureGuideProvider>
);

assert.ok(html.includes('id="test-child"'), 'FeatureGuideProvider must render children');
assert.ok(html.includes('App Content'), 'FeatureGuideProvider must preserve text content');

// 2. getCategoryIcon mappings and emoji check
const testCategories = [
  'Navigation',
  'Focus',
  'Creativity',
  'Workspace',
  'Accountability',
  'Discipline',
  'Integrity',
  'Castle',
  'Milestones',
  'Mastery',
  'Milestones/Mastery',
  'Time',
  'Other'
];

for (const cat of testCategories) {
  const iconMarkup = renderToStaticMarkup(getCategoryIcon(cat));
  assert.ok(iconMarkup.length > 0, `Icon markup should not be empty for category: ${cat}`);
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(iconMarkup), false, `Zero emojis allowed for category: ${cat}`);
  assert.ok(iconMarkup.includes('<svg'), `Category icon must render SVG element for ${cat}`);
}

// 3. useFeatureGuide hook error check outside provider
function ConsumerOutside() {
  useFeatureGuide();
  return null;
}

assert.throws(() => {
  renderToStaticMarkup(<ConsumerOutside />);
}, /useFeatureGuide must be used within FeatureGuideProvider/);

console.log('FeatureGuideContext tests passed successfully.');
