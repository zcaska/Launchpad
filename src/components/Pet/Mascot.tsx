import { memo, useId } from 'react';
import {
  MASCOT_PALETTE as P,
  MascotExpressionId,
  MascotPoseId,
  EyeShape,
  MouthShape,
  MASCOT_EXPRESSIONS,
  MASCOT_STATE_POSES,
} from './mascotManifest';

export interface MascotProps {
  /** Expression preset (e.g. 'calm', 'curious', 'happy', etc.) */
  expression?: MascotExpressionId;
  /** High-level state pose preset (e.g. 'idle', 'focus', 'task_completion', etc.) */
  pose?: MascotPoseId;
  /** Granular left fin rotation override (degrees: positive = up, negative = down) */
  leftFinAngle?: number;
  /** Granular right fin rotation override (degrees: positive = up, negative = down) */
  rightFinAngle?: number;
  /** Granular eye openness override (0.0 to 1.0) */
  eyeOpenness?: number;
  /** Left eye shape override */
  leftEyeShape?: EyeShape;
  /** Right eye shape override */
  rightEyeShape?: EyeShape;
  /** Mouth shape override */
  mouthShape?: MouthShape;
  /** Pebble body tilt in degrees (default from expression) */
  bodyTilt?: number;
  /** Vertical body float displacement */
  bodyOffsetY?: number;
  /** Enable subtle ambient glow on dark UI */
  glow?: boolean;
  /** Enable celebratory sparkles */
  sparkles?: boolean;
  /** Width and height in pixels (maintains 6:5 aspect ratio) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Optional flip horizontally (1 = normal, -1 = mirrored) */
  facing?: 1 | -1;
  /** Disable internal CSS micro-animations if reduced motion is requested */
  reducedMotion?: boolean;
}

/**
 * Renders an adaptive eye at center (cx, cy)
 */
