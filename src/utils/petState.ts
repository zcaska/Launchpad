// Launchpad Pet — pure behavioral state machine.
// No timers, no DOM, no React: `nextPet` is fully deterministic given the cue,
// so transitions stay consistent and the risky part (timer churn) lives alone
// in usePetController. Timing constants intended for controller use.

export type PetState =
  | 'idle'
  | 'roaming'
  | 'happy'
  | 'curious'
  | 'thinking'
  | 'sad'
  | 'focused'
  | 'sleeping'
  | 'welcome-back'
  | 'overwhelmed'
  | 'celebration-streak'
  | 'coffee-break';

// `feed-*` = meaningful app events, `env-*` = controller ticks / timer expiry.
export type PetCue =
  | 'feed-task-done'
  | 'feed-task-added'
  | 'feed-task-overload'
  | 'feed-focus-start'
  | 'feed-focus-end'
  | 'feed-user-wake'
  | 'feed-streak-milestone'
  | 'env-greet'
  | 'env-subdue'
  | 'env-doze'
  | 'env-inactivity-slump'
  | 'env-coffee-break'
  | 'env-variation'
  | 'env-transient-end'
  | 'env-roam-end';

// Optional chooser for the idle variation tick; the controller picks the dice
// roll, the reducer owns whether it is legal. Keeps the reducer deterministic.
export type VariationPick = 'roam' | 'think' | 'overwhelmed' | 'stay' | 'coffee';

export interface PetContext {
  focusActive: boolean;
  pendingCount: number;
  vibrateOk: boolean;       // false => prefers-reduced-motion
  // overwhelmed threshold; spec says caliber later if needed
  overwhelmThreshold?: number;
  variation?: VariationPick;
}

export interface PetDecision {
  state: PetState;
  /** For transient states: how long until env-transient-end should fire. */
  transientMs?: number;
}

// Durations live here so controller and docs agree on the numbers.
export const PET_TRANSIENT_MS: Record<string, number> = {
  happy: 3600,
  curious: 2600,
  thinking: 3200,
  'welcome-back': 3000,
  overwhelmed: 3200,
  'celebration-streak': 4500,
  'coffee-break': 5000,
};

/** Pending tasks at (or above) this count read as "too much" to the pet. */
export const PET_OVERWHELM_THRESHOLD = 10;

/**
 * Cosmetic streak progression (character sheet → "Progression"). Purely
 * visual: it never affects scoring, XP, or task state.
 */
export type PetTier = 'normal' | 'active' | 'streak-master';

export const PET_TIER_THRESHOLDS: Record<Exclude<PetTier, 'normal'>, number> = {
  active: 3,
  'streak-master': 7,
};

export function petTierForStreak(streak: number | undefined): PetTier {
  const s = streak ?? 0;
  if (s >= PET_TIER_THRESHOLDS['streak-master']) return 'streak-master';
  if (s >= PET_TIER_THRESHOLDS.active) return 'active';
  return 'normal';
}

/**
 * The one transition table. Precedence encoded directly:
 *   1. focus sessions (block / override disruptions)
 *   2. short-lived event reactions
 *   3. welcome-back
 *   4. inactivity states (sad/sleeping)
 *   5. roaming & idle variations
 * Task completion during a focus session is intentionally NOT a hop — the
 * requirement is acknowledgement without disruption; the component keeps a
 * subtle sparkle for that case.
 */
