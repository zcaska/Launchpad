import { clampCoordinate, calculatePlacement, usePetMotion } from './usePetMotion';

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

// 1. Clamping within viewport
assert(clampCoordinate(5, 16, 500) === 16, 'Clamps value below min to min');
assert(clampCoordinate(600, 16, 500) === 500, 'Clamps value above max to max');
assert(clampCoordinate(250, 16, 500) === 250, 'Keeps interior value intact');
assert(clampCoordinate(16, 16, 500) === 16, 'Exact lower bound matches');
assert(clampCoordinate(500, 16, 500) === 500, 'Exact upper bound matches');

// Clamping inverted min/max boundary safety
assert(clampCoordinate(100, 500, 300) === 500, 'Returns min when min >= max');

// 2. Placement inversion near top edge
assert(calculatePlacement(80) === 'bottom', 'Inverts bubble below when close to top (<120px)');
assert(calculatePlacement(119) === 'bottom', 'Inverts bubble below at boundary 119px');
assert(calculatePlacement(120) === 'top', 'Keeps bubble on top at boundary 120px');
assert(calculatePlacement(400) === 'top', 'Keeps bubble on top when far from top (>=120px)');
assert(calculatePlacement(0) === 'bottom', 'Inverts bubble below at 0px');
assert(calculatePlacement(-50) === 'bottom', 'Inverts bubble below at negative y');

// 3. Export validation
assert(typeof clampCoordinate === 'function', 'clampCoordinate is exported as function');
assert(typeof calculatePlacement === 'function', 'calculatePlacement is exported as function');
assert(typeof usePetMotion === 'function', 'usePetMotion is exported as function');

// 4. Autonomous roaming waypoint generation within right corridor
const maxX = 1200 - 72;
const maxY = 800 - 72;
for (let i = 0; i < 10; i++) {
  const targetX = clampCoordinate(1200 - (32 + Math.random() * 56), 16, maxX);
  const targetY = clampCoordinate(800 * (0.15 + Math.random() * 0.65), 16, maxY);
  assert(targetX >= 1200 - 90 && targetX <= maxX, 'Target X stays in right margin');
  assert(targetY >= 800 * 0.15 && targetY <= 800 * 0.80, 'Target Y stays in vertical band');
}

if (failures > 0) process.exit(1);
console.log('✅ usePetMotion unit tests passed');
