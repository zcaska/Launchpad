import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'public', 'assets', 'mascot');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const P = {
  baseOrange: '#FF7A3C',
  finOrange: '#FF9A6B',
  highlight: '#FFD6B3',
  shadow: '#E05A20',
  shadowDeep: '#C44412',
  eyeDark: '#1A1A1A',
  eyeHighlight: '#FFFFFF',
  ambientGlow: 'rgba(255, 122, 60, 0.28)',
};

function getDefs(idSuffix = '') {
  const s = idSuffix ? `-${idSuffix}` : '';
  return `  <defs>
    <linearGradient id="body-grad${s}" x1="28%" y1="12%" x2="72%" y2="88%">
      <stop offset="0%" stop-color="#FF8F56" />
      <stop offset="42%" stop-color="${P.baseOrange}" />
      <stop offset="100%" stop-color="${P.shadow}" />
    </linearGradient>
    <linearGradient id="hl-grad${s}" x1="35%" y1="15%" x2="55%" y2="50%">
      <stop offset="0%" stop-color="${P.highlight}" stop-opacity="0.75" />
      <stop offset="60%" stop-color="${P.highlight}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${P.highlight}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="sh-grad${s}" x1="50%" y1="55%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="${P.shadow}" stop-opacity="0" />
      <stop offset="65%" stop-color="${P.shadow}" stop-opacity="0.32" />
      <stop offset="100%" stop-color="${P.shadowDeep}" stop-opacity="0.55" />
    </linearGradient>
    <linearGradient id="fin-l-grad${s}" x1="85%" y1="20%" x2="15%" y2="80%">
      <stop offset="0%" stop-color="#FFAE85" />
      <stop offset="45%" stop-color="${P.finOrange}" />
      <stop offset="100%" stop-color="#E6754C" />
    </linearGradient>
    <linearGradient id="fin-r-grad${s}" x1="15%" y1="20%" x2="85%" y2="80%">
      <stop offset="0%" stop-color="#FFAE85" />
      <stop offset="45%" stop-color="${P.finOrange}" />
      <stop offset="100%" stop-color="#E6754C" />
    </linearGradient>
    <radialGradient id="glow${s}" cx="50%" cy="52%" r="48%">
      <stop offset="0%" stop-color="${P.baseOrange}" stop-opacity="0.28" />
      <stop offset="55%" stop-color="${P.baseOrange}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="${P.baseOrange}" stop-opacity="0" />
    </radialGradient>
  </defs>`;
}