function Eye({
  cx,
  cy,
  shape,
  openness,
  reducedMotion,
  isLeft,
}: {
  cx: number;
  cy: number;
  shape: EyeShape;
  openness: number;
  reducedMotion?: boolean;
  isLeft: boolean;
}) {
  const baseRx = 5.2;
  const baseRy = 7.6 * openness;

  if (shape === 'happy_arc') {
    // Joyful upward curving arc (⌒ ⌒)
    return (
      <path
        d={`M ${cx - 5.5} ${cy + 1.5} Q ${cx} ${cy - 5.5} ${cx + 5.5} ${cy + 1.5}`}
        stroke={P.eyeDark}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (shape === 'sleepy_arc') {
    // Peaceful horizontal resting eyelid line
    return (
      <path
        d={`M ${cx - 5} ${cy + 0.5} Q ${cx} ${cy + 2.8} ${cx + 5} ${cy + 0.5}`}
        stroke={P.eyeDark}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />
    );
  }

  if (shape === 'sad_droop') {
    // Drooped downturned sad eye
    return (
      <g>
        <path
          d={
            isLeft
              ? `M ${cx - 5} ${cy + 3} Q ${cx} ${cy - 2} ${cx + 5} ${cy + 1}`
              : `M ${cx - 5} ${cy + 1} Q ${cx} ${cy - 2} ${cx + 5} ${cy + 3}`
          }
          stroke={P.eyeDark}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={cx} cy={cy + 2.5} r={2.2} fill={P.eyeDark} />
        <circle cx={cx - 0.8} cy={cy + 1.8} r={0.9} fill={P.eyeHighlight} />
      </g>
    );
  }

  if (shape === 'wink') {
    return (
      <path
        d={`M ${cx - 5} ${cy + 1} Q ${cx} ${cy - 4} ${cx + 5} ${cy + 1}`}
        stroke={P.eyeDark}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (shape === 'focused_slant') {
    // Determined, inward-slanted gaze (\ /)
    const slantDx = isLeft ? 1.5 : -1.5;
    return (
      <g>
        <ellipse cx={cx + slantDx * 0.4} cy={cy + 0.5} rx={baseRx * 0.95} ry={Math.max(3, baseRy * 0.78)} fill={P.eyeDark} />
        {/* Inward brow line */}
        <path
          d={
            isLeft
              ? `M ${cx - 6} ${cy - 4} L ${cx + 5} ${cy - 1.5}`
              : `M ${cx - 5} ${cy - 1.5} L ${cx + 6} ${cy - 4}`
          }
          stroke={P.shadow}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
          opacity={0.8}
        />
        {/* Specular highlights */}
        <circle cx={cx - 1.4} cy={cy - 1.2} r={1.6} fill={P.eyeHighlight} />
      </g>
    );
  }

  if (shape === 'surprised_wide') {
    // Wide round circular eye with high specular highlight
    return (
      <g>
        <circle cx={cx} cy={cy} r={6.8} fill={P.eyeDark} />
        <circle cx={cx - 1.8} cy={cy - 2.2} r={2.6} fill={P.eyeHighlight} />
        <circle cx={cx + 2.2} cy={cy + 2.4} r={1.2} fill={P.eyeHighlight} opacity={0.8} />
      </g>
    );
  }

  if (shape === 'squint') {
    // Asymmetric curious / squint eye with curved lower lid
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={baseRx} ry={Math.max(2.8, baseRy * 0.65)} fill={P.eyeDark} />
        <circle cx={cx - 1.4} cy={cy - 1.0} r={1.6} fill={P.eyeHighlight} />
      </g>
    );
  }

  // Standard 'open' eye: large, expressive capsule with glossy highlights
  return (
    <g className={!reducedMotion ? 'mascot-eye-blink' : undefined}>
      <ellipse cx={cx} cy={cy} rx={baseRx} ry={Math.max(1.5, baseRy)} fill={P.eyeDark} />
      {/* Primary glossy highlight (upper quadrant) */}
      <circle cx={cx - 1.5} cy={cy - 2.4} r={2.3} fill={P.eyeHighlight} />
      {/* Secondary subtle reflection */}
      <circle cx={cx + 1.8} cy={cy + 2.5} r={1.1} fill={P.eyeHighlight} opacity={0.85} />
    </g>
  );
}

/**
 * Renders the tiny expressive mouth at center (60, 56.5)
 */
function Mouth({ shape }: { shape: MouthShape }) {
  switch (shape) {
    case 'smile':
      return (
        <path
          d="M 55.5 55.5 Q 60 61 64.5 55.5"
          stroke={P.eyeDark}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'gentle_smile':
      return (
        <path
          d="M 56.5 56 Q 60 59.5 63.5 56"
          stroke={P.eyeDark}
          strokeWidth={2.0}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'open_smile':
      return (
        <g>
          <path
            d="M 55 54.5 Q 60 62.5 65 54.5 Q 60 57 55 54.5 Z"
            fill={P.eyeDark}
            stroke={P.eyeDark}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          {/* Sweet inner warm tongue */}
          <path
            d="M 57 58 Q 60 61.5 63 58 Q 60 57.2 57 58 Z"
            fill={P.finOrange}
          />
        </g>
      );
    case 'open_round':
      return (
        <ellipse
          cx={60}
          cy={57}
          rx={3.2}
          ry={4.2}
          fill={P.eyeDark}
        />
      );
    case 'down':
      return (
        <path
          d="M 56 59 Q 60 54.8 64 59"
          stroke={P.eyeDark}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'focused_line':
      return (
        <line
          x1={57.2}
          y1={57}
          x2={62.8}
          y2={57}
          stroke={P.eyeDark}
          strokeWidth={2.0}
          strokeLinecap="round"
        />
      );
    case 'line':
    default:
      return (
        <line
          x1={57.5}
          y1={56.5}
          x2={62.5}
          y2={56.5}
          stroke={P.eyeDark}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.8}
        />
      );
  }
}

/**
 * Celebratory or inquisitive sparkle
 */
function SparkleStar({ x, y, size = 6, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  const r = size / 2;
  return (
    <g
      className="mascot-sparkle"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x}, ${y})`}
    >
      <path
        d={`M 0 ${-r} Q 0 0 ${r} 0 Q 0 0 0 ${r} Q 0 0 ${-r} 0 Q 0 0 0 ${-r} Z`}
        fill={P.highlight}
      />
    </g>
  );
}

function MascotComponent({
  expression = 'calm',
  pose,
  leftFinAngle: overrideLeftFin,
  rightFinAngle: overrideRightFin,
  eyeOpenness: overrideOpenness,
  leftEyeShape: overrideLeftEye,
  rightEyeShape: overrideRightEye,
  mouthShape: overrideMouth,
  bodyTilt: overrideTilt,
  bodyOffsetY: overrideOffsetY,
  glow: overrideGlow,
  sparkles: overrideSparkles,
  size = 80,
  className = '',
  facing = 1,
  reducedMotion = false,
}: MascotProps) {
  const uid = useId().replace(/:/g, '');

  // Resolve active expression and pose configurations
  const activePoseConfig = pose ? MASCOT_STATE_POSES[pose] : undefined;
  const effectiveExpressionId = activePoseConfig ? activePoseConfig.expression : expression;
  const exprConfig = MASCOT_EXPRESSIONS[effectiveExpressionId] ?? MASCOT_EXPRESSIONS.calm;

  // Resolve values with priority: explicit prop > pose override > expression preset
  const leftFin =
    overrideLeftFin !== undefined
      ? overrideLeftFin
      : activePoseConfig?.overrideLeftFin !== undefined
        ? activePoseConfig.overrideLeftFin
        : exprConfig.leftFinAngle;

  const rightFin =
    overrideRightFin !== undefined
      ? overrideRightFin
      : activePoseConfig?.overrideRightFin !== undefined
        ? activePoseConfig.overrideRightFin
        : exprConfig.rightFinAngle;

  const openness = overrideOpenness !== undefined ? overrideOpenness : exprConfig.eyeOpenness;
  const leftEye = overrideLeftEye ?? exprConfig.leftEye;
  const rightEye = overrideRightEye ?? exprConfig.rightEye;
  const mouth = overrideMouth ?? exprConfig.mouth;
  const tilt = overrideTilt !== undefined ? overrideTilt : exprConfig.bodyTilt;
  const offsetY = overrideOffsetY !== undefined ? overrideOffsetY : activePoseConfig?.bodyOffsetY ?? 0;
  const showGlow = overrideGlow !== undefined ? overrideGlow : activePoseConfig?.glow ?? false;
  const showSparkles = overrideSparkles !== undefined ? overrideSparkles : activePoseConfig?.sparkles ?? false;

  const height = Math.round((size * 100) / 120);

  // Gradient IDs scoped to this component instance
  const ids = {
    bodyGrad: `body-grad-${uid}`,
    highlightGrad: `hl-grad-${uid}`,
    shadowGrad: `sh-grad-${uid}`,
    leftFinGrad: `fin-l-grad-${uid}`,
    rightFinGrad: `fin-r-grad-${uid}`,
    ambientGlow: `glow-${uid}`,
  };

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      className={`lp-mascot select-none transition-transform duration-300 ${
        reducedMotion ? 'lp-reduced' : ''
      } ${className}`.trim()}
      aria-hidden="true"
      style={{
        overflow: 'visible',
        transform: facing === -1 ? 'scaleX(-1)' : undefined,
      }}
    >
      <defs>
        {/* Soft matte body fill with warm coral-orange and gentle diffuse depth */}
        <linearGradient id={ids.bodyGrad} x1="28%" y1="12%" x2="72%" y2="88%">
          <stop offset="0%" stopColor="#FF8F56" />
          <stop offset="42%" stopColor={P.baseOrange} />
          <stop offset="100%" stopColor={P.shadow} />
        </linearGradient>

        {/* Diffused upper highlight gradient (warm light #FFD6B3) */}
        <linearGradient id={ids.highlightGrad} x1="35%" y1="15%" x2="55%" y2="50%">
          <stop offset="0%" stopColor={P.highlight} stopOpacity="0.75" />
          <stop offset="60%" stopColor={P.highlight} stopOpacity="0.25" />
          <stop offset="100%" stopColor={P.highlight} stopOpacity="0" />
        </linearGradient>

        {/* Gentle diffuse shadow gradient along bottom */}
        <linearGradient id={ids.shadowGrad} x1="50%" y1="55%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={P.shadow} stopOpacity="0" />
          <stop offset="65%" stopColor={P.shadow} stopOpacity="0.32" />
          <stop offset="100%" stopColor="#C44412" stopOpacity="0.55" />
        </linearGradient>

        {/* Left fin gradient */}
        <linearGradient id={ids.leftFinGrad} x1="85%" y1="20%" x2="15%" y2="80%">
          <stop offset="0%" stopColor="#FFAE85" />
          <stop offset="45%" stopColor={P.finOrange} />
          <stop offset="100%" stopColor="#E6754C" />
        </linearGradient>

        {/* Right fin gradient */}
        <linearGradient id={ids.rightFinGrad} x1="15%" y1="20%" x2="85%" y2="80%">
          <stop offset="0%" stopColor="#FFAE85" />
          <stop offset="45%" stopColor={P.finOrange} />
          <stop offset="100%" stopColor="#E6754C" />
        </linearGradient>

        {/* Ambient radial glow for Launchpad dark-charcoal UI */}
        <radialGradient id={ids.ambientGlow} cx="50%" cy="52%" r="48%">
          <stop offset="0%" stopColor={P.baseOrange} stopOpacity="0.28" />
          <stop offset="55%" stopColor={P.baseOrange} stopOpacity="0.10" />
          <stop offset="100%" stopColor={P.baseOrange} stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        .lp-mascot .mascot-float    { animation: mascot-float 3.4s ease-in-out infinite; }
        .lp-mascot .mascot-fin-l    { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .lp-mascot .mascot-fin-r    { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .lp-mascot .mascot-sparkle  { animation: mascot-sparkle 1.8s ease-in-out infinite; }
        .lp-mascot .mascot-eye-blink{ animation: mascot-blink 4.8s steps(1, end) infinite; transform-origin: center; }

        @keyframes mascot-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes mascot-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3); }
          50%      { opacity: 1; transform: scale(1.1); }
        }
        @keyframes mascot-blink {
          0%, 94%, 100% { transform: scaleY(1); }
          96%           { transform: scaleY(0.1); }
        }
        .lp-mascot.lp-reduced * {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* Ambient Glow layer (reads gorgeously on Launchpad's dark UI) */}
      {showGlow && (
        <ellipse
          data-part="ambient-glow"
          cx={60}
          cy={52}
          rx={54}
          ry={42}
          fill={`url(#${ids.ambientGlow})`}
        />
      )}

      {/* Celebratory / Inquisitive Sparkles */}
      {showSparkles && (
        <g data-part="sparkles">
          <SparkleStar x={18} y={22} size={7} delay={0} />
          <SparkleStar x={102} y={20} size={8} delay={0.4} />
          <SparkleStar x={22} y={72} size={5} delay={0.8} />
          <SparkleStar x={98} y={70} size={6} delay={0.2} />
        </g>
      )}

      {/* Master motion & tilt group */}
      <g
        className={!reducedMotion ? 'mascot-float' : undefined}
        transform={`translate(0, ${offsetY})`}
      >
        <g transform={`rotate(${tilt}, 60, 52)`}>
          {/*
            Left Fin
            - Attached to body flank at pivot (26, 54)
            - Rounded petal/teardrop silhouette in lighter coral-orange
            - Negative angle tilts down (sad/droopy), positive tilts up (happy/excited)
          */}
          <g
            data-part="fin-left"
            className="mascot-fin-l"
            style={{
              transform: `rotate(${leftFin}deg)`,
              transformOrigin: '26px 54px',
            }}
          >
            <path
              d="M 26 49 C 16 46, 7 51, 6 60 C 5 67, 13 70, 26 59 Z"
              fill={`url(#${ids.leftFinGrad})`}
            />
            {/* Soft inner texture highlight on fin */}
            <path
              d="M 24 51 C 18 49, 11 53, 10 59 C 14 57, 19 55, 25 54 Z"
              fill={P.highlight}
              opacity={0.55}
            />
          </g>

          {/*
            Right Fin
            - Attached to body flank at pivot (94, 54)
            - Rounded petal/teardrop silhouette in lighter coral-orange
          */}
          <g
            data-part="fin-right"
            className="mascot-fin-r"
            style={{
              transform: `rotate(${rightFin}deg)`,
              transformOrigin: '94px 54px',
            }}
          >
            <path
              d="M 94 49 C 104 46, 113 51, 114 60 C 115 67, 107 70, 94 59 Z"
              fill={`url(#${ids.rightFinGrad})`}
            />
            {/* Soft inner texture highlight on fin */}
            <path
              d="M 96 51 C 102 49, 109 53, 110 59 C 106 57, 101 55, 95 54 Z"
              fill={P.highlight}
              opacity={0.55}
            />
          </g>

          {/*
            Main Character Body: Floating-Pebble Silhouette
            - Compact, softly asymmetrical, organic dome
            - Signature subtle top crest/ridge curve around x=58..62
            - Plump cheeks and smooth rounded base
            - Dimensions: width ~70 units, height ~53 units
          */}
          <g data-part="body">
            {/* Base body geometry */}
            <path
              d="M 60 23.5 C 74 23.8, 86 28.5, 92 38 C 97 45.8, 96 57.5, 92 65.5 C 87.5 73, 76 76.5, 60 76.5 C 44 76.5, 32.5 73, 28 65.5 C 24 57.5, 23 45.8, 28 38 C 34 28.5, 46 23.8, 60 23.5 Z"
              fill={`url(#${ids.bodyGrad})`}
            />

            {/* Diffused upper-left warm highlight overlay */}
            <path
              data-part="body-highlight"
              d="M 60 24 C 47 24.5, 36 29, 30 38 C 26 44, 25 53, 29 60 C 31 52, 36 41, 46 34 C 54 28.5, 66 26.5, 78 27 C 72 25, 66 24, 60 24 Z"
              fill={`url(#${ids.highlightGrad})`}
            />

            {/* Subtle gentle dorsal crest highlight line */}
            <path
              d="M 44 26.5 Q 58 24.2 72 26.8"
              stroke={P.highlight}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
              opacity={0.5}
            />

            {/* Soft bottom diffuse ambient shadow */}
            <path
              data-part="body-shadow"
              d="M 28 65.5 C 32.5 73, 44 76.5, 60 76.5 C 76 76.5, 87.5 73, 92 65.5 C 84 69.5, 73 72, 60 72 C 47 72, 36 69.5, 28 65.5 Z"
              fill={`url(#${ids.shadowGrad})`}
            />
          </g>

          {/*
            Face: Adaptive Minimal Eyes and Tiny Expressive Mouth
            - Wide-set eye spacing: Left (47, 49), Right (73, 49)
            - Mouth: Center (60, 56.5)
            - No nose, no cheeks blush circles, no belly markings
          */}
          <g data-part="face">
            {/* Left Eye */}
            <g data-part="eye-left">
              <Eye
                cx={47}
                cy={49}
                shape={leftEye}
                openness={openness}
                reducedMotion={reducedMotion}
                isLeft={true}
              />
            </g>

            {/* Right Eye */}
            <g data-part="eye-right">
              <Eye
                cx={73}
                cy={49}
                shape={rightEye}
                openness={openness}
                reducedMotion={reducedMotion}
                isLeft={false}
              />
            </g>

            {/* Tiny Expressive Mouth */}
            <g data-part="mouth">
              <Mouth shape={mouth} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const Mascot = memo(MascotComponent);
export default Mascot;
