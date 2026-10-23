import { memo, useState, useEffect } from 'react';
import { PetState, PetTier } from '../../utils/petState';
import { Mascot } from './Mascot';
import {
  MascotExpressionId,
  MascotPoseId,
  MASCOT_PALETTE as P,
} from './mascotManifest';

/**
 * Launchpad Pet Sprite — Visual Presentation Component.
 *
 * Grounded in the official Mascot Reference Sheet:
 * - Floating-pebble alien silhouette
 * - Warm coral-orange (#FF7A3C) with soft matte shading
 * - Lighter coral rounded side fins (#FF9A6B), controllable pose
 * - Adaptive minimal eyes (#1A1A1A) with glossy white highlights
 * - Tiny expressive mouth capable of smile, open, down, line
 * - No arms, no legs, no feet, no ears, no belly marks, no clothes
 * - Reads with striking clarity on Launchpad's dark-charcoal UI (#13171d)
 */
export interface PetSpriteProps {
  state: PetState;
  tier: PetTier;
  facing: 1 | -1;
  isFlying: boolean;
  isDragging: boolean;
  isSippingCoffee: boolean;
  reducedMotion: boolean;
  petted: boolean;
}

/**
 * Maps the app behavioral state machine (PetState) to the Mascot visual specification
 */
export function resolveMascotVisual(
  state: PetState,
  petted: boolean,
  isDragging: boolean,
  idleMicroExpr: 'calm' | 'curious' | 'welcoming' = 'calm',
  isSippingCoffee: boolean = false
): {
  expression: MascotExpressionId;
  pose?: MascotPoseId;
  leftFinAngle?: number;
  rightFinAngle?: number;
  glow: boolean;
  sparkles: boolean;
} {
  // Direct petting interaction overrides expression to joyful
  if (petted) {
    return {
      expression: 'happy',
      leftFinAngle: 22,
      rightFinAngle: 22,
      glow: true,
      sparkles: true,
    };
  }

  // Being dragged: wide attentive eyes, fluttering fins
  if (isDragging) {
    return {
      expression: 'surprised',
      leftFinAngle: 12,
      rightFinAngle: 12,
      glow: false,
      sparkles: false,
    };
  }

  // Active sipping coffee: relaxed forward fins
  if (isSippingCoffee) {
    return {
      expression: 'calm',
      leftFinAngle: 12,
      rightFinAngle: 12,
      glow: false,
      sparkles: false,
    };
  }

  switch (state) {
    case 'happy':
      return {
        expression: 'happy',
        pose: 'task_completion',
        leftFinAngle: 20,
        rightFinAngle: 20,
        glow: true,
        sparkles: true,
      };

    case 'celebration-streak':
      return {
        expression: 'excited',
        pose: 'task_completion',
        leftFinAngle: 24,
        rightFinAngle: 24,
        glow: true,
        sparkles: true,
      };

    case 'welcome-back':
      return {
        expression: 'curious',
        pose: 'return_after_away',
        leftFinAngle: 18,
        rightFinAngle: 6,
        glow: true,
        sparkles: false,
      };

    case 'focused':
      return {
        expression: 'focused',
        pose: 'focus',
        leftFinAngle: -6,
        rightFinAngle: -6,
        glow: true,
        sparkles: false,
      };

    case 'curious':
      return {
        expression: 'curious',
        leftFinAngle: 14,
        rightFinAngle: -4,
        glow: false,
        sparkles: false,
      };

    case 'thinking':
      return {
        expression: 'curious',
        leftFinAngle: 8,
        rightFinAngle: 0,
        glow: false,
        sparkles: false,
      };

    case 'sad':
      return {
        expression: 'disappointed',
        pose: 'low_energy',
        leftFinAngle: -24,
        rightFinAngle: -24,
        glow: false,
        sparkles: false,
      };

    case 'sleeping':
      return {
        expression: 'sleepy',
        leftFinAngle: -12,
        rightFinAngle: -12,
        glow: false,
        sparkles: false,
      };

    case 'overwhelmed':
      return {
        expression: 'surprised',
        leftFinAngle: -10,
        rightFinAngle: -10,
        glow: false,
        sparkles: false,
      };

    case 'coffee-break':
      return {
        expression: 'calm',
        leftFinAngle: 12,
        rightFinAngle: 12,
        glow: false,
        sparkles: false,
      };

    case 'roaming':
      return {
        expression: 'welcoming',
        leftFinAngle: 10,
        rightFinAngle: 10,
        glow: false,
        sparkles: false,
      };

    case 'idle':
    default:
      if (idleMicroExpr === 'curious') {
        return {
          expression: 'curious',
          leftFinAngle: 10,
          rightFinAngle: -2,
          glow: false,
          sparkles: false,
        };
      }
      if (idleMicroExpr === 'welcoming') {
        return {
          expression: 'welcoming',
          leftFinAngle: 8,
          rightFinAngle: 8,
          glow: false,
          sparkles: false,
        };
      }
      return {
        expression: 'calm',
        pose: 'idle',
        leftFinAngle: 0,
        rightFinAngle: 0,
        glow: false,
        sparkles: false,
      };
  }
}

