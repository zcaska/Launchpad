import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskClearReflection } from './TaskClearReflection';

const markup = renderToStaticMarkup(<TaskClearReflection onClose={() => {}} onSubmit={() => {}} error="Work is still saved" />);
assert.match(markup, /role="alert"[^>]*>Work is still saved/);
const daily = renderToStaticMarkup(<TaskClearReflection mode="daily" onClose={() => {}} onSubmit={() => {}} />);
assert.match(daily, /Reflect on your day/);
assert.doesNotMatch(daily, /completed tasks will return to your queue/);
console.log('Reflection submission errors are visible and announced.');
