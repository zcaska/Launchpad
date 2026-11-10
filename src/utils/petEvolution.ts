import type { GamificationState } from '../types';
import { HERO_ROSTER } from '../data/heroRoster';
import { evaluateUnlockedHeroes } from './gamification';

export const PET_EVOLUTION_REWARDS = [
  'Your little companion', 'A teal adventure scarf', 'Round explorer glasses',
  'Companion headphones', 'A golden star pin', 'A golden crown', 'A jeweled crown',
] as const;

/** Saved unlocks take precedence over a broken streak or an equipped lower hero. */
export function earnedPetLevel(progress?: GamificationState): number {
  if (!progress) return 1;
  const earned = new Set([
    ...(progress.unlockedHeroIds ?? []),
    ...evaluateUnlockedHeroes(progress.currentXp, progress.currentStreak),
  ]);
  return Math.max(1, ...HERO_ROSTER.filter(hero => earned.has(hero.id)).map(hero => hero.level));
}

export function petAccessories(level: number) {
  return {
    scarf: level >= 2,
    glasses: level >= 3,
    headphones: level >= 4 && level < 6,
    star: level >= 5,
    crown: level >= 7 ? 'jeweled' as const : level >= 6 ? 'gold' as const : null,
  };
}

export function petEvolutionMessage(level: number): string {
  const current = Math.max(1, Math.min(7, Math.floor(level)));
  const next = PET_EVOLUTION_REWARDS[current];
  return `Ema, level ${current}. ${PET_EVOLUTION_REWARDS[current - 1]}.${next ? ` Next at level ${current + 1}: ${next.toLowerCase()}.` : ' Every milestone, together.'}`;
}