function renderEye(cx, cy, shape, openness = 1, isLeft = true) {
  const baseRx = 5.2;
  const baseRy = 7.6 * openness;

  if (shape === 'happy_arc') {
    return `<path d="M ${cx - 5.5} ${cy + 1.5} Q ${cx} ${cy - 5.5} ${cx + 5.5} ${cy + 1.5}" stroke="${P.eyeDark}" stroke-width="2.4" stroke-linecap="round" fill="none" />`;
  }
  if (shape === 'sleepy_arc') {
    return `<path d="M ${cx - 5} ${cy + 0.5} Q ${cx} ${cy + 2.8} ${cx + 5} ${cy + 0.5}" stroke="${P.eyeDark}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.75" />`;
  }
  if (shape === 'sad_droop') {
    const d = isLeft
      ? `M ${cx - 5} ${cy + 3} Q ${cx} ${cy - 2} ${cx + 5} ${cy + 1}`
      : `M ${cx - 5} ${cy + 1} Q ${cx} ${cy - 2} ${cx + 5} ${cy + 3}`;
    return `<g>
      <path d="${d}" stroke="${P.eyeDark}" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <circle cx="${cx}" cy="${cy + 2.5}" r="2.2" fill="${P.eyeDark}" />
      <circle cx="${cx - 0.8}" cy="${cy + 1.8}" r="0.9" fill="${P.eyeHighlight}" />
    </g>`;
  }
  if (shape === 'wink') {
    return `<path d="M ${cx - 5} ${cy + 1} Q ${cx} ${cy - 4} ${cx + 5} ${cy + 1}" stroke="${P.eyeDark}" stroke-width="2.4" stroke-linecap="round" fill="none" />`;
  }
  if (shape === 'focused_slant') {
    const slantDx = isLeft ? 1.5 : -1.5;
    const browD = isLeft
      ? `M ${cx - 6} ${cy - 4} L ${cx + 5} ${cy - 1.5}`
      : `M ${cx - 5} ${cy - 1.5} L ${cx + 6} ${cy - 4}`;
    return `<g>
      <ellipse cx="${cx + slantDx * 0.4}" cy="${cy + 0.5}" rx="${(baseRx * 0.95).toFixed(2)}" ry="${Math.max(3, baseRy * 0.78).toFixed(2)}" fill="${P.eyeDark}" />
      <path d="${browD}" stroke="${P.shadow}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.8" />
      <circle cx="${cx - 1.4}" cy="${cy - 1.2}" r="1.6" fill="${P.eyeHighlight}" />
    </g>`;
  }
  if (shape === 'surprised_wide') {
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="6.8" fill="${P.eyeDark}" />
      <circle cx="${cx - 1.8}" cy="${cy - 2.2}" r="2.6" fill="${P.eyeHighlight}" />
      <circle cx="${cx + 2.2}" cy="${cy + 2.4}" r="1.2" fill="${P.eyeHighlight}" opacity="0.8" />
    </g>`;
  }
  if (shape === 'squint') {
    return `<g>
      <ellipse cx="${cx}" cy="${cy}" rx="${baseRx}" ry="${Math.max(2.8, baseRy * 0.65).toFixed(2)}" fill="${P.eyeDark}" />
      <circle cx="${cx - 1.4}" cy="${cy - 1.0}" r="1.6" fill="${P.eyeHighlight}" />
    </g>`;
  }

  // Open
  return `<g>
    <ellipse cx="${cx}" cy="${cy}" rx="${baseRx}" ry="${Math.max(1.5, baseRy).toFixed(2)}" fill="${P.eyeDark}" />
    <circle cx="${cx - 1.5}" cy="${cy - 2.4}" r="2.3" fill="${P.eyeHighlight}" />
    <circle cx="${cx + 1.8}" cy="${cy + 2.5}" r="1.1" fill="${P.eyeHighlight}" opacity="0.85" />
  </g>`;
}

function renderMouth(shape) {
  switch (shape) {
    case 'smile':
      return `<path d="M 55.5 55.5 Q 60 61 64.5 55.5" stroke="${P.eyeDark}" stroke-width="2.2" stroke-linecap="round" fill="none" />`;
    case 'gentle_smile':
      return `<path d="M 56.5 56 Q 60 59.5 63.5 56" stroke="${P.eyeDark}" stroke-width="2.0" stroke-linecap="round" fill="none" />`;
    case 'open_smile':
      return `<g>
        <path d="M 55 54.5 Q 60 62.5 65 54.5 Q 60 57 55 54.5 Z" fill="${P.eyeDark}" stroke="${P.eyeDark}" stroke-width="0.8" stroke-linejoin="round" />
        <path d="M 57 58 Q 60 61.5 63 58 Q 60 57.2 57 58 Z" fill="${P.finOrange}" />
      </g>`;
    case 'open_round':
      return `<ellipse cx="60" cy="57" rx="3.2" ry="4.2" fill="${P.eyeDark}" />`;
    case 'down':
      return `<path d="M 56 59 Q 60 54.8 64 59" stroke="${P.eyeDark}" stroke-width="2.2" stroke-linecap="round" fill="none" />`;
    case 'focused_line':
      return `<line x1="57.2" y1="57" x2="62.8" y2="57" stroke="${P.eyeDark}" stroke-width="2.0" stroke-linecap="round" />`;
    case 'line':
    default:
      return `<line x1="57.5" y1="56.5" x2="62.5" y2="56.5" stroke="${P.eyeDark}" stroke-width="1.8" stroke-linecap="round" opacity="0.8" />`;
  }
}

function renderSparkle(x, y, r = 3.5) {
  return `<path d="M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z" fill="${P.highlight}" />`;
}

function buildMascotSvg({
  leftFinAngle = 0,
  rightFinAngle = 0,
  leftEye = 'open',
  rightEye = 'open',
  mouth = 'gentle_smile',
  openness = 1,
  bodyTilt = 0,
  glow = false,
  sparkles = false,
  idSuffix = '',
}) {
  const s = idSuffix ? `-${idSuffix}` : '';
  const defs = getDefs(idSuffix);

  const glowSvg = glow
    ? `  <ellipse cx="60" cy="52" rx="54" ry="42" fill="url(#glow${s})" data-part="ambient-glow" />\n`
    : '';

  const sparklesSvg = sparkles
    ? `  <g data-part="sparkles">
    ${renderSparkle(18, 22, 3.5)}
    ${renderSparkle(102, 20, 4)}
    ${renderSparkle(22, 72, 2.8)}
    ${renderSparkle(98, 70, 3.2)}
  </g>\n`
    : '';

  return `<svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
${defs}
${glowSvg}${sparklesSvg}  <g transform="rotate(${bodyTilt}, 60, 52)">
    <!-- Left Fin -->
    <g data-part="fin-left" transform="rotate(${leftFinAngle}, 26, 54)">
      <path d="M 26 49 C 16 46, 7 51, 6 60 C 5 67, 13 70, 26 59 Z" fill="url(#fin-l-grad${s})" />
      <path d="M 24 51 C 18 49, 11 53, 10 59 C 14 57, 19 55, 25 54 Z" fill="${P.highlight}" opacity="0.55" />
    </g>

    <!-- Right Fin -->
    <g data-part="fin-right" transform="rotate(${rightFinAngle}, 94, 54)">
      <path d="M 94 49 C 104 46, 113 51, 114 60 C 115 67, 107 70, 94 59 Z" fill="url(#fin-r-grad${s})" />
      <path d="M 96 51 C 102 49, 109 53, 110 59 C 106 57, 101 55, 95 54 Z" fill="${P.highlight}" opacity="0.55" />
    </g>

    <!-- Floating Pebble Body -->
    <g data-part="body">
      <path d="M 60 23.5 C 74 23.8, 86 28.5, 92 38 C 97 45.8, 96 57.5, 92 65.5 C 87.5 73, 76 76.5, 60 76.5 C 44 76.5, 32.5 73, 28 65.5 C 24 57.5, 23 45.8, 28 38 C 34 28.5, 46 23.8, 60 23.5 Z" fill="url(#body-grad${s})" />
      <path data-part="body-highlight" d="M 60 24 C 47 24.5, 36 29, 30 38 C 26 44, 25 53, 29 60 C 31 52, 36 41, 46 34 C 54 28.5, 66 26.5, 78 27 C 72 25, 66 24, 60 24 Z" fill="url(#hl-grad${s})" />
      <path d="M 44 26.5 Q 58 24.2 72 26.8" stroke="${P.highlight}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.5" />
      <path data-part="body-shadow" d="M 28 65.5 C 32.5 73, 44 76.5, 60 76.5 C 76 76.5, 87.5 73, 92 65.5 C 84 69.5, 73 72, 60 72 C 47 72, 36 69.5, 28 65.5 Z" fill="url(#sh-grad${s})" />
    </g>

    <!-- Face Elements -->
    <g data-part="face">
      <g data-part="eye-left">
        ${renderEye(47, 49, leftEye, openness, true)}
      </g>
      <g data-part="eye-right">
        ${renderEye(73, 49, rightEye, openness, false)}
      </g>
      <g data-part="mouth">
        ${renderMouth(mouth)}
      </g>
    </g>
  </g>
</svg>`;
}

// 1. Canonical Neutral Illustration
const neutralSvg = buildMascotSvg({
  leftFinAngle: 0,
  rightFinAngle: 0,
  leftEye: 'open',
  rightEye: 'open',
  mouth: 'gentle_smile',
  openness: 0.95,
  glow: true,
  idSuffix: 'neutral',
});
fs.writeFileSync(path.join(outDir, 'mascot-canonical-neutral.svg'), neutralSvg, 'utf8');

// 2. Individual Controllable Parts
// 2a. Body only
const bodyPartSvg = `<svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
${getDefs('body-only')}
  <g data-part="body">
    <path d="M 60 23.5 C 74 23.8, 86 28.5, 92 38 C 97 45.8, 96 57.5, 92 65.5 C 87.5 73, 76 76.5, 60 76.5 C 44 76.5, 32.5 73, 28 65.5 C 24 57.5, 23 45.8, 28 38 C 34 28.5, 46 23.8, 60 23.5 Z" fill="url(#body-grad-body-only)" />
    <path data-part="body-highlight" d="M 60 24 C 47 24.5, 36 29, 30 38 C 26 44, 25 53, 29 60 C 31 52, 36 41, 46 34 C 54 28.5, 66 26.5, 78 27 C 72 25, 66 24, 60 24 Z" fill="url(#hl-grad-body-only)" />
    <path d="M 44 26.5 Q 58 24.2 72 26.8" stroke="${P.highlight}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.5" />
    <path data-part="body-shadow" d="M 28 65.5 C 32.5 73, 44 76.5, 60 76.5 C 76 76.5, 87.5 73, 92 65.5 C 84 69.5, 73 72, 60 72 C 47 72, 36 69.5, 28 65.5 Z" fill="url(#sh-grad-body-only)" />
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'part-body.svg'), bodyPartSvg, 'utf8');

