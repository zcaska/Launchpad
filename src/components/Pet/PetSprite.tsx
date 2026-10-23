import { memo, useState, useEffect } from 'react';
import type { PetState, PetTier } from '../../utils/petState';
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
      // Ambient interval between 12-16s of calm
      const calmDuration = 12000 + Math.random() * 4000;

      cycleTimeout = setTimeout(() => {
        if (isCancelled) return;
        // Occasionally show gentle micro-attentive curiosity ('curious' or 'welcoming')
        const nextExpr: 'curious' | 'welcoming' = Math.random() < 0.5 ? 'curious' : 'welcoming';
        setIdleMicroExpr(nextExpr);

        // Hold for 3-4s, then smoothly return to 'calm'
        const peekDuration = 3200 + Math.random() * 800;
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
          <style>{`
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

            @media (prefers-reduced-motion: reduce) {
              .pet-steam,
              .pet-sip,
              .pet-screen-glow {
                animation: none !important;
              }
            }
            .lp-reduced .pet-steam,
            .lp-reduced .pet-sip,
            .lp-reduced .pet-screen-glow {
              animation: none !important;
            }
          `}</style>

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

          {/* Working Laptop */}
          {showLaptop && (
            <g data-prop="laptop">
              {/* Laptop open screen */}
              <rect x={49} y={53} width={22} height={15} rx={1.5} fill="#1E293B" />

              {/* Laptop glowing screen display */}
              <rect
                x={50.5}
                y={54.5}
                width={19}
                height={12}
                rx={1}
                fill="#60A5FA"
                className={reducedMotion ? undefined : 'pet-screen-glow'}
              />

              {/* Screen code/content lines */}
              <g opacity={0.85}>
                <rect x={52.5} y={56.5} width={7} height={1} rx={0.5} fill="#FFFFFF" opacity={0.9} />
                <rect x={52.5} y={58.5} width={13} height={1} rx={0.5} fill="#FFFFFF" opacity={0.7} />
                <rect x={54.5} y={60.5} width={10} height={1} rx={0.5} fill="#FFFFFF" opacity={0.7} />
                <rect x={52.5} y={62.5} width={6} height={1} rx={0.5} fill="#93C5FD" opacity={0.8} />
              </g>

              {/* Laptop base */}
              <rect x={46} y={68} width={28} height={4} rx={1.5} fill="#334155" />

              {/* Keyboard detail */}
              <rect x={48} y={69} width={24} height={2} rx={0.5} fill="#64748B" />
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
  );
}

export const PetSprite = memo(PetSpriteComponent);
export default PetSprite;
