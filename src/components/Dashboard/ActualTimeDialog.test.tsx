import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActualTimeDialog } from './ActualTimeDialog';
const markup = renderToStaticMarkup(<ActualTimeDialog tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: true }]} onSave={() => {}} onCancel={() => {}} />);
assert.match(markup, /Write draft/);
assert.match(markup, /Actual time/);
assert.match(markup, /minutes/);
assert.match(markup, /No duration selected/);
assert.match(markup, /aria-label="Add one hour"/);
assert.match(markup, /aria-label="Add one minute"/);
for (let minute = 0; minute < 60; minute += 5) {
  assert.match(markup, new RegExp(`aria-label="Set minutes to ${minute}"`));
}
assert.doesNotMatch(markup, /type="number"/);
const bounded = renderToStaticMarkup(<ActualTimeDialog tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: true }]} maxMinutes={20} onSave={() => {}} onCancel={() => {}} />);
assert.match(bounded, /disabled="" aria-label="Set minutes to 25"/, 'dial marks above the remaining limit are disabled');
const completion = renderToStaticMarkup(<ActualTimeDialog
  tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: false, partialMinutes: 20 }]}
  description="Enter the total time spent on this task."
  submitLabel="Mark complete"
  onSave={() => {}}
  onCancel={() => {}}
/>);
assert.match(completion, /Mark complete/);
assert.match(completion, /20 minutes already recorded/);
assert.match(completion, /No duration selected/);
const recorded = renderToStaticMarkup(<ActualTimeDialog
  tasks={[
    { id: '1', text: 'Write draft', createdAt: 0, isDone: true, actualMinutes: 137 },
    { id: '2', text: 'Revise draft', createdAt: 0, isDone: true },
  ]}
  onSave={() => {}}
  onCancel={() => {}}
/>);
assert.match(recorded, /2 h 17 min/, 'retains the previously recorded duration');
assert.match(recorded, /Revise draft/);
assert.match(recorded, /No duration selected/, 'additional tasks start without a duration');
console.log('Actual-time entry renders a bounded duration clock for each task.');
