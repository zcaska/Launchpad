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
function resolveMascotVisual(
  state: PetState,
  petted: boolean,
  isDragging: boolean,
  idleMicroExpr: 'calm' | 'curious' | 'welcoming' = 'calm'
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
        leftFinAngle: 4,
        rightFinAngle: 4,
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
        leftFinAngle: 2,
        rightFinAngle: 2,
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

  const visual = resolveMascotVisual(state, petted, isDragging, idleMicroExpr);

  // Streak master tier adds a rich warm amber ambient aura
  const isStreakMaster = tier === 'streak-master';

  return (
    <div
      className={`lp-sprite relative inline-flex items-center justify-center ${
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
