import { HERO_ROSTER, getHeroById } from '../data/heroRoster';
import {
  GamificationState,
  DailyGrowthRecord,
  QuickNote,
  TaskPriority,
  HeroLevelDef,
  SubLevelStage,
} from '../types';

export const PRIORITY_MULTIPLIERS: Record<TaskPriority, number> = {
  urgent: 3.0,
  high: 2.0,
  medium: 1.5,
  low: 1.0,
};

/**
 * Calculates current streak multiplier:
 * - 0-2 days: 1.00x
 * - 3-6 days: 1.15x
 * - 7-13 days: 1.30x
 * - 14-29 days: 1.50x
 * - 30+ days: 2.00x (Shadow Monarch Tier)
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.3;
  if (streakDays >= 3) return 1.15;
  return 1.0;
}

/**
 * Calculates XP earned for completing a task:
 * - Base duration: Math.max(15, durationMinutes)
 * - Priority multiplier: urgent = 3.0, high = 2.0, medium = 1.5, low = 1.0 (default 1.5)
 * - Streak multiplier: from getStreakMultiplier(streakDays)
 * - Returns Math.round(duration * priorityMult * streakMult)
 */
export function calculateTaskXp(
  durationMinutes: number,
  priority?: TaskPriority,
  streakDays: number = 1
): number {
  const baseDuration = Math.max(15, durationMinutes || 0);
  const priorityMult =
    priority && PRIORITY_MULTIPLIERS[priority] !== undefined
      ? PRIORITY_MULTIPLIERS[priority]
      : 1.5;
  const streakMult = getStreakMultiplier(streakDays);
  return Math.round(baseDuration * priorityMult * streakMult);
}

/**
 * Evaluates unlocked hero tiers based on lifetime XP and current streak.
 * Unlocks any hero where currentStreak >= hero.minStreakDays || lifetimeXp >= hero.minLifetimeXp.
 * Always includes 'lvl-1-awakening'.
 */
export function evaluateUnlockedHeroes(lifetimeXp: number, currentStreak: number): string[] {
  const unlocked = HERO_ROSTER.filter(
    (hero) =>
      hero.id === 'lvl-1-awakening' ||
      currentStreak >= hero.minStreakDays ||
      lifetimeXp >= hero.minLifetimeXp
  ).map((hero) => hero.id);

  if (!unlocked.includes('lvl-1-awakening')) {
    unlocked.unshift('lvl-1-awakening');
  }

  return unlocked;
}

/**
 * Determines current sub-level stage for a hero based on user progress.
 */
export function getCurrentSubLevel(
  hero: HeroLevelDef,
  currentStreak: number,
  lifetimeXp: number
): { currentStage: SubLevelStage; nextStage: SubLevelStage | null; progressPercent: number } {
  const stages = hero.subLevels || [
    { stage: 1, roman: 'I', title: 'Novice', minStreakDays: hero.minStreakDays, minLifetimeXp: hero.minLifetimeXp },
  ];

  let currentStageIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (currentStreak >= s.minStreakDays || lifetimeXp >= s.minLifetimeXp) {
      currentStageIndex = i;
    }
  }

  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  let progressPercent = 100;
  if (nextStage) {
    const prevXp = currentStage.minLifetimeXp;
    const targetXp = nextStage.minLifetimeXp;
    const xpSpan = Math.max(1, targetXp - prevXp);
    const xpAchieved = Math.max(0, Math.min(xpSpan, lifetimeXp - prevXp));
    const xpPct = (xpAchieved / xpSpan) * 100;

    const prevStreak = currentStage.minStreakDays;
    const targetStreak = nextStage.minStreakDays;
    const streakSpan = Math.max(1, targetStreak - prevStreak);
    const streakAchieved = Math.max(0, Math.min(streakSpan, currentStreak - prevStreak));
    const streakPct = (streakAchieved / streakSpan) * 100;

    progressPercent = Math.min(100, Math.max(Math.round(xpPct), Math.round(streakPct)));
  }

  return { currentStage, nextStage, progressPercent };
}

/**
 * Evaluates visibility state for a hero card in the UI:
 * - 'achieved': Level is already passed
 * - 'current': Level is user's active/highest unlocked level
 * - 'next': The immediate next level user needs to unlock (shows requirements, hides artwork)
 * - 'future_mystery': Levels beyond next (completely shrouded mystery tier)
 */
export function getHeroVisibilityState(
  heroLevel: number,
  highestUnlockedLevel: number
): 'achieved' | 'current' | 'next' | 'future_mystery' {
  if (heroLevel < highestUnlockedLevel) {
    return 'achieved';
  }
  if (heroLevel === highestUnlockedLevel) {
    return 'current';
  }
  if (heroLevel === highestUnlockedLevel + 1) {
    return 'next';
  }
  return 'future_mystery';
}

/**
 * Helper to compute the next streak count based on lastActiveDate and current Date.
 */
export function computeNextStreak(
  lastActiveDate: string | undefined,
  currentStreak: number,
  todayKey: string,
  now: Date
): number {
  if (!lastActiveDate) {
    return Math.max(1, currentStreak || 1);
  }
  if (lastActiveDate === todayKey) {
    return Math.max(1, currentStreak || 1);
  }

  const [ly, lm, ld] = lastActiveDate.split('-').map(Number);
  const lastDate = new Date(ly, lm - 1, ld);
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return (currentStreak || 0) + 1;
  }
  if (diffDays > 1) {
    return 1;
  }
  // diffDays <= 0 (same day or clock skew)
  return Math.max(1, currentStreak || 1);
}

