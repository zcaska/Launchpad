import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MASCOT_EXPRESSIONS,
  MASCOT_ANIMATION_CONTRACT,
} from './mascotManifest';
import {
  nextPet,
  PetContext,
} from '../../utils/petState';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${msg} (got: ${actual}, expected: ${expected})`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

const ctx = (overrides?: Partial<PetContext>): PetContext => ({
  focusActive: false,
  pendingCount: 0,
  vibrateOk: true,
  ...overrides,
});

console.log('--- SECTION 1: Expression Keyframes & Visual Specifications ---');

// 1. Verify all required expression keyframes exist and have anatomically consistent fin angles
const expressions = MASCOT_EXPRESSIONS;
assert(expressions.calm.leftFinAngle === 0 && expressions.calm.rightFinAngle === 0, 'Calm: neutral relaxed fins (0, 0)');
assert(expressions.curious.leftFinAngle === 12 && expressions.curious.rightFinAngle === -4, 'Curious: outward angled fins with tilt');
assert(expressions.welcoming.leftFinAngle === 8 && expressions.welcoming.rightFinAngle === 8, 'Welcoming: gentle receptive lifted fins (+8, +8)');
assert(expressions.happy.leftFinAngle === 18 && expressions.happy.rightFinAngle === 18, 'Happy: cheerful upward fins (+18, +18)');
assert(expressions.surprised.leftFinAngle === 14 && expressions.surprised.rightFinAngle === 14, 'Surprised: wide perked fins (+14, +14)');
assert(expressions.disappointed.leftFinAngle === -22 && expressions.disappointed.rightFinAngle === -22, 'Disappointed: droopy downturned fins (-22, -22)');
assert(expressions.sleepy.leftFinAngle === -10 && expressions.sleepy.rightFinAngle === -10, 'Sleepy: resting lowered fins (-10, -10)');
assert(expressions.excited.leftFinAngle === 24 && expressions.excited.rightFinAngle === 24, 'Excited: high energetic lifted fins (+24, +24)');
assert(expressions.focused.leftFinAngle === -6 && expressions.focused.rightFinAngle === -6, 'Focused: poised forward typing fins (-6, -6)');
assert(expressions.determined.leftFinAngle === 10 && expressions.determined.rightFinAngle === 10, 'Determined: confident alert fins (+10, +10)');

// 2. Focused canonical state: MUST NOT have an angry brow or threatening pose
assert(
  !expressions.focused.description.toLowerCase().includes('angry') &&
  !expressions.focused.description.toLowerCase().includes('scowl') &&
  !expressions.focused.description.toLowerCase().includes('clenched'),
  'Focused expression description is calm and attentive, never angry or scowling'
);

console.log('\n--- SECTION 2: Task-Completion Scaling & Absence Timing ---');

// 3. Routine task completion: duration 0.6-1.0s (spec §5.5)
const routineDecision = nextPet('idle', 'feed-task-done', ctx());
assertEqual(routineDecision.state, 'happy', 'Routine task completion transitions to happy');
assert(
  typeof routineDecision.transientMs === 'number' &&
  routineDecision.transientMs >= 600 &&
  routineDecision.transientMs <= 1000,
  `Routine completion duration is within 0.6–1.0s (got ${routineDecision.transientMs}ms)`
);

// 4. Major task / focus finish: duration 1.4-2.2s (spec §5.5)
const majorDecision = nextPet('idle', 'feed-major-task-done', ctx());
assertEqual(majorDecision.state, 'celebration-streak', 'Major task completion transitions to celebration-streak');
assert(
  typeof majorDecision.transientMs === 'number' &&
  majorDecision.transientMs >= 1400 &&
  majorDecision.transientMs <= 2200,
  `Major celebration duration is within 1.4–2.2s (got ${majorDecision.transientMs}ms)`
);

// 5. Short absence return: duration 0.8-1.2s (spec §5.6)
const shortReturnDecision = nextPet('idle', 'feed-return-short', ctx());
assertEqual(shortReturnDecision.state, 'welcome-back', 'Short absence returns to welcome-back');
assert(
  typeof shortReturnDecision.transientMs === 'number' &&
  shortReturnDecision.transientMs >= 800 &&
  shortReturnDecision.transientMs <= 1200,
  `Short absence greeting duration is within 0.8–1.2s (got ${shortReturnDecision.transientMs}ms)`
);

// 6. Long absence reunion: duration 1.6-2.4s (spec §5.6)
const longReturnDecision = nextPet('sleeping', 'feed-user-wake', ctx());
assertEqual(longReturnDecision.state, 'welcome-back', 'Long absence wake from sleep returns to welcome-back');
assert(
  typeof longReturnDecision.transientMs === 'number' &&
  longReturnDecision.transientMs >= 1600 &&
  longReturnDecision.transientMs <= 2400,
  `Long absence greeting duration is within 1.6–2.4s (got ${longReturnDecision.transientMs}ms)`
);

console.log('\n--- SECTION 3: Transition Priorities & Interruption Rules ---');

// 7. Focus session suppresses disruptions and roaming
assertEqual(nextPet('idle', 'feed-focus-start', ctx()).state, 'focused', 'Focus start overrides idle');
assertEqual(nextPet('roaming', 'feed-focus-start', ctx()).state, 'focused', 'Focus start interrupts roaming immediately');
assertEqual(nextPet('sleeping', 'feed-focus-start', ctx()).state, 'focused', 'Focus start wakes sleeping pet');
assertEqual(nextPet('happy', 'feed-focus-start', ctx()).state, 'focused', 'Focus start interrupts celebration');
assertEqual(nextPet('coffee-break', 'feed-focus-start', ctx()).state, 'focused', 'Focus start ends coffee break');

// 8. Quiet acknowledgment during active focus
assertEqual(nextPet('focused', 'feed-task-done', ctx({ focusActive: true })).state, 'focused', 'Task-done during focus remains focused');
assertEqual(nextPet('focused', 'feed-major-task-done', ctx({ focusActive: true })).state, 'focused', 'Major task during focus remains focused');
assertEqual(nextPet('focused', 'env-coffee-break', ctx({ focusActive: true })).state, 'focused', 'Coffee break suppressed during focus');
assertEqual(nextPet('focused', 'env-subdue', ctx({ focusActive: true })).state, 'focused', 'Subdue suppressed during focus');
assertEqual(nextPet('focused', 'env-doze', ctx({ focusActive: true })).state, 'focused', 'Doze suppressed during focus');

// 9. Focus session end returns to idle cleanly
assertEqual(nextPet('focused', 'feed-focus-end', ctx()).state, 'idle', 'Focus end returns smoothly to idle');

// 10. Transient expiry restores correct state
assertEqual(nextPet('happy', 'env-transient-end', ctx({ focusActive: false })).state, 'idle', 'Transient end returns to idle when not in focus');
assertEqual(nextPet('happy', 'env-transient-end', ctx({ focusActive: true })).state, 'focused', 'Transient end returns to focused when focus is active');

console.log('\n--- SECTION 4: PetSprite Motion System & Animated Props Verification ---');

const petSpriteSource = fs.readFileSync(path.resolve(__dirname, 'PetSprite.tsx'), 'utf-8');

// Keyframe checks
assert(petSpriteSource.includes('@keyframes pet-idle-float'), 'PetSprite includes @keyframes pet-idle-float');
assert(petSpriteSource.includes('@keyframes pet-focus-steady'), 'PetSprite includes @keyframes pet-focus-steady');
assert(petSpriteSource.includes('@keyframes pet-routine-bounce'), 'PetSprite includes @keyframes pet-routine-bounce');
assert(petSpriteSource.includes('@keyframes pet-major-celebration'), 'PetSprite includes @keyframes pet-major-celebration');
assert(petSpriteSource.includes('@keyframes pet-return-greeting'), 'PetSprite includes @keyframes pet-return-greeting');
assert(petSpriteSource.includes('@keyframes pet-rest-float'), 'PetSprite includes @keyframes pet-rest-float');
assert(petSpriteSource.includes('@keyframes pet-screen-glow'), 'PetSprite includes @keyframes pet-screen-glow');
assert(petSpriteSource.includes('@keyframes pet-steam'), 'PetSprite includes @keyframes pet-steam');
assert(petSpriteSource.includes('@keyframes pet-sip'), 'PetSprite includes @keyframes pet-sip');

// Motion classes
assert(petSpriteSource.includes('pet-motion-idle-float'), 'PetSprite binds pet-motion-idle-float class');
assert(petSpriteSource.includes('pet-motion-focus-steady'), 'PetSprite binds pet-motion-focus-steady class');
assert(petSpriteSource.includes('pet-motion-routine-bounce'), 'PetSprite binds pet-motion-routine-bounce class');
assert(petSpriteSource.includes('pet-motion-major-celebration'), 'PetSprite binds pet-motion-major-celebration class');
assert(petSpriteSource.includes('pet-motion-return-greeting'), 'PetSprite binds pet-motion-return-greeting class');
assert(petSpriteSource.includes('pet-motion-low-energy'), 'PetSprite binds pet-motion-low-energy class');

// Synchronized props wrapper
assert(petSpriteSource.includes('lp-sprite-motion'), 'Mascot and props share lp-sprite-motion synchronized wrapper');
assert(petSpriteSource.includes('data-prop="laptop"'), 'Working laptop prop layer is defined');
assert(petSpriteSource.includes('data-prop="coffee-mug"'), 'Steaming coffee mug prop layer is defined');
assert(petSpriteSource.includes('pet-laptop-glow'), 'Laptop emits inward luminous screen glow toward mascot');
assert(petSpriteSource.includes('pet-lid-gradient'), 'Laptop lid renders back metallic finish with Launchpad emblem');

// Strict reduced-motion suppression
assert(petSpriteSource.includes('prefers-reduced-motion: reduce'), 'Prefers-reduced-motion media query present');
assert(petSpriteSource.includes('.lp-reduced .lp-sprite-motion'), 'lp-reduced disables all motion animations');

console.log('\n--- SECTION 5: Mascot Geometry Integrity ---');

const mascotSource = fs.readFileSync(path.resolve(__dirname, 'Mascot.tsx'), 'utf-8');
assert(!mascotSource.includes('M ${cx - 6} ${cy - 4} L ${cx + 5} ${cy - 1.5}'), 'Harsh angry diagonal brow line removed from Mascot.tsx');
assert(mascotSource.includes('Calm, attentive gaze'), 'Mascot.tsx uses calm, attentive eye contour');
assert(MASCOT_ANIMATION_CONTRACT.viewBox === '0 0 120 100', 'Animation contract viewBox is 0 0 120 100');

if (failures > 0) {
  console.error(`\n❌ MascotMotion test suite completed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('\n✅ All Mascot Motion & Animation System tests passed successfully!');
}
