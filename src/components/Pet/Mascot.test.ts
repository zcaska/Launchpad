import fs from 'node:fs';
import path from 'node:path';
import {
  MASCOT_PALETTE,
  MASCOT_EXPRESSIONS,
  MASCOT_STATE_POSES,
  MASCOT_SIZING,
  MASCOT_ANIMATION_CONTRACT,
  MascotExpressionId,
  MascotPoseId,
} from './mascotManifest';

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

// 1. Color Palette Integrity
assert(MASCOT_PALETTE.baseOrange === '#FF7A3C', 'Base coral-orange matches #FF7A3C');
assert(MASCOT_PALETTE.finOrange === '#FF9A6B', 'Fin orange matches #FF9A6B');
assert(MASCOT_PALETTE.highlight === '#FFD6B3', 'Highlight matches #FFD6B3');
assert(MASCOT_PALETTE.shadow === '#E05A20', 'Shadow matches #E05A20');
assert(MASCOT_PALETTE.eyeDark === '#1A1A1A', 'Eye dark matches #1A1A1A');
assert(MASCOT_PALETTE.eyeHighlight === '#FFFFFF', 'Eye specular highlight is pure white #FFFFFF');

// 2. All 10 Expressions Exist and Have Valid Geometry & Fin Angles
const requiredExpressions: MascotExpressionId[] = [
  'calm',
  'curious',
  'welcoming',
  'happy',
  'surprised',
  'disappointed',
  'sleepy',
  'excited',
  'focused',
  'determined',
];

assert(
  requiredExpressions.length === 10,
  'All 10 required expressions are enumerated'
);

for (const exprId of requiredExpressions) {
  const expr = MASCOT_EXPRESSIONS[exprId];
  assert(!!expr, `Expression "${exprId}" is defined in MASCOT_EXPRESSIONS`);
  assert(typeof expr.leftFinAngle === 'number', `Expression "${exprId}" has leftFinAngle number`);
  assert(typeof expr.rightFinAngle === 'number', `Expression "${exprId}" has rightFinAngle number`);
  assert(expr.eyeOpenness >= 0 && expr.eyeOpenness <= 1, `Expression "${exprId}" eyeOpenness is between 0 and 1`);
  assert(!!expr.leftEye && !!expr.rightEye, `Expression "${exprId}" has left and right eye shapes`);
  assert(!!expr.mouth, `Expression "${exprId}" has mouth shape`);
}

// 3. Curiosity Expression Has Intentional Asymmetry
const curious = MASCOT_EXPRESSIONS.curious;
assert(
  curious.leftEye !== curious.rightEye,
  'Curious expression has asymmetrical eyes (inquisitive look)'
);
assert(
  curious.bodyTilt < 0,
  'Curious expression tilts pebble body (-6deg)'
);

// 4. All 4 State Pose References
const requiredPoses: MascotPoseId[] = [
  'idle',
  'focus',
  'low_energy',
  'task_completion',
  'return_after_away',
];

for (const poseId of requiredPoses) {
  const pose = MASCOT_STATE_POSES[poseId];
  assert(!!pose, `Pose "${poseId}" is defined in MASCOT_STATE_POSES`);
  assert(!!MASCOT_EXPRESSIONS[pose.expression], `Pose "${poseId}" links to valid expression "${pose.expression}"`);
}

// 5. Animation Contract Pivots and Part Selectors
assert(
  MASCOT_ANIMATION_CONTRACT.viewBox === '0 0 120 100',
  'Animation contract standard viewBox is 0 0 120 100'
);
assert(
  MASCOT_ANIMATION_CONTRACT.pivots.leftFin.x === 26 && MASCOT_ANIMATION_CONTRACT.pivots.leftFin.y === 54,
  'Left fin pivot is defined at (26, 54)'
);
assert(
  MASCOT_ANIMATION_CONTRACT.pivots.rightFin.x === 94 && MASCOT_ANIMATION_CONTRACT.pivots.rightFin.y === 54,
  'Right fin pivot is defined at (94, 54)'
);
assert(
  MASCOT_ANIMATION_CONTRACT.svgSelectors.body === '[data-part="body"]',
  'Body has stable selector [data-part="body"]'
);
assert(
  MASCOT_ANIMATION_CONTRACT.svgSelectors.leftFin === '[data-part="fin-left"]',
  'Left fin has stable selector [data-part="fin-left"]'
);
assert(
  MASCOT_ANIMATION_CONTRACT.svgSelectors.rightFin === '[data-part="fin-right"]',
  'Right fin has stable selector [data-part="fin-right"]'
);

// 6. Sizing Guidance
const sizes = MASCOT_SIZING.sizes;
assert(sizes.micro.size === 24, 'Micro size is 24px');
assert(sizes.compact.size === 32, 'Compact size is 32px');
assert(sizes.standard.size === 48, 'Standard size is 48px');
assert(sizes.widget.size === 64, 'Widget size is 64px');
assert(sizes.expanded.size === 80, 'Expanded size is 80px');
assert(sizes.hero.size === 120, 'Hero size is 120px');

// 7. Verify Standalone Assets on Disk
const publicAssetsDir = path.resolve(process.cwd(), 'public', 'assets', 'mascot');
assert(fs.existsSync(publicAssetsDir), 'public/assets/mascot directory exists');

const requiredFiles = [
  'mascot-canonical-neutral.svg',
  'part-body.svg',
  'part-fin-left.svg',
  'part-fin-right.svg',
  'part-eyes-neutral.svg',
  'part-mouth-smile.svg',
  'expression-calm.svg',
  'expression-curious.svg',
  'expression-welcoming.svg',
  'expression-happy.svg',
  'expression-surprised.svg',
  'expression-disappointed.svg',
  'expression-sleepy.svg',
  'expression-excited.svg',
  'expression-focused.svg',
  'expression-determined.svg',
  'pose-focus.svg',
  'pose-low-energy.svg',
  'pose-task-completion.svg',
  'pose-return-after-away.svg',
  'manifest.json',
];

for (const filename of requiredFiles) {
  const filePath = path.join(publicAssetsDir, filename);
  assert(fs.existsSync(filePath), `Generated asset file exists: ${filename}`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.length > 50, `Asset ${filename} contains valid non-empty content`);
}

// 8. Verify Manifest JSON Structure
const manifestRaw = fs.readFileSync(path.join(publicAssetsDir, 'manifest.json'), 'utf8');
const manifestObj = JSON.parse(manifestRaw);
assert(manifestObj.name === 'Launchpad Mascot Asset Manifest', 'Manifest name is correct');
assert(manifestObj.viewBox === '0 0 120 100', 'Manifest specifies 0 0 120 100 viewBox');
assert(Object.keys(manifestObj.files.expressions).length === 10, 'Manifest lists 10 expressions');
assert(Object.keys(manifestObj.files.poses).length === 4, 'Manifest lists 4 poses');

if (failures > 0) {
  console.error(`\n❌ Mascot test suite completed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('\n✅ All Mascot unit & asset manifest tests passed successfully!');
}
