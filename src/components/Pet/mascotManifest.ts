/**
 * Launchpad Mascot Design Reference & Contract
 *
 * Grounded in the official Mascot Reference Sheet:
 * - Character: Tiny, friendly alien companion with an original floating-pebble silhouette.
 * - Body: Warm coral-orange (#FF7A3C), clean surface, soft matte finish, diffused lighting, gentle shadows, restrained highlights.
 * - Fins: Two rounded side fins in lighter coral-orange (#FF9A6B / approx #F28B68). Controllable pose.
 * - Face: Adaptive minimal eyes (#1A1A1A) with glossy highlights (#FFFFFF); tiny expressive mouth.
 * - Limbs: No arms, hands, legs, or feet.
 * - Purity: No accessories, clothing, belly marks, glowing belly cores, decorative symbols, or text.
 */

export const MASCOT_PALETTE = {
  baseOrange: '#FF7A3C',    // Primary body coral-orange
  finOrange: '#FF9A6B',     // Lighter coral for side fins (approx #F28B68)
  highlight: '#FFD6B3',     // Warm diffuse top light
  shadow: '#E05A20',        // Deep orange diffuse ambient shadow
  eyeDark: '#1A1A1A',       // Almost black for pupils/lines
  eyeHighlight: '#FFFFFF',  // Crisp white specular shine
  ambientGlow: 'rgba(255, 122, 60, 0.24)', // Soft aura for dark backgrounds
  darkSurface: '#13171d',   // Launchpad dark-charcoal UI background
  cardSurface: '#1c2127',   // Launchpad elevated surface
} as const;

export type MascotExpressionId =
  | 'calm'
  | 'curious'
  | 'welcoming'
  | 'happy'
  | 'surprised'
  | 'disappointed'
  | 'sleepy'
  | 'excited'
  | 'focused'
  | 'determined';

export type MascotPoseId =
  | 'idle'
  | 'focus'
  | 'low_energy'
  | 'task_completion'
  | 'return_after_away';

export type EyeShape =
  | 'open'          // Large expressive capsule/oval
  | 'happy_arc'     // Upward smiling crescent arc (⌒)
  | 'sleepy_arc'    // Peaceful resting horizontal arc
  | 'surprised_wide'// Wide circular eye
  | 'focused_slant' // Inward slanted brow/top lid
  | 'squint'        // Half-closed lower lid
  | 'wink'          // Closed curved arc for winking
  | 'sad_droop';    // Downward sloping sad arc

export type MouthShape =
  | 'smile'         // Small sweet upward curved smile
  | 'gentle_smile'  // Subtle peaceful smile
  | 'open_smile'    // Open happy smile with tongue
  | 'open_round'    // Surprised 'o'
  | 'down'          // Downturned disappointed arc
  | 'line'          // Neutral soft flat line
  | 'focused_line'; // Firm focused straight/subtle line

export interface MascotExpressionConfig {
  id: MascotExpressionId;
  label: string;
  description: string;
  leftEye: EyeShape;
  rightEye: EyeShape;
  mouth: MouthShape;
  leftFinAngle: number;   // Degrees relative to rest (positive = up, negative = down)
  rightFinAngle: number;
  bodyTilt: number;       // Degrees body rotation
  eyeOpenness: number;    // 0 (closed) to 1 (full open)
}

export interface MascotPoseConfig {
  id: MascotPoseId;
  label: string;
  expression: MascotExpressionId;
  description: string;
  bodyOffsetY: number;    // Vertical floating displacement
  glow: boolean;
  sparkles: boolean;
  overrideLeftFin?: number;
  overrideRightFin?: number;
}