// 2b. Left Fin (pivot 26, 54)
const leftFinSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fin-l-iso" x1="85%" y1="20%" x2="15%" y2="80%">
      <stop offset="0%" stop-color="#FFAE85" />
      <stop offset="45%" stop-color="${P.finOrange}" />
      <stop offset="100%" stop-color="#E6754C" />
    </linearGradient>
  </defs>
  <!-- Pivot point at (30, 20) in this bounding frame -->
  <g transform="translate(4, 5)">
    <path d="M 26 14 C 16 11, 7 16, 6 25 C 5 32, 13 35, 26 24 Z" fill="url(#fin-l-iso)" />
    <path d="M 24 16 C 18 14, 11 18, 10 24 C 14 22, 19 20, 25 19 Z" fill="${P.highlight}" opacity="0.55" />
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'part-fin-left.svg'), leftFinSvg, 'utf8');

// 2c. Right Fin (pivot 94, 54)
const rightFinSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fin-r-iso" x1="15%" y1="20%" x2="85%" y2="80%">
      <stop offset="0%" stop-color="#FFAE85" />
      <stop offset="45%" stop-color="${P.finOrange}" />
      <stop offset="100%" stop-color="#E6754C" />
    </linearGradient>
  </defs>
  <g transform="translate(6, 5)">
    <path d="M 4 14 C 14 11, 23 16, 24 25 C 25 32, 17 35, 4 24 Z" fill="url(#fin-r-iso)" />
    <path d="M 6 16 C 12 14, 19 18, 20 24 C 16 22, 11 20, 5 19 Z" fill="${P.highlight}" opacity="0.55" />
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'part-fin-right.svg'), rightFinSvg, 'utf8');