/**
 * Resolves the primary motion class based on semantic PetState and user preferences.
 * Adheres strictly to the Launchpad Mascot - Motion & Animation Sheet.
 */
export function getPetMotionClass(
  state: PetState,
  reducedMotion: boolean,
  isDragging: boolean,
  petted: boolean
): string {
  if (reducedMotion || isDragging) return '';
  if (petted) return 'pet-motion-petted';

  switch (state) {
    case 'happy':
      return 'pet-motion-routine-bounce';
    case 'celebration-streak':
      return 'pet-motion-major-celebration';
    case 'welcome-back':
      return 'pet-motion-return-greeting';
    case 'focused':
      return 'pet-motion-focus-steady';
    case 'sad':
    case 'sleeping':
      return 'pet-motion-low-energy';
    case 'coffee-break':
      return 'pet-motion-coffee-float';
    case 'idle':
    case 'roaming':
    case 'curious':
    case 'thinking':
    case 'overwhelmed':
    default:
      return 'pet-motion-idle-float';
  }
}

function PetSpriteComponent({
  state,
  tier,
  facing,
  isFlying,
  isDragging,
  isSippingCoffee = false,
  reducedMotion,
  petted,
}: PetSpriteProps) {
  const [idleMicroExpr, setIdleMicroExpr] = useState<'calm' | 'curious' | 'welcoming'>('calm');

  useEffect(() => {
    if (state !== 'idle' || petted || isDragging || reducedMotion) {
      setIdleMicroExpr('calm');
      return;
    }

    let cycleTimeout: ReturnType<typeof setTimeout> | null = null;
    let revertTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const scheduleDrift = () => {
      // Ambient interval between 5-9s of calm
      const calmDuration = 5000 + Math.random() * 4000;

      cycleTimeout = setTimeout(() => {
        if (isCancelled) return;
        // Occasionally show gentle micro-attentive curiosity ('curious' or 'welcoming')
        const nextExpr: 'curious' | 'welcoming' = Math.random() < 0.5 ? 'curious' : 'welcoming';
        setIdleMicroExpr(nextExpr);

        // Hold for 2.8-3.6s, then smoothly return to 'calm'
        const peekDuration = 2800 + Math.random() * 800;
        revertTimeout = setTimeout(() => {
          if (isCancelled) return;
          setIdleMicroExpr('calm');
          scheduleDrift();
        }, peekDuration);
      }, calmDuration);
    };

    scheduleDrift();

    return () => {
      isCancelled = true;
      if (cycleTimeout) clearTimeout(cycleTimeout);
      if (revertTimeout) clearTimeout(revertTimeout);
    };
  }, [state, petted, isDragging, reducedMotion]);

  const visual = resolveMascotVisual(state, petted, isDragging, idleMicroExpr, isSippingCoffee);
  const motionClass = getPetMotionClass(state, reducedMotion, isDragging, petted);

  // Streak master tier adds a rich warm amber ambient aura
  const isStreakMaster = tier === 'streak-master';

  const showCoffeeMug = Boolean(isSippingCoffee || state === 'coffee-break');
  const showLaptop = state === 'focused';

  return (
    <div
      className={`lp-sprite relative inline-flex items-center justify-center ${
        reducedMotion ? 'lp-reduced' : ''
      } ${
        isStreakMaster ? 'drop-shadow-[0_0_12px_rgba(255,122,60,0.55)]' : ''
      }`}
      aria-label={`Launchpad Mascot: ${state}`}
    >
      <style>{`
        /* Mascot Motion System Styles & Keyframes (Launchpad Mascot Animation Sheet) */
        .pet-motion-idle-float {
          animation: pet-idle-float 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .pet-motion-focus-steady {
          animation: pet-focus-steady 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .pet-motion-routine-bounce {
          animation: pet-routine-bounce 0.85s cubic-bezier(0.33, 1, 0.68, 1) 1;
        }
        .pet-motion-major-celebration {
          animation: pet-major-celebration 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1;
        }
        .pet-motion-return-greeting {
          animation: pet-return-greeting 1.6s cubic-bezier(0.25, 1, 0.5, 1) 1;
        }
        .pet-motion-low-energy {
          animation: pet-rest-float 4.8s ease-in-out infinite;
        }
        .pet-motion-coffee-float {
          animation: pet-idle-float 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .pet-motion-petted {
          animation: pet-petted-wiggle 0.6s ease-in-out 1;
        }

        /* 1. Context-aware gentle floating (6-12px vertical range, easeInOutCubic) */
        @keyframes pet-idle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-7px) rotate(0.4deg); }
        }

        /* 2. Focused working float (calm, low amplitude, stable over laptop) */
        @keyframes pet-focus-steady {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-3px); }
        }

        /* 3. Routine task completion: subtle satisfaction (0.6-1.0s, easeOutCubic) */
        @keyframes pet-routine-bounce {
          0%   { transform: translateY(0px) scale(1); }
          20%  { transform: translateY(1.5px) scale(1.02, 0.98); }
          55%  { transform: translateY(-9px) scale(0.98, 1.03); }
          80%  { transform: translateY(-2px) scale(1.01, 0.99); }
          100% { transform: translateY(0px) scale(1); }
        }

        /* 4. Major task celebration: joyful leap & hold (1.4-2.2s, easeOutBack) */
        @keyframes pet-major-celebration {
          0%   { transform: translateY(0px) scale(1); }
          15%  { transform: translateY(2px) scale(1.04, 0.96); }
          45%  { transform: translateY(-16px) scale(0.96, 1.05); }
          65%  { transform: translateY(-11px) scale(1.02, 0.98); }
          85%  { transform: translateY(-2px) scale(0.99, 1.01); }
          100% { transform: translateY(0px) scale(1); }
        }

        /* 5. Return after absence: warm reunion greeting (1.6-2.4s) */
        @keyframes pet-return-greeting {
          0%   { transform: translateY(0px) scale(0.97); opacity: 0.92; }
          40%  { transform: translateY(-10px) scale(1.03); opacity: 1; }
          70%  { transform: translateY(-3px) scale(1); }
          100% { transform: translateY(0px) scale(1); }
        }

        /* 6. Low energy / sleep: slow, restful breathing tempo */
        @keyframes pet-rest-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-3px); }
        }

        /* 7. Petting interaction wiggle */
        @keyframes pet-petted-wiggle {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          30%      { transform: translateY(-4px) scale(1.04) rotate(-3deg); }
          60%      { transform: translateY(-4px) scale(1.04) rotate(3deg); }
        }

        /* Prop animations */
        .pet-steam {
          animation: pet-steam 2.2s ease-out infinite;
          transform-box: fill-box;
          transform-origin: 50% 100%;
        }
        .pet-sip {
          animation: pet-sip 2.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: 69px 74px;
        }
        .pet-screen-glow {
          animation: pet-screen-glow 2s ease-in-out infinite;
        }

        @keyframes pet-steam {
          0% { transform: translateY(0) scale(0.8); opacity: 0.8; }
          100% { transform: translateY(-10px) scale(1.3); opacity: 0; }
        }

        @keyframes pet-sip {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-7deg) translateY(-2px); }
        }

        @keyframes pet-screen-glow {
          0%, 100% { opacity: 0.82; }
          50% { opacity: 1; }
        }

        /* Accessibility: Strict Reduced-Motion Suppression */
        @media (prefers-reduced-motion: reduce) {
          .lp-sprite-motion,
          .pet-motion-idle-float,
          .pet-motion-focus-steady,
          .pet-motion-routine-bounce,
          .pet-motion-major-celebration,
          .pet-motion-return-greeting,
          .pet-motion-low-energy,
          .pet-motion-coffee-float,
          .pet-motion-petted,
          .pet-steam,
          .pet-sip,
          .pet-screen-glow {
            animation: none !important;
            transition: none !important;
          }
        }
        .lp-reduced .lp-sprite-motion,
        .lp-reduced .pet-motion-idle-float,
        .lp-reduced .pet-motion-focus-steady,
        .lp-reduced .pet-motion-routine-bounce,
        .lp-reduced .pet-motion-major-celebration,
        .lp-reduced .pet-motion-return-greeting,
        .lp-reduced .pet-motion-low-energy,
        .lp-reduced .pet-motion-coffee-float,
        .lp-reduced .pet-motion-petted,
        .lp-reduced .pet-steam,
        .lp-reduced .pet-sip,
        .lp-reduced .pet-screen-glow {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* Synchronized motion wrapper: mascot & attached props animate together */}
      <div
        className={`lp-sprite-motion relative inline-flex items-center justify-center ${motionClass}`}
        style={{
          transformOrigin: '50% 80%',
        }}
      >
        <Mascot
          expression={visual.expression}
          pose={visual.pose}
          leftFinAngle={visual.leftFinAngle}
          rightFinAngle={visual.rightFinAngle}
          glow={visual.glow || isStreakMaster}
          sparkles={visual.sparkles}
          size={84}
          facing={facing}
          reducedMotion={reducedMotion}
          className={isFlying ? 'animate-pulse' : undefined}
        />

        {/* Animated props overlay (steaming coffee mug & working laptop) */}
        {(showCoffeeMug || showLaptop) && (
          <svg
            width={84}
            height={70}
            viewBox="0 0 120 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-0 left-0 pointer-events-none select-none"
            aria-hidden="true"
            style={{
              overflow: 'visible',
              transform: facing === -1 ? 'scaleX(-1)' : undefined,
            }}
          >

          {/* Steaming Coffee Mug */}
          {showCoffeeMug && (
            <g
              data-prop="coffee-mug"
              className={reducedMotion ? undefined : 'pet-sip'}
              transform-box="fill-box"
              transform-origin="69px 74px"
            >
              {/* Animated rising steam puffs */}
              <g
                className={reducedMotion ? undefined : 'pet-steam'}
                transform-box="fill-box"
                transform-origin="50% 100%"
              >
                <path
                  d="M 66 58 Q 64 54 66.5 50.5"
                  stroke="#E2E8F0"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.7}
                />
                <path
                  d="M 70.5 57.5 Q 72.5 53.5 69.5 49.5"
                  stroke="#E2E8F0"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.65}
                />
                <circle cx={67.5} cy={54} r={1.2} fill="#E2E8F0" opacity={0.6} />
                <circle cx={71} cy={51} r={1.0} fill="#E2E8F0" opacity={0.5} />
              </g>

              {/* Mug Body: warm coffee mug tone (#8D5B4C, #A36B5B) */}
              <rect x={63} y={62} width={13} height={11} rx={2.5} fill="#8D5B4C" />
              <rect x={63} y={62} width={13} height={3} rx={1.5} fill="#A36B5B" />
              <ellipse cx={69.5} cy={63} rx={5} ry={1.2} fill="#3D2314" opacity={0.85} />

              {/* Mug Handle: strokeWidth=2.2 */}
              <path
                d="M 76 64 C 80.5 64 80.5 70.5 76 70.5"
                stroke="#8D5B4C"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* Working Laptop (Faithful to Reference Sheet §4: positioned in front of mascot, screen facing mascot, back of lid with Launchpad emblem facing viewer) */}
          {showLaptop && (
            <g data-prop="laptop">
              <defs>
                <linearGradient id="pet-laptop-glow" x1="1" y1="0.5" x2="0" y2="0.5">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.65" />
                  <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pet-lid-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2E3C4F" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>

              {/* Soft luminous screen glow radiating from open screen toward mascot's face & chest */}
              <ellipse
                cx={64}
                cy={63}
                rx={12}
                ry={9}
                fill="url(#pet-laptop-glow)"
                className={reducedMotion ? undefined : 'pet-screen-glow'}
              />

              {/* Laptop base / keyboard tray (resting in perspective between mascot's fin and screen) */}
              <polygon
                points="57,73 83,71 90,79 62,81"
                fill="#334155"
                stroke="#1E293B"
                strokeWidth={0.6}
              />
              {/* Keyboard keys area on base */}
              <polygon
                points="63,74 81,72.5 85,76 65,77.5"
                fill="#1E293B"
                opacity={0.75}
              />
              {/* Spacebar / trackpad detail */}
              <line
                x1={68}
                y1={78.5}
                x2={76}
                y2={78}
                stroke="#64748B"
                strokeWidth={0.8}
                strokeLinecap="round"
                opacity={0.85}
              />

              {/* Laptop open screen lid (back of lid facing viewer, angled in 3/4 perspective toward mascot) */}
              <polygon
                points="68,53 92,51 90,71 66,73"
                fill="url(#pet-lid-gradient)"
                stroke="#475569"
                strokeWidth={0.7}
              />

              {/* Lid top edge highlight */}
              <line
                x1={68}
                y1={53}
                x2={92}
                y2={51}
                stroke="#64748B"
                strokeWidth={0.9}
                strokeLinecap="round"
                opacity={0.85}
              />

              {/* Launchpad emblem on back of laptop lid */}
              <g transform="translate(79, 61.5) scale(0.75)" opacity={0.85}>
                <circle cx={0} cy={0} r={2.5} fill="#94A3B8" />
                <path d="M 0 -2 L 1.2 1.5 L -1.2 1.5 Z" fill="#F8FAFC" />
              </g>

              {/* Laptop hinge line */}
              <rect x={66.5} y={71.5} width={23.5} height={1.4} rx={0.6} fill="#0F172A" />
            </g>
          )}
        </svg>
      )}

      {/* Sleeping 'z z z' floating cue overhead */}
      {state === 'sleeping' && (
        <div
          className="absolute -top-3.5 right-1 pointer-events-none flex flex-col items-center opacity-75 select-none animate-bounce"
          style={{ animationDuration: '3s' }}
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-300">z</span>
          <span className="text-[8px] font-bold text-stone-400 dark:text-stone-400 -mt-1">z</span>
        </div>
      )}

      {/* Gentle love heart on petting */}
      {petted && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in zoom-in-75 duration-200 select-none"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={P.baseOrange}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}
      </div>
    </div>
  );
}

export const PetSprite = memo(PetSpriteComponent);
export default PetSprite;