export const MASCOT_EXPRESSIONS: Record<MascotExpressionId, MascotExpressionConfig> = {
  calm: {
    id: 'calm',
    label: 'Calm',
    description: 'Relaxed, gentle float with peaceful soft smile and serene gaze.',
    leftEye: 'open',
    rightEye: 'open',
    mouth: 'gentle_smile',
    leftFinAngle: 0,
    rightFinAngle: 0,
    bodyTilt: 0,
    eyeOpenness: 0.85,
  },
  curious: {
    id: 'curious',
    label: 'Curious',
    description: 'Attentive, asymmetrical tilt with one wide eye and one slightly inquisitive squint.',
    leftEye: 'open',
    rightEye: 'squint',
    mouth: 'gentle_smile',
    leftFinAngle: 12,
    rightFinAngle: -4,
    bodyTilt: -6,
    eyeOpenness: 0.95,
  },
  welcoming: {
    id: 'welcoming',
    label: 'Welcoming',
    description: 'Warm, open round eyes with glossy highlights and receptive lifted fins.',
    leftEye: 'open',
    rightEye: 'open',
    mouth: 'smile',
    leftFinAngle: 8,
    rightFinAngle: 8,
    bodyTilt: 0,
    eyeOpenness: 1.0,
  },
  happy: {
    id: 'happy',
    label: 'Happy',
    description: 'Joyful upward crescent eyes and sweet curved smile with cheerful fins.',
    leftEye: 'happy_arc',
    rightEye: 'happy_arc',
    mouth: 'smile',
    leftFinAngle: 18,
    rightFinAngle: 18,
    bodyTilt: 0,
    eyeOpenness: 0.9,
  },
  surprised: {
    id: 'surprised',
    label: 'Surprised',
    description: 'Wide circular eyes and round open mouth with perked fins.',
    leftEye: 'surprised_wide',
    rightEye: 'surprised_wide',
    mouth: 'open_round',
    leftFinAngle: 14,
    rightFinAngle: 14,
    bodyTilt: 0,
    eyeOpenness: 1.0,
  },
  disappointed: {
    id: 'disappointed',
    label: 'Disappointed',
    description: 'Drooping downturned eyes, tiny down-turned mouth, and droopy side fins.',
    leftEye: 'sad_droop',
    rightEye: 'sad_droop',
    mouth: 'down',
    leftFinAngle: -22,
    rightFinAngle: -22,
    bodyTilt: 2,
    eyeOpenness: 0.65,
  },
  sleepy: {
    id: 'sleepy',
    label: 'Sleepy',
    description: 'Peaceful horizontal resting eyelid arcs and relaxed resting fins.',
    leftEye: 'sleepy_arc',
    rightEye: 'sleepy_arc',
    mouth: 'line',
    leftFinAngle: -10,
    rightFinAngle: -10,
    bodyTilt: 0,
    eyeOpenness: 0.2,
  },
  excited: {
    id: 'excited',
    label: 'Excited',
    description: 'Joyful wide eyes, big open smile, and high energetic fins.',
    leftEye: 'open',
    rightEye: 'open',
    mouth: 'open_smile',
    leftFinAngle: 24,
    rightFinAngle: 24,
    bodyTilt: 0,
    eyeOpenness: 1.0,
  },
  focused: {
    id: 'focused',
    label: 'Focused',
    description: 'Calm, attentive gaze focused on work, serene neutral expression, and poised forward typing fins.',
    leftEye: 'focused_slant',
    rightEye: 'focused_slant',
    mouth: 'focused_line',
    leftFinAngle: -6,
    rightFinAngle: -6,
    bodyTilt: 0,
    eyeOpenness: 0.85,
  },
  determined: {
    id: 'determined',
    label: 'Determined',
    description: 'Resolute sharp angled eyes and firm determined mouth line.',
    leftEye: 'focused_slant',
    rightEye: 'focused_slant',
    mouth: 'focused_line',
    leftFinAngle: 10,
    rightFinAngle: 10,
    bodyTilt: 0,
    eyeOpenness: 0.85,
  },
};

