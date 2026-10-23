import {
  clampCoordinate,
  calculatePlacement,
  usePetMotion,
  MAX_ROAM_RADIUS_PX,
  MASCOT_BOUNDS,
  getScreenBounds,
  calculateRoamTarget,
  getDefaultPosition,
} from './usePetMotion';

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
assert(typeof getScreenBounds === 'function', 'getScreenBounds is exported as function');
assert(typeof calculateRoamTarget === 'function', 'calculateRoamTarget is exported as function');
assert(typeof getDefaultPosition === 'function', 'getDefaultPosition is exported as function');

// 4. Mascot screen containment & roaming limits
assert(MAX_ROAM_RADIUS_PX === 6, 'Max roam radius is exactly 6px on all sides');
assert(MASCOT_BOUNDS.width === 84 && MASCOT_BOUNDS.height === 70, 'Mascot bounds dimensions are 84x70');

const bounds = { minX: 12, maxX: 1104, minY: 12, maxY: 718 };
const anchor = { x: 1000, y: 650 };

for (let i = 0; i < 20; i++) {
  const target = calculateRoamTarget(anchor, bounds, MAX_ROAM_RADIUS_PX);
  const diffX = Math.abs(target.x - anchor.x);
  const diffY = Math.abs(target.y - anchor.y);

  assert(diffX <= 6, `Target X roam delta is <= 6px (got: ${diffX}px)`);
  assert(diffY <= 6, `Target Y roam delta is <= 6px (got: ${diffY}px)`);
  assert(target.x >= bounds.minX && target.x <= bounds.maxX, 'Target X stays strictly within screen bounds');
  assert(target.y >= bounds.minY && target.y <= bounds.maxY, 'Target Y stays strictly within screen bounds');
}

// 5. Boundary safety near extreme screen edges
const edgeAnchor = { x: 1104, y: 718 };
for (let i = 0; i < 10; i++) {
  const target = calculateRoamTarget(edgeAnchor, bounds, MAX_ROAM_RADIUS_PX);
  assert(target.x <= bounds.maxX, 'Edge target X never overflows screen bounds');
  assert(target.y <= bounds.maxY, 'Edge target Y never overflows screen bounds');
}

// 6. Active organic flight roaming in designated section
const currentPos = { x: 1040, y: 650 };
for (let i = 0; i < 20; i++) {
  const flightTarget = calculateRoamTarget(currentPos, currentPos, bounds, 30, 75);
  const travelDist = Math.hypot(flightTarget.x - currentPos.x, flightTarget.y - currentPos.y);
  assert(travelDist >= 15, `Flight travel distance is visible (got: ${Math.round(travelDist)}px)`);
  assert(flightTarget.x >= bounds.minX && flightTarget.x <= bounds.maxX, 'Flight target X strictly within screen');
  assert(flightTarget.y >= bounds.minY && flightTarget.y <= bounds.maxY, 'Flight target Y strictly within screen');
}

if (failures > 0) process.exit(1);
console.log('✅ usePetMotion unit tests passed');
