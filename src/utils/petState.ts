// Pure companion behavior: app events produce reactions; the controller owns timers.
export type PetState = 'idle' | 'roaming' | 'happy' | 'curious' | 'thinking' | 'sad'
  | 'sleeping' | 'welcome-back' | 'overwhelmed' | 'celebration-streak' | 'coffee-break';
export type PetCue = 'feed-task-done' | 'feed-major-task-done' | 'feed-task-added'
  | 'feed-task-overload' | 'feed-user-wake' | 'feed-return-short' | 'feed-streak-milestone'
  | 'env-greet' | 'env-subdue' | 'env-doze' | 'env-inactivity-slump' | 'env-coffee-break'
  | 'env-variation' | 'env-transient-end' | 'env-roam-end';
export type VariationPick = 'roam' | 'think' | 'overwhelmed' | 'stay' | 'coffee';
export interface PetContext {
  pendingCount: number;
  vibrateOk: boolean;
  overwhelmThreshold?: number;
  variation?: VariationPick;
}
export interface PetDecision { state: PetState; transientMs?: number }
export const PET_TRANSIENT_MS: Record<string, number> = {
  happy: 2400, curious: 2600, thinking: 3200, 'welcome-back': 1800,
  'return-short': 1000, overwhelmed: 3200, 'celebration-streak': 3600, 'coffee-break': 5000,
};
export const PET_OVERWHELM_THRESHOLD = 10;
export type PetTier = 'normal' | 'active' | 'streak-master';
export const PET_TIER_THRESHOLDS = { active: 3, 'streak-master': 7 };
export function petTierForStreak(streak: number | undefined): PetTier {
  if ((streak ?? 0) >= PET_TIER_THRESHOLDS['streak-master']) return 'streak-master';
  return (streak ?? 0) >= PET_TIER_THRESHOLDS.active ? 'active' : 'normal';
}
export function nextPet(current: PetState, cue: PetCue, ctx: PetContext): PetDecision {
  const react = (state: PetState, duration = PET_TRANSIENT_MS[state]): PetDecision => ({ state, transientMs: duration });
  const overwhelmAt = ctx.overwhelmThreshold ?? PET_OVERWHELM_THRESHOLD;
  switch (cue) {
    case 'feed-task-done':
      return current === 'celebration-streak' ? { state: current } : react('happy');
    case 'feed-major-task-done':
    case 'feed-streak-milestone': return react('celebration-streak');
    case 'feed-task-added': return react(ctx.pendingCount >= overwhelmAt ? 'overwhelmed' : 'curious');
    case 'feed-task-overload': return react('overwhelmed');
    case 'feed-return-short':
      if (current === 'sleeping') return { state: current };
      return current === 'sad' ? { state: 'idle' } : react('welcome-back', PET_TRANSIENT_MS['return-short']);
    case 'feed-user-wake':
      if (current === 'sleeping') return react('welcome-back');
      return { state: current === 'sad' ? 'idle' : current };
    case 'env-greet': return react('welcome-back');
    case 'env-subdue': return { state: current === 'idle' || current === 'roaming' ? 'sad' : current };
    case 'env-inactivity-slump': return { state: 'sad' };
    case 'env-doze': return { state: 'sleeping' };
    case 'env-coffee-break': return current === 'sleeping' ? { state: current } : react('coffee-break');
    case 'env-variation':
      if (current !== 'idle') return { state: current };
      if (ctx.variation === 'roam' && ctx.vibrateOk) return { state: 'roaming' };
      if (ctx.variation === 'think' && ctx.vibrateOk) return react('thinking');
      if (ctx.variation === 'overwhelmed' && ctx.pendingCount >= overwhelmAt && ctx.vibrateOk) return react('overwhelmed');
      if (ctx.variation === 'coffee') return react('coffee-break');
      return { state: 'idle' };
    case 'env-transient-end':
    case 'env-roam-end': return { state: 'idle' };
  }
}

/** Count real completions, excluding deletion, reflection cleanup and initial loads. */
export function petTaskChanges(before: { id: string; isDone: boolean }[], after: { id: string; isDone: boolean }[]) {
  const previous = new Map(before.map(task => [task.id, task.isDone]));
  return {
    completed: after.filter(task => task.isDone && previous.get(task.id) === false).length,
    added: after.some(task => !task.isDone && !previous.has(task.id)),
  };
}