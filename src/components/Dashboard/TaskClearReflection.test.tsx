import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskClearReflection } from './TaskClearReflection';

const markup = renderToStaticMarkup(<TaskClearReflection onClose={() => {}} onSubmit={() => {}} error="Work is still saved" />);
assert.match(markup, /role="alert"[^>]*>Work is still saved/);
console.log('Reflection submission errors are visible and announced.');