// 2d. Eyes neutral
const eyesNeutralSvg = `<svg width="60" height="30" viewBox="35 35 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g data-part="eye-left">${renderEye(47, 49, 'open', 1, true)}</g>
  <g data-part="eye-right">${renderEye(73, 49, 'open', 1, false)}</g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'part-eyes-neutral.svg'), eyesNeutralSvg, 'utf8');

// 2e. Mouth smile
const mouthSmileSvg = `<svg width="30" height="20" viewBox="50 48 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${renderMouth('smile')}
</svg>`;
fs.writeFileSync(path.join(outDir, 'part-mouth-smile.svg'), mouthSmileSvg, 'utf8');

// 3. Expression SVGs (10 expressions)
const expressions = [
  { id: 'calm', leftFin: 0, rightFin: 0, leftEye: 'open', rightEye: 'open', mouth: 'gentle_smile', openness: 0.85, tilt: 0 },
  { id: 'curious', leftFin: 12, rightFin: -4, leftEye: 'open', rightEye: 'squint', mouth: 'gentle_smile', openness: 0.95, tilt: -6 },
  { id: 'welcoming', leftFin: 8, rightFin: 8, leftEye: 'open', rightEye: 'open', mouth: 'smile', openness: 1.0, tilt: 0 },
  { id: 'happy', leftFin: 18, rightFin: 18, leftEye: 'happy_arc', rightEye: 'happy_arc', mouth: 'smile', openness: 0.9, tilt: 0 },
  { id: 'surprised', leftFin: 14, rightFin: 14, leftEye: 'surprised_wide', rightEye: 'surprised_wide', mouth: 'open_round', openness: 1.0, tilt: 0 },
  { id: 'disappointed', leftFin: -22, rightFin: -22, leftEye: 'sad_droop', rightEye: 'sad_droop', mouth: 'down', openness: 0.65, tilt: 2 },
  { id: 'sleepy', leftFin: -10, rightFin: -10, leftEye: 'sleepy_arc', rightEye: 'sleepy_arc', mouth: 'line', openness: 0.2, tilt: 0 },
  { id: 'excited', leftFin: 24, rightFin: 24, leftEye: 'open', rightEye: 'open', mouth: 'open_smile', openness: 1.0, tilt: 0 },
  { id: 'focused', leftFin: 4, rightFin: 4, leftEye: 'focused_slant', rightEye: 'focused_slant', mouth: 'focused_line', openness: 0.8, tilt: 0 },
  { id: 'determined', leftFin: 10, rightFin: 10, leftEye: 'focused_slant', rightEye: 'focused_slant', mouth: 'focused_line', openness: 0.85, tilt: 0 },
];

for (const e of expressions) {
  const svg = buildMascotSvg({
    leftFinAngle: e.leftFin,
    rightFinAngle: e.rightFin,
    leftEye: e.leftEye,
    rightEye: e.rightEye,
    mouth: e.mouth,
    openness: e.openness,
    bodyTilt: e.tilt,
    idSuffix: e.id,
  });
  fs.writeFileSync(path.join(outDir, `expression-${e.id}.svg`), svg, 'utf8');
}

// 4. Pose Reference SVGs (4 states)
const poses = [
  { id: 'focus', leftFin: 4, rightFin: 4, leftEye: 'focused_slant', rightEye: 'focused_slant', mouth: 'focused_line', openness: 0.8, glow: true, sparkles: false },
  { id: 'low-energy', leftFin: -24, rightFin: -24, leftEye: 'sad_droop', rightEye: 'sad_droop', mouth: 'down', openness: 0.6, glow: false, sparkles: false },
  { id: 'task-completion', leftFin: 22, rightFin: 22, leftEye: 'happy_arc', rightEye: 'happy_arc', mouth: 'open_smile', openness: 0.9, glow: true, sparkles: true },
  { id: 'return-after-away', leftFin: 18, rightFin: 4, leftEye: 'wink', rightEye: 'open', mouth: 'smile', openness: 1.0, glow: true, sparkles: false },
];

for (const p of poses) {
  const svg = buildMascotSvg({
    leftFinAngle: p.leftFin,
    rightFinAngle: p.rightFin,
    leftEye: p.leftEye,
    rightEye: p.rightEye,
    mouth: p.mouth,
    openness: p.openness,
    glow: p.glow,
    sparkles: p.sparkles,
    idSuffix: p.id,
  });
  fs.writeFileSync(path.join(outDir, `pose-${p.id}.svg`), svg, 'utf8');
}

// 5. Asset Manifest JSON
const manifestJson = {
  name: 'Launchpad Mascot Asset Manifest',
  version: '1.0.0',
  description: 'Official 2D/2.5D visual design assets for the Launchpad floating-pebble mascot companion.',
  specification: {
    character: 'Tiny, friendly alien companion with an original floating-pebble silhouette.',
    body: 'Warm coral-orange, clean surface, soft matte finish, diffused lighting, gentle shadows, restrained highlights.',
    fins: 'Two rounded side fins in lighter coral-orange (#FF9A6B), controllable pose.',
    face: 'Adaptive minimal eyes (#1A1A1A) with glossy highlights (#FFFFFF); tiny expressive mouth.',
    limbs: 'None (no arms, hands, legs, or feet).',
    purity: 'No accessories, clothing, belly marks, glowing belly cores, decorative symbols, or text.',
  },
  palette: P,
  viewBox: '0 0 120 100',
  aspectRatio: '6:5',
  pivots: {
    bodyCenter: { x: 60, y: 52 },
    leftFin: { x: 26, y: 54 },
    rightFin: { x: 94, y: 54 },
    leftEye: { x: 47, y: 49 },
    rightEye: { x: 73, y: 49 },
    mouth: { x: 60, y: 56.5 },
  },
  sizingGuidance: {
    micro: { size: 24, usage: 'Badges and compact status dots' },
    compact: { size: 32, usage: 'Folder navigation / compact list items' },
    standard: { size: 48, usage: 'Dashboard squircle tiles and task header' },
    widget: { size: 64, usage: 'Standard floating desktop companion' },
    expanded: { size: 80, usage: 'Active focus hero companion and interactive cards' },
    hero: { size: 120, usage: 'Modals, celebratory takeover, and settings preview' },
  },
  files: {
    canonicalNeutral: '/assets/mascot/mascot-canonical-neutral.svg',
    parts: {
      body: '/assets/mascot/part-body.svg',
      leftFin: '/assets/mascot/part-fin-left.svg',
      rightFin: '/assets/mascot/part-fin-right.svg',
      eyesNeutral: '/assets/mascot/part-eyes-neutral.svg',
      mouthSmile: '/assets/mascot/part-mouth-smile.svg',
    },
    expressions: {
      calm: '/assets/mascot/expression-calm.svg',
      curious: '/assets/mascot/expression-curious.svg',
      welcoming: '/assets/mascot/expression-welcoming.svg',
      happy: '/assets/mascot/expression-happy.svg',
      surprised: '/assets/mascot/expression-surprised.svg',
      disappointed: '/assets/mascot/expression-disappointed.svg',
      sleepy: '/assets/mascot/expression-sleepy.svg',
      excited: '/assets/mascot/expression-excited.svg',
      focused: '/assets/mascot/expression-focused.svg',
      determined: '/assets/mascot/expression-determined.svg',
    },
    poses: {
      focus: '/assets/mascot/pose-focus.svg',
      lowEnergy: '/assets/mascot/pose-low-energy.svg',
      taskCompletion: '/assets/mascot/pose-task-completion.svg',
      returnAfterAway: '/assets/mascot/pose-return-after-away.svg',
    },
  },
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2), 'utf8');

console.log('✅ Generated 16 standalone mascot SVG assets and manifest.json successfully');