export const MASCOT_STATE_POSES: Record<MascotPoseId, MascotPoseConfig> = {
  idle: {
    id: 'idle',
    label: 'Normal Idle',
    expression: 'calm',
    description: 'Context-aware gentle floating cycle between calm, curious, and welcoming.',
    bodyOffsetY: 0,
    glow: false,
    sparkles: false,
  },
  focus: {
    id: 'focus',
    label: 'Focus Session',
    expression: 'focused',
    description: 'Distraction-free, poised posture alongside running timer with forward typing fins.',
    bodyOffsetY: 0,
    glow: true,
    sparkles: false,
    overrideLeftFin: -6,
    overrideRightFin: -6,
  },
  low_energy: {
    id: 'low_energy',
    label: 'Tired / Low Energy',
    expression: 'disappointed',
    description: 'Subdued quiet posture with droopy fins after prolonged inactivity.',
    bodyOffsetY: 4,
    glow: false,
    sparkles: false,
    overrideLeftFin: -24,
    overrideRightFin: -24,
  },
  task_completion: {
    id: 'task_completion',
    label: 'Task Completion',
    expression: 'happy',
    description: 'Celebratory double lift with joyful arched eyes and ambient sparkles.',
    bodyOffsetY: -4,
    glow: true,
    sparkles: true,
    overrideLeftFin: 22,
    overrideRightFin: 22,
  },
  return_after_away: {
    id: 'return_after_away',
    label: 'Return After Away',
    expression: 'curious',
    description: 'Warm reunion with welcoming wink and friendly lifted fin.',
    bodyOffsetY: -2,
    glow: true,
    sparkles: false,
    overrideLeftFin: 18,
    overrideRightFin: 4,
  },
};

export const MASCOT_SIZING = {
  defaultViewBox: '0 0 120 100',
  aspectRatio: '6:5',
  sizes: {
    micro: { size: 24, label: '24px (Badges / Mini status)' },
    compact: { size: 32, label: '32px (Compact icon / List view)' },
    standard: { size: 48, label: '48px (Dashboard tile / Squircle)' },
    widget: { size: 64, label: '64px (Floating companion standard)' },
    expanded: { size: 80, label: '80px (Enlarged interactive pet)' },
    hero: { size: 120, label: '120px (Showcase / Modal hero)' },
  },
} as const;

/**
 * Controllable Parts Contract for the Animation Agent:
 * - Body: root pebble geometry, pivot (60, 52)
 * - Left Fin: pivot (26, 54), controllable rotation (-30deg to +35deg)
 * - Right Fin: pivot (94, 54), controllable rotation (-35deg to +30deg)
 * - Left Eye: center (47, 49), scaleY/morph
 * - Right Eye: center (73, 49), scaleY/morph
 * - Mouth: center (60, 56.5), morphable path
 * - Ambient Glow: radial halo with controllable opacity
 */
export interface MascotAnimationContract {
  viewBox: string;
  pivots: {
    bodyCenter: { x: number; y: number };
    leftFin: { x: number; y: number };
    rightFin: { x: number; y: number };
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  svgSelectors: {
    root: string;
    body: string;
    bodyHighlight: string;
    bodyShadow: string;
    leftFin: string;
    rightFin: string;
    leftEye: string;
    rightEye: string;
    mouth: string;
    ambientGlow: string;
    sparkles: string;
  };
}

export const MASCOT_ANIMATION_CONTRACT: MascotAnimationContract = {
  viewBox: '0 0 120 100',
  pivots: {
    bodyCenter: { x: 60, y: 52 },
    leftFin: { x: 26, y: 54 },
    rightFin: { x: 94, y: 54 },
    leftEye: { x: 47, y: 49 },
    rightEye: { x: 73, y: 49 },
    mouth: { x: 60, y: 56.5 },
  },
  svgSelectors: {
    root: '.lp-mascot',
    body: '[data-part="body"]',
    bodyHighlight: '[data-part="body-highlight"]',
    bodyShadow: '[data-part="body-shadow"]',
    leftFin: '[data-part="fin-left"]',
    rightFin: '[data-part="fin-right"]',
    leftEye: '[data-part="eye-left"]',
    rightEye: '[data-part="eye-right"]',
    mouth: '[data-part="mouth"]',
    ambientGlow: '[data-part="ambient-glow"]',
    sparkles: '[data-part="sparkles"]',
  },
};