export function nextPet(current: PetState, cue: PetCue, ctx: PetContext): PetDecision {
  const overwhelmAt = ctx.overwhelmThreshold ?? PET_OVERWHELM_THRESHOLD;

  switch (cue) {
    // ---- Focus: strongest external state, suppresses roaming & reactions ----
    case 'feed-focus-start':
      return { state: 'focused' };
    case 'feed-focus-end':
      return { state: 'idle' };

    // ---- Short-lived reactions ----
    case 'feed-task-done':
      if (ctx.focusActive) return { state: 'focused' };       // quiet ack only
      if (current === 'sleeping') return { state: 'sleeping' }; // never wake to dance
      return { state: 'happy', transientMs: PET_TRANSIENT_MS.happy };

    case 'feed-task-added': {
      if (ctx.focusActive) return { state: 'focused' };
      // Too much on the plate outranks curiosity: a concerned look is the more
      // useful signal, and it still nudges toward one small step.
      if (ctx.pendingCount >= overwhelmAt)
        return { state: 'overwhelmed', transientMs: PET_TRANSIENT_MS.overwhelmed };
      // Curiosity is strong enough to wake a sleeping pet.
      return { state: 'curious', transientMs: PET_TRANSIENT_MS.curious };
    }

    case 'feed-task-overload':
      if (ctx.focusActive) return { state: 'focused' };
      return { state: 'overwhelmed', transientMs: PET_TRANSIENT_MS.overwhelmed };

    case 'feed-streak-milestone': {
      if (ctx.focusActive) return { state: 'focused' };       // quiet ack only
      if (current === 'sleeping') return { state: 'sleeping' }; // never wake to celebrate
      return { state: 'celebration-streak', transientMs: PET_TRANSIENT_MS['celebration-streak'] };
    }

    // ---- Returning user ----
    case 'feed-user-wake':
      if (ctx.focusActive) return { state: 'focused' };
      if (current === 'sleeping') return { state: 'welcome-back', transientMs: PET_TRANSIENT_MS['welcome-back'] };
      if (current === 'sad') return { state: 'idle' }; // the user is back: perk up
      return { state: current };
    case 'env-greet':
      if (ctx.focusActive) return { state: 'focused' };
      // The user is present, so greet rather than open asleep; the doze tick
      // resumes later if they leave without interacting.
      return { state: 'welcome-back', transientMs: PET_TRANSIENT_MS['welcome-back'] };

    // ---- Inactivity, never guilt: just slower and quieter ----
    case 'env-subdue':
      if (ctx.focusActive || current === 'sleeping') return { state: current };
      if (current !== 'idle' && current !== 'roaming') return { state: current };
      // Persistent (not transient): the pet sits quietly until the user
      // returns. A transient sad state would re-trigger on every tick.
      return { state: 'sad' };
    case 'env-inactivity-slump':
      if (ctx.focusActive) return { state: 'focused' };
      return { state: 'sad' };
    case 'env-doze':
      if (ctx.focusActive) return { state: current };
      // A pet that falls asleep mid-focus would contradict FOCUSED, which
      // suspends all inactivity behaviour while the user is still working.
      return { state: 'sleeping' };

    // ---- Coffee break ----
    case 'env-coffee-break':
      if (ctx.focusActive) return { state: 'focused' };
      if (current === 'sleeping') return { state: 'sleeping' };
      return { state: 'coffee-break', transientMs: PET_TRANSIENT_MS['coffee-break'] };

    // ---- Idle variation: only-fire-from-idle; roam needs motion allowed ----
    case 'env-variation': {
      if (current !== 'idle' || ctx.focusActive) return { state: current };
      const pick = ctx.variation ?? 'stay';
      if (pick === 'roam' && ctx.vibrateOk) return { state: 'roaming' };
      if (pick === 'think' && ctx.vibrateOk) return { state: 'thinking', transientMs: PET_TRANSIENT_MS.thinking };
      if (pick === 'overwhelmed' && ctx.pendingCount >= overwhelmAt && ctx.vibrateOk)
        return { state: 'overwhelmed', transientMs: PET_TRANSIENT_MS.overwhelmed };
      if (pick === 'coffee')
        return { state: 'coffee-break', transientMs: PET_TRANSIENT_MS['coffee-break'] };
      return { state: 'idle' };
    }

    // ---- Timer expiry ----
    case 'env-transient-end':
      return { state: ctx.focusActive ? 'focused' : 'idle' };
    case 'env-roam-end':
      return { state: ctx.focusActive ? 'focused' : 'idle' };
  }
}