/**
 * Records task completion, advancing streak, accumulating XP, evaluating hero unlocks,
 * and recording to growth history.
 */
export function recordTaskCompletion(
  gamification: GamificationState,
  history: Record<string, DailyGrowthRecord>,
  task: QuickNote,
  now: Date = new Date()
): {
  gamification: GamificationState;
  history: Record<string, DailyGrowthRecord>;
  earnedXp: number;
} {
  const todayKey = formatDateKey(now);
  const nextStreak = computeNextStreak(
    gamification.lastActiveDate,
    gamification.currentStreak,
    todayKey,
    now
  );

  const durationMinutes = task.durationMinutes || 30;
  const earnedXp = calculateTaskXp(durationMinutes, task.priority, nextStreak);

  const nextLongestStreak = Math.max(gamification.longestStreak || 0, nextStreak);
  const nextXp = (gamification.currentXp || 0) + earnedXp;

  const newlyQualifiedIds = evaluateUnlockedHeroes(nextXp, nextStreak);
  const existingUnlocked = gamification.unlockedHeroIds || ['lvl-1-awakening'];
  const newlyUnlockedIds = newlyQualifiedIds.filter((id) => !existingUnlocked.includes(id));
  const mergedUnlockedIds = Array.from(new Set([...existingUnlocked, ...newlyQualifiedIds]));

  let nextActiveHeroId = gamification.activeHeroId || 'lvl-1-awakening';
  let currentActiveLevel = getHeroById(nextActiveHeroId)?.level || 1;

  for (const id of newlyUnlockedIds) {
    const hero = getHeroById(id);
    if (hero.level > currentActiveLevel) {
      nextActiveHeroId = hero.id;
      currentActiveLevel = hero.level;
    }
  }

  const updatedGamification: GamificationState = {
    ...gamification,
    currentXp: nextXp,
    currentStreak: nextStreak,
    longestStreak: nextLongestStreak,
    lastActiveDate: todayKey,
    unlockedHeroIds: mergedUnlockedIds,
    activeHeroId: nextActiveHeroId,
    lastBackupTimestamp: gamification.lastBackupTimestamp || now.getTime(),
  };

  const existingHistory = history[todayKey] || {
    tasksCompleted: 0,
    focusMinutes: 0,
    xpEarned: 0,
    dailyGoalCompleted: false,
  };

  const updatedHistory: Record<string, DailyGrowthRecord> = {
    ...history,
    [todayKey]: {
      tasksCompleted: existingHistory.tasksCompleted + 1,
      focusMinutes: existingHistory.focusMinutes + durationMinutes,
      xpEarned: existingHistory.xpEarned + earnedXp,
      dailyGoalCompleted: existingHistory.dailyGoalCompleted,
    },
  };

  return {
    gamification: updatedGamification,
    history: updatedHistory,
    earnedXp,
  };
}

/**
 * Records daily focus completion, awarding flat 250 XP bonus.
 */
export function recordDailyFocusCompletion(
  gamification: GamificationState,
  history: Record<string, DailyGrowthRecord>,
  focusMinutes?: number,
  now: Date = new Date()
): {
  gamification: GamificationState;
  history: Record<string, DailyGrowthRecord>;
  earnedXp: number;
} {
  const todayKey = formatDateKey(now);
  const nextStreak = computeNextStreak(
    gamification.lastActiveDate,
    gamification.currentStreak,
    todayKey,
    now
  );
  const earnedXp = 250;

  const nextLongestStreak = Math.max(gamification.longestStreak || 0, nextStreak);
  const nextXp = (gamification.currentXp || 0) + earnedXp;

  const newlyQualifiedIds = evaluateUnlockedHeroes(nextXp, nextStreak);
  const existingUnlocked = gamification.unlockedHeroIds || ['lvl-1-awakening'];
  const newlyUnlockedIds = newlyQualifiedIds.filter((id) => !existingUnlocked.includes(id));
  const mergedUnlockedIds = Array.from(new Set([...existingUnlocked, ...newlyQualifiedIds]));

  let nextActiveHeroId = gamification.activeHeroId || 'lvl-1-awakening';
  let currentActiveLevel = getHeroById(nextActiveHeroId)?.level || 1;

  for (const id of newlyUnlockedIds) {
    const hero = getHeroById(id);
    if (hero.level > currentActiveLevel) {
      nextActiveHeroId = hero.id;
      currentActiveLevel = hero.level;
    }
  }

  const updatedGamification: GamificationState = {
    ...gamification,
    currentXp: nextXp,
    currentStreak: nextStreak,
    longestStreak: nextLongestStreak,
    lastActiveDate: todayKey,
    unlockedHeroIds: mergedUnlockedIds,
    activeHeroId: nextActiveHeroId,
    lastBackupTimestamp: gamification.lastBackupTimestamp || now.getTime(),
  };

  const existingHistory = history[todayKey] || {
    tasksCompleted: 0,
    focusMinutes: 0,
    xpEarned: 0,
    dailyGoalCompleted: false,
  };

  const updatedHistory: Record<string, DailyGrowthRecord> = {
    ...history,
    [todayKey]: {
      tasksCompleted: existingHistory.tasksCompleted,
      focusMinutes: existingHistory.focusMinutes + (focusMinutes || 45),
      xpEarned: existingHistory.xpEarned + earnedXp,
      dailyGoalCompleted: true,
    },
  };

  return {
    gamification: updatedGamification,
    history: updatedHistory,
    earnedXp,
  };
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
