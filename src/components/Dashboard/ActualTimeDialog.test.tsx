import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActualTimeDialog } from './ActualTimeDialog';
import { EstimatedDurationPicker } from '../Common/EstimatedDurationPicker';
import { clampDialHour, getDialAngle, getDialAngleDelta, getHourAtDialAngle } from './durationDial';
import { MAX_ESTIMATED_MINUTES, updateEstimatedHours, updateEstimatedMinutes } from '../../utils/estimatedDuration';

const rect = { left: 10, top: 20, width: 100, height: 100 };
assert.equal(getDialAngle(60, 20, rect), 0, 'top of the clock is zero degrees');
assert.equal(getDialAngle(110, 70, rect), 90, 'right side rotates clockwise');
assert.equal(getDialAngle(60, 120, rect), 180, 'bottom is half a turn');
assert.equal(getDialAngle(10, 70, rect), 270, 'left side completes the circle');
assert.equal(getDialAngleDelta(330, 0), 30, 'clockwise crossing from 11 to 0 advances one hour');
assert.equal(getDialAngleDelta(0, 330), -30, 'counterclockwise crossing from 0 to 11 reduces one hour');
assert.equal(getDialAngleDelta(359, 1), 2, 'small clockwise movement across zero stays forward');
assert.equal(getDialAngleDelta(1, 359), -2, 'small reverse movement across zero stays backward');

let angle = 330;
let accumulated = 0;
for (const next of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
  accumulated += getDialAngleDelta(angle, next);
  angle = next;
}
assert.equal(Math.round(accumulated / 30), 12, 'one full rotation advances from 0 through 12 hours');
assert.equal(getHourAtDialAngle(0, 12), 12, 'top of the second ring represents hour 12');
assert.equal(getHourAtDialAngle(30, 12), 13, 'the next mark after a full turn represents hour 13');

accumulated = 0;
angle = 30;
for (const next of [0, 330, 300, 270, 240, 210, 180, 150, 120, 90, 60, 30]) {
  accumulated += getDialAngleDelta(angle, next);
  angle = next;
}
assert.equal(Math.round(accumulated / 30), -12, 'one reverse rotation subtracts 12 hours');
assert.equal(clampDialHour(16, 15), 15, 'dragging stops at the maximum hour');
assert.equal(clampDialHour(-1, 15), 0, 'dragging cannot select a negative hour');

const markup = renderToStaticMarkup(<ActualTimeDialog tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: true }]} onSave={() => {}} onCancel={() => {}} />);
assert.match(markup, /Write draft/);
assert.match(markup, /Actual time/);
assert.match(markup, /minutes/);
assert.match(markup, /No duration selected/);
assert.match(markup, /aria-label="Hours on the clock"/);
assert.match(markup, /aria-label="Minutes on the clock"/);
assert.match(markup, /touch-none cursor-grab active:cursor-grabbing/, 'hour clock supports pointer dragging without touch scrolling');
assert.match(markup, /aria-label="Exact hours" inputMode="numeric"/i);
assert.match(markup, /aria-label="Exact minutes" inputMode="numeric"/i);
assert.doesNotMatch(markup, /aria-label="(?:Add|Subtract) one (?:hour|minute)"/);
for (let hour = 0; hour < 12; hour++) {
  assert.match(markup, new RegExp(`aria-label="Set hours to ${hour}"`));
}
for (let minute = 0; minute < 60; minute += 5) {
  assert.match(markup, new RegExp(`aria-label="Set minutes to ${minute}"`));
}
assert.doesNotMatch(markup, /type="number"/);
const bounded = renderToStaticMarkup(<ActualTimeDialog tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: true }]} maxMinutes={20} onSave={() => {}} onCancel={() => {}} />);
assert.match(bounded, /disabled="" aria-label="Set minutes to 25"/, 'dial marks above the remaining limit are disabled');
assert.match(bounded, /disabled="" aria-label="Set hours to 1"/, 'hours above the remaining limit are disabled');
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
const queuedCompletion = renderToStaticMarkup(<ActualTimeDialog
  tasks={[{ id: 'queued', text: 'Queued work', createdAt: 0, isDone: false, partialMinutes: 20, pendingProgress: [{ id: 'entry', date: '2026-11-26', minutes: 25 }] }]}
  onSave={() => {}}
  onCancel={() => {}}
/>);
assert.match(queuedCompletion, /45 minutes already recorded/, 'completion includes unpaid work waiting for daily review');
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
const longerDuration = renderToStaticMarkup(<ActualTimeDialog
  tasks={[{ id: '1', text: 'Write draft', createdAt: 0, isDone: true, actualMinutes: 1487 }]}
  onSave={() => {}}
  onCancel={() => {}}
/>);
assert.match(longerDuration, /24 h 47 min/);
assert.match(longerDuration, /aria-label="Set hours to 24" aria-pressed="true"/);
assert.match(longerDuration, /data-dial-value="24"/, 'hour labels retain exact drag anchor values');

assert.equal(updateEstimatedHours(137, 13), 797, 'estimate hours accept 13 hours while preserving minutes');
assert.equal(updateEstimatedHours(137, 24), 1457, 'estimate hours accept 24 hours while preserving minutes');
assert.equal(updateEstimatedHours(137, 8760), MAX_ESTIMATED_MINUTES, 'estimates cannot exceed the supported one-year limit');
assert.equal(updateEstimatedMinutes(MAX_ESTIMATED_MINUTES, 59), MAX_ESTIMATED_MINUTES, 'minute selection stays within the maximum');
assert.equal(updateEstimatedMinutes(60, 0), 60, 'minute selection cannot reduce an estimate below one hour when that hour is selected');

const thirteenHourEstimate = renderToStaticMarkup(<EstimatedDurationPicker minutes={13 * 60} onChange={() => {}} />);
assert.match(thirteenHourEstimate, /aria-label="Estimated duration, 13h\. Change estimate"/);
assert.match(thirteenHourEstimate, /aria-label="Set hours to 13" aria-pressed="true"/);
const dayEstimate = renderToStaticMarkup(<EstimatedDurationPicker minutes={24 * 60} onChange={() => {}} />);
assert.match(dayEstimate, /aria-label="Set hours to 24" aria-pressed="true"/);
const maximumEstimate = renderToStaticMarkup(<EstimatedDurationPicker minutes={MAX_ESTIMATED_MINUTES} onChange={() => {}} />);
assert.match(maximumEstimate, /aria-label="Set hours to 8760" aria-pressed="true"/);
assert.match(maximumEstimate, /disabled="" aria-label="Set minutes to 5"/, 'minute marks above the supported maximum are disabled');
console.log('Actual and estimated time entries render accessible bounded clocks through 8,760 hours.');
