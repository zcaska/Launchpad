import assert from 'node:assert/strict';
import { prepareTaskCompletionSound, playTaskCompletionBell } from './taskCompletionSound';

async function main() {
  let starts = 0;
  let contexts = 0;
  let resumes = 0;
  let allowResume!: () => void;
  const resumed = new Promise<void>(resolve => { allowResume = resolve; });
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    resume() { resumes++; return resumed.then(() => { context.state = 'running'; }); },
    createGain: () => ({ gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createOscillator: () => ({ type: '', frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() { starts++; }, stop() {} }),
  };
  Object.assign(globalThis, { window: { AudioContext: function () { contexts++; return context; } } });

  prepareTaskCompletionSound();
  assert.equal(contexts, 1, 'The confirmation gesture creates the audio context synchronously');
  assert.equal(resumes, 1, 'The confirmation gesture requests audio authorization synchronously');
  assert.equal(starts, 0, 'Preparation must stay silent if completion is canceled or rejected');
  const playback = playTaskCompletionBell();
  assert.equal(starts, 0, 'Audio must wait for resume before scheduling the bell');
  allowResume();
  await playback;
  assert.equal(starts, 2, 'Successful completion plays both bell partials after resume');
  prepareTaskCompletionSound();
  await playTaskCompletionBell();
  assert.equal(contexts, 1, 'Later completions reuse the authorized context');
  assert.equal(starts, 4);

  context.state = 'suspended';
  context.resume = () => Promise.reject(new Error('Audio permission denied'));
  await playTaskCompletionBell();
  assert.equal(starts, 4, 'Denied audio stays optional');
  console.log('Task completion sound timing passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });

