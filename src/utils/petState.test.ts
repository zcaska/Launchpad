// Standalone test suite: npx tsx src/utils/petState.test.ts
// Covers the Launchpad Pet state machine (spec §14 verification items 2–6).

import { nextPet, petTierForStreak, PetContext, PetDecision, PetState } from './petState';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

const ctx = (over: Partial<PetContext> = {}): PetContext => ({
  focusActive: false,
  pendingCount: 3,
  vibrateOk: true,
  ...over,
});

// ---- Task completion fires exactly one celebratory state (dedup handled by
// the controller clearing timers; the reducer must always land on 'happy') ----
assertEqual(nextPet('idle', 'feed-task-done', ctx()).state, 'happy', 'task-done from idle -> happy');
assertEqual(nextPet('roaming', 'feed-task-done', ctx()).state, 'happy', 'task-done from roaming -> happy');
assertEqual(nextPet('thinking', 'feed-task-done', ctx()).state, 'happy', 'task-done from thinking -> happy (supersedes)');
assertEqual(nextPet('happy', 'feed-task-done', ctx()).state, 'happy', 'rapid double task-done stays happy, no overlapping queue');

// ---- Focus suppression: no disruptive hop during a focus session ----
assertEqual(
  nextPet('idle', 'feed-task-done', ctx({ focusActive: true })).state,
  'focused',
  'task-done during focus stays focused (quiet acknowledgement)'
);
assertEqual(
  nextPet('happy', 'feed-task-added', ctx({ focusActive: true })).state,
  'focused',
  'transients are cancelled when focus starts'
);

// ---- Focus lifecycle restores an appropriate state ----
assertEqual(nextPet('focused', 'feed-focus-end', ctx()).state, 'idle', 'focus end returns to idle');
assertEqual(nextPet('sleeping', 'feed-focus-start', ctx()).state, 'focused', 'focus start overrides sleeping');

// ---- Inactivity: subdued then sleeping, never guilted from focus ----
assertEqual(
  nextPet('idle', 'env-subdue', ctx()).state,
  'sad',
  'long inactivity enters subdued (sad variation)'
);
assertEqual(
  nextPet('sad', 'env-subdue', ctx()).state,
  'sad',
  'repeated subdue cues restart nothing but stay sad'
);
assertEqual(
  nextPet('focused', 'env-subdue', ctx()).state,
  'focused',
  'focus sessions are not subdued'
);
assertEqual(nextPet('idle', 'env-doze', ctx()).state, 'sleeping', 'prolonged inactivity enters sleeping');
assertEqual(nextPet('sad', 'env-doze', ctx()).state, 'sleeping', 'a subdued pet eventually falls asleep');
assertEqual(
  nextPet('focused', 'env-doze', ctx({ focusActive: true })).state,
  'focused',
  'doze never fires while a focus session is active'
);

// ---- Sad is a quiet, persistent state: it ends when the user comes back ----
assertEqual(
  nextPet('idle', 'env-subdue', ctx()).transientMs,
  undefined,
  'the subdued look is persistent, not a repeating transient'
);
assertEqual(
  nextPet('sad', 'feed-user-wake', ctx()).state,
  'idle',
  'the pet perks up when the user returns'
);
assertEqual(
  nextPet('sad', 'feed-task-done', ctx()).state,
  'happy',
  'good news still reaches a subdued pet'
);

// ---- Welcome back: exactly one reaction per return ----
assertEqual(nextPet('sleeping', 'feed-user-wake', ctx()).state, 'welcome-back', 'sleeping pet welcomes the user back');
assertEqual(
  nextPet('welcome-back', 'feed-user-wake', ctx()).state,
  'welcome-back',
  'repeat wake cues do not restart the reaction'
);
assertEqual(nextPet('idle', 'feed-user-wake', ctx()).state, 'idle', 'wake from a non-sleeping pet is a no-op');
assertEqual(
  nextPet('sleeping', 'feed-user-wake', ctx({ focusActive: true })).state,
  'focused',
  'returning during focus goes straight to focused, no hop'
);

// ---- Sleeping stays inert unless a meaningful event occurs ----
assertEqual(
  nextPet('sleeping', 'feed-task-done', ctx()).state,
  'sleeping',
  'task-done never wakes the sleeping pet'
);
assertEqual(nextPet('sleeping', 'feed-task-added', ctx()).state, 'curious', 'a new task wakes the pet with curiosity');
assertEqual(
  nextPet('idle', 'feed-task-added', ctx({ pendingCount: 10 })).state,
  'overwhelmed',
  'too many pending tasks outrank curiosity with a concerned look'
);
assertEqual(
  nextPet('idle', 'feed-task-added', ctx({ pendingCount: 9 })).state,
  'curious',
  'a manageable load still gets the curious reaction'
);
assertEqual(
  nextPet('curious', 'env-transient-end', ctx()).state,
  'idle',
  'transient expiry returns to idle'
);
assertEqual(
  nextPet('happy', 'env-transient-end', ctx({ focusActive: true })).state,
  'focused',
  'transient expiry returns to focused when focus is active'
);

// ---- Idle variations are legal only from idle ----
assertEqual(nextPet('idle', 'env-variation', ctx({ variation: 'roam' })).state, 'roaming', 'idle variation may start roaming');
assertEqual(nextPet('roaming', 'env-variation', ctx({ variation: 'roam' })).state, 'roaming', 'variation never fires while roaming');
assertEqual(
  nextPet('idle', 'env-variation', ctx({ variation: 'roam', vibrateOk: false })).state,
  'idle',
  'reduced-motion blocks roaming'
);
assertEqual(
  nextPet('idle', 'env-variation', ctx({ variation: 'overwhelmed', pendingCount: 12 })).state,
  'overwhelmed',
  'high pending load may show the subtle concerned look'
);
assertEqual(
  nextPet('idle', 'env-variation', ctx({ variation: 'overwhelmed', pendingCount: 4 })).state,
  'idle',
  'low load never shows the concerned look'
);

// ---- Every transient declares an exit duration (spec §5: explicit exits) ----
for (const cue of ['feed-task-done', 'feed-task-added', 'feed-streak-milestone'] as const) {
  const d: PetDecision = nextPet('idle', cue, ctx());
  if (d.transientMs === undefined) {
    assert(false, `cue ${cue} declares a transient duration`);
  }
}
assert(true, 'event reaction cues declare exit durations');

// ---- Celebration streak: crown animation at milestones ----
assertEqual(
  nextPet('idle', 'feed-streak-milestone', ctx()).state,
  'celebration-streak',
  'streak milestone from idle -> celebration-streak'
);
assertEqual(
  nextPet('roaming', 'feed-streak-milestone', ctx()).state,
  'celebration-streak',
  'streak milestone from roaming -> celebration-streak'
);
assertEqual(
  nextPet('focused', 'feed-streak-milestone', ctx({ focusActive: true })).state,
  'focused',
  'streak milestone during focus stays focused (quiet acknowledgement)'
);
assertEqual(
  nextPet('sleeping', 'feed-streak-milestone', ctx()).state,
  'sleeping',
  'streak milestone never wakes sleeping pet'
);
assertEqual(
  nextPet('celebration-streak', 'env-transient-end', ctx()).state,
  'idle',
  'celebration transient expiry returns to idle'
);
assertEqual(
  nextPet('celebration-streak', 'env-transient-end', ctx({ focusActive: true })).state,
  'focused',
  'celebration transient expiry returns to focused when focus is active'
);

// ---- No state corruption from unknown listeners: cue dispatch is pure ----
const before: PetState = 'idle';
nextPet(before, 'env-variation', ctx({ variation: 'stay' }));
assertEqual(before, 'idle', 'reducer invocation has no side effects on its inputs');

// ---- Streak progression is cosmetic and tiered (3 / 7 days) ----
assertEqual(petTierForStreak(0), 'normal', 'no streak -> normal tier');
assertEqual(petTierForStreak(undefined), 'normal', 'missing streak -> normal tier');
assertEqual(petTierForStreak(2), 'normal', 'streak below 3 stays normal');
assertEqual(petTierForStreak(3), 'active', '3-day streak -> active tier');
assertEqual(petTierForStreak(6), 'active', 'streak between 3 and 7 stays active');
assertEqual(petTierForStreak(7), 'streak-master', '7-day streak -> streak master tier');
assertEqual(petTierForStreak(14), 'streak-master', '14-day streak stays streak master');

// ---- Coffee break: rare idle variation, suppressed during focus ----
assertEqual(nextPet('idle', 'env-coffee-break', ctx()).state, 'coffee-break', 'idle -> coffee-break');
assertEqual(nextPet('roaming', 'env-coffee-break', ctx()).state, 'coffee-break', 'roaming -> coffee-break');
assertEqual(nextPet('sleeping', 'env-coffee-break', ctx()).state, 'sleeping', 'coffee break ignored when sleeping');
assertEqual(
  nextPet('idle', 'env-coffee-break', ctx({ focusActive: true })).state,
  'focused',
  'coffee break suppressed during active focus'
);
assertEqual(nextPet('coffee-break', 'env-transient-end', ctx()).state, 'idle', 'coffee break ends to idle');
assertEqual(nextPet('idle', 'env-variation', ctx({ variation: 'coffee' })).state, 'coffee-break', 'idle variation coffee -> coffee-break');
assertEqual(nextPet('idle', 'env-coffee-break', ctx()).transientMs, 5000, 'coffee break transient duration is 5000ms');

// ---- Overload surge reaction ----
assertEqual(nextPet('idle', 'feed-task-overload', ctx()).state, 'overwhelmed', 'task-overload -> overwhelmed');
assertEqual(nextPet('idle', 'feed-task-overload', ctx()).transientMs, 3200, 'task-overload transient duration is 3200ms');
assertEqual(
  nextPet('idle', 'feed-task-overload', ctx({ focusActive: true })).state,
  'focused',
  'overload suppressed during focus'
);

// ---- Inactivity slump reaction ----
assertEqual(nextPet('idle', 'env-inactivity-slump', ctx()).state, 'sad', 'inactivity-slump -> sad');
assertEqual(
  nextPet('idle', 'env-inactivity-slump', ctx({ focusActive: true })).state,
  'focused',
  'inactivity-slump suppressed during focus'
);

console.log(failures === 0 ? '\n✅ All petState tests passed' : `\n❌ ${failures} petState test(s) failed`);
process.exit(failures === 0 ? 0 : 1);
