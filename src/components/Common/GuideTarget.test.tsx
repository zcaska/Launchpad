import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuideTarget } from './GuideTarget';
import { FeatureGuideProvider } from './FeatureGuideContext';

const html = renderToStaticMarkup(
  <FeatureGuideProvider>
    <GuideTarget id="header.newTask" hoverLabel="New task">
      <button type="button">Plus</button>
    </GuideTarget>
  </FeatureGuideProvider>
);

assert.ok(html.includes('data-guide-id="header.newTask"'), 'Should render data-guide-id attribute');
assert.ok(html.includes('Plus'), 'Should render children');
assert.ok(html.includes('relative inline-flex'), 'Should have wrapper class');

console.log('GuideTarget static rendering tests passed successfully.');
