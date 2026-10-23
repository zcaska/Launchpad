import {
  clampCoordinate,
  calculatePlacement,
  usePetMotion,
  MAX_ROAM_RADIUS_PX,
  MASCOT_BOUNDS,
  getScreenBounds,
  calculateRoamTarget,
  calculateRoamWaypoint,
  getDefaultPosition,
  getAdaptiveMascotSize,
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
assert(typeof calculateRoamWaypoint === 'function', 'calculateRoamWaypoint is exported as function');
assert(typeof getDefaultPosition === 'function', 'getDefaultPosition is exported as function');
assert(typeof getAdaptiveMascotSize === 'function', 'getAdaptiveMascotSize is exported as function');

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

// 6. Adaptive Mascot Sizing across Mobile, Tablet, and Desktop screens
assert(getAdaptiveMascotSize(360) === 56, 'Mobile (360px): size is 56px');
assert(getAdaptiveMascotSize(375) === 56, 'Mobile (375px): size is 56px');
assert(getAdaptiveMascotSize(412) === 56, 'Mobile (412px): size is 56px');
assert(getAdaptiveMascotSize(600) === 68, 'Tablet (600px): size is 68px');
assert(getAdaptiveMascotSize(768) === 84, 'Desktop (768px): size is 84px');
assert(getAdaptiveMascotSize(1440) === 84, 'Large Desktop (1440px): size is 84px');

// 7. Mobile Viewport Bounds & Safe Insets
const mobileBounds = getScreenBounds(375, 667);
assert(mobileBounds.isMobile === true, 'Viewport 375x667 recognized as mobile');
assert(mobileBounds.size === 56, 'Mobile mascot size is 56px');
assert(mobileBounds.minY === 56, 'Mobile top safe inset protects sticky header (>=56px)');
assert(mobileBounds.maxY < 667 - 56, 'Mobile bottom safe inset protects bottom bar/gesture pill');
assert(mobileBounds.minX === 8, 'Mobile padding is 8px');
assert(mobileBounds.maxX === 375 - 56 - 8, 'Mobile maxX accounts for 56px mascot + padding');

// Default position on mobile
const mobileDefault = getDefaultPosition(undefined, 375, 667);
assert(mobileDefault.x >= mobileBounds.minX && mobileDefault.x <= mobileBounds.maxX, 'Mobile default X is in bounds');
assert(mobileDefault.y >= mobileBounds.minY && mobileDefault.y <= mobileBounds.maxY, 'Mobile default Y is in bounds');

// Mobile Roam Waypoint generation
for (let i = 0; i < 15; i++) {
  const wp = calculateRoamWaypoint(375, 667, mobileBounds);
  assert(wp.x >= mobileBounds.minX && wp.x <= mobileBounds.maxX, `Mobile waypoint X (${wp.x}) stays within bounds`);
  assert(wp.y >= mobileBounds.minY && wp.y <= mobileBounds.maxY, `Mobile waypoint Y (${wp.y}) stays within bounds`);
}

// Desktop Roam Waypoint generation
const desktopBounds = getScreenBounds(1440, 900);
assert(desktopBounds.isMobile === false, 'Viewport 1440x900 recognized as desktop');
assert(desktopBounds.size === 84, 'Desktop mascot size is 84px');

for (let i = 0; i < 15; i++) {
  const wp = calculateRoamWaypoint(1440, 900, desktopBounds);
  assert(wp.x >= desktopBounds.minX && wp.x <= desktopBounds.maxX, `Desktop waypoint X (${wp.x}) stays within bounds`);
  assert(wp.y >= desktopBounds.minY && wp.y <= desktopBounds.maxY, `Desktop waypoint Y (${wp.y}) stays within bounds`);
}

if (failures > 0) process.exit(1);
console.log('✅ usePetMotion unit tests passed');
