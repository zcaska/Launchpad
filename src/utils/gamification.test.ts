import {
  getStreakMultiplier,
  calculateTaskXp,
  evaluateUnlockedHeroes,
  recordTaskCompletion,
  recordDailyFocusCompletion,
  formatDateKey,
} from './gamification';
import { GamificationState, DailyGrowthRecord, QuickNote } from '../types';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing gamification.ts ---');

// ==========================================
// 1. Test getStreakMultiplier
// ==========================================
console.log('\n--- 1. Streak Multiplier ---');
assertEqual(getStreakMultiplier(0), 1.0, 'Streak 0 days -> 1.0x');
assertEqual(getStreakMultiplier(1), 1.0, 'Streak 1 day -> 1.0x');
assertEqual(getStreakMultiplier(2), 1.0, 'Streak 2 days -> 1.0x');
assertEqual(getStreakMultiplier(3), 1.15, 'Streak 3 days -> 1.15x');
assertEqual(getStreakMultiplier(6), 1.15, 'Streak 6 days -> 1.15x');
assertEqual(getStreakMultiplier(7), 1.3, 'Streak 7 days -> 1.3x');
assertEqual(getStreakMultiplier(13), 1.3, 'Streak 13 days -> 1.3x');
assertEqual(getStreakMultiplier(14), 1.5, 'Streak 14 days -> 1.5x');
assertEqual(getStreakMultiplier(29), 1.5, 'Streak 29 days -> 1.5x');
assertEqual(getStreakMultiplier(30), 2.0, 'Streak 30 days -> 2.0x (Monarch Tier)');
assertEqual(getStreakMultiplier(100), 2.0, 'Streak 100 days -> 2.0x');

// ==========================================
// 2. Test calculateTaskXp
// ==========================================
console.log('\n--- 2. Calculate Task XP ---');
// Short task clamping to 15m
assertEqual(calculateTaskXp(5, 'low', 1), 15, '5m low priority clamped to 15m: 15 * 1.0 * 1.0 = 15 XP');
assertEqual(calculateTaskXp(10, 'urgent', 1), 45, '10m urgent clamped to 15m: 15 * 3.0 * 1.0 = 45 XP');

// Standard and longer tasks
assertEqual(calculateTaskXp(30, 'low', 1), 30, '30m low at streak 1: 30 * 1.0 * 1.0 = 30 XP');
assertEqual(calculateTaskXp(30, 'medium', 1), 45, '30m medium at streak 1: 30 * 1.5 * 1.0 = 45 XP');
assertEqual(calculateTaskXp(30, 'high', 1), 60, '30m high at streak 1: 30 * 2.0 * 1.0 = 60 XP');
assertEqual(calculateTaskXp(30, 'urgent', 1), 90, '30m urgent at streak 1: 30 * 3.0 * 1.0 = 90 XP');

// Streak multipliers applied
// 30m high (2.0) with streak 7 (1.3): 30 * 2.0 * 1.3 = 78 XP
assertEqual(calculateTaskXp(30, 'high', 7), 78, '30m high at streak 7: 30 * 2.0 * 1.3 = 78 XP');
// 60m urgent (3.0) with streak 30 (2.0): 60 * 3.0 * 2.0 = 360 XP
assertEqual(calculateTaskXp(60, 'urgent', 30), 360, '60m urgent at streak 30: 60 * 3.0 * 2.0 = 360 XP');
// Rounding check: 45m low (1.0) with streak 7 (1.3): 45 * 1.0 * 1.3 = 58.5 -> Math.round -> 59
assertEqual(calculateTaskXp(45, 'low', 7), 59, '45m low at streak 7 rounds 58.5 to 59 XP');

// Defaults: priority undefined -> 1.5, streakDays omitted -> 1
assertEqual(calculateTaskXp(30), 45, 'Default priority (medium=1.5) and default streak (1) for 30m: 45 XP');

// ==========================================
// 3. Test evaluateUnlockedHeroes
// ==========================================
console.log('\n--- 3. Evaluate Unlocked Heroes ---');
{
  const baseUnlock = evaluateUnlockedHeroes(0, 1);
  assert(baseUnlock.includes('lvl-1-awakening'), 'Always includes lvl-1-awakening at start');
  assertEqual(baseUnlock.length, 1, 'Only lvl-1 unlocked at 0 XP, 1 streak day');

  const zeroZero = evaluateUnlockedHeroes(0, 0);
  assert(zeroZero.includes('lvl-1-awakening'), 'Always includes lvl-1-awakening even at 0 XP, 0 streak');

  // Level 2 (500 XP or 3 streak days)
  const byXpLvl2 = evaluateUnlockedHeroes(500, 1);
  assert(byXpLvl2.includes('lvl-2-iron-will'), 'Lvl 2 unlocked via 500 XP');
  const byStreakLvl2 = evaluateUnlockedHeroes(100, 3);
  assert(byStreakLvl2.includes('lvl-2-iron-will'), 'Lvl 2 unlocked via 3-day streak');

  // Level 5 Sung Jin-woo (Shadow Monarch): 8,000 XP or 30 days
  const jinWooStreak = evaluateUnlockedHeroes(0, 30);
  assert(jinWooStreak.includes('lvl-5-shadow-monarch'), 'Sung Jin-woo unlocked at 30-day streak');

  const jinWooXp = evaluateUnlockedHeroes(8000, 1);
  assert(jinWooXp.includes('lvl-5-shadow-monarch'), 'Sung Jin-woo unlocked at 8,000 XP');

  const notYetJinWoo = evaluateUnlockedHeroes(7999, 29);
  assert(!notYetJinWoo.includes('lvl-5-shadow-monarch'), 'Sung Jin-woo locked below 8,000 XP and 30 days');
  assert(notYetJinWoo.includes('lvl-4-dark-knight'), 'Lvl 4 unlocked at 29 days');

  // All 7 unlocked at max thresholds
  const allHeroes = evaluateUnlockedHeroes(35000, 100);
  assertEqual(allHeroes.length, 7, 'All 7 heroes unlocked at 35,000 XP and 100-day streak');
}

// ==========================================
// 4. Test recordTaskCompletion
// ==========================================
console.log('\n--- 4. Record Task Completion ---');
{
  const now = new Date(2026, 9, 11, 14, 0, 0); // 2026-10-11
  const todayKey = formatDateKey(now);
  assertEqual(todayKey, '2026-10-11', 'formatDateKey returns YYYY-MM-DD');

  const initialGamification: GamificationState = {
    currentXp: 100,
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDate: '2026-10-10', // yesterday
    unlockedHeroIds: ['lvl-1-awakening'],
    activeHeroId: 'lvl-1-awakening',
    lastBackupTimestamp: 1700000000000,
  };

  const initialHistory: Record<string, DailyGrowthRecord> = {};

  const task: QuickNote = {
    id: 'task-1',
    text: 'Implement gamification engine',
    isDone: true,
    createdAt: Date.now(),
    durationMinutes: 30,
    priority: 'high', // 2.0x
  };

  // 4a. Consecutive day completion: streak advances 1 -> 2
  const res1 = recordTaskCompletion(initialGamification, initialHistory, task, now);

  assertEqual(res1.gamification.currentStreak, 2, 'Streak increments from 1 to 2 on consecutive day');
  assertEqual(res1.gamification.longestStreak, 2, 'longestStreak updates to 2');
  assertEqual(res1.gamification.lastActiveDate, '2026-10-11', 'lastActiveDate updated to today');
  // 30m high at streak 2 (1.0x): 30 * 2.0 * 1.0 = 60 XP
  assertEqual(res1.earnedXp, 60, 'Earned 60 XP for 30m high task');
  assertEqual(res1.gamification.currentXp, 160, 'currentXp increases 100 -> 160');
  assertEqual(res1.history['2026-10-11'].tasksCompleted, 1, 'history tasksCompleted is 1');
  assertEqual(res1.history['2026-10-11'].focusMinutes, 30, 'history focusMinutes is 30');
  assertEqual(res1.history['2026-10-11'].xpEarned, 60, 'history xpEarned is 60');

  // 4b. Same-day subsequent task completion: maintains streak
  const task2: QuickNote = {
    id: 'task-2',
    text: 'Write unit tests',
    isDone: true,
    createdAt: Date.now(),
    durationMinutes: 45,
    priority: 'urgent', // 3.0x
  };
  const res2 = recordTaskCompletion(res1.gamification, res1.history, task2, now);

  assertEqual(res2.gamification.currentStreak, 2, 'Same-day second task maintains streak at 2');
  assertEqual(res2.history['2026-10-11'].tasksCompleted, 2, 'history tasksCompleted increments to 2');
  assertEqual(res2.history['2026-10-11'].focusMinutes, 75, 'history focusMinutes accumulates to 75');
  // 45m urgent at streak 2 (1.0x) = 135 XP
  assertEqual(res2.earnedXp, 135, 'Earned 135 XP for 45m urgent task');
  assertEqual(res2.gamification.currentXp, 295, 'currentXp updates 160 + 135 = 295');

  // 4c. Missed day (>1 day gap): streak resets to 1, longestStreak preserved
  const futureDate = new Date(2026, 9, 15, 10, 0, 0); // 4 days later
  const res3 = recordTaskCompletion(res2.gamification, res2.history, task, futureDate);

  assertEqual(res3.gamification.currentStreak, 1, 'Streak resets to 1 after missing multiple days');
  assertEqual(res3.gamification.longestStreak, 2, 'longestStreak is preserved at 2');
  assertEqual(res3.gamification.lastActiveDate, '2026-10-15', 'lastActiveDate updated to future date');

  // 4d. Permanent unlock invariance: hero tiers are never lost on streak reset
  const monarchState: GamificationState = {
    currentXp: 8500,
    currentStreak: 30,
    longestStreak: 30,
    lastActiveDate: '2026-10-01', // missed 10 days
    unlockedHeroIds: ['lvl-1-awakening', 'lvl-2-iron-will', 'lvl-3-flow-architect', 'lvl-4-dark-knight', 'lvl-5-shadow-monarch'],
    activeHeroId: 'lvl-5-shadow-monarch',
    lastBackupTimestamp: 1700000000000,
  };
  const resReset = recordTaskCompletion(monarchState, {}, task, now);
  assertEqual(resReset.gamification.currentStreak, 1, 'Monarch streak resets to 1');
  assert(
    resReset.gamification.unlockedHeroIds.includes('lvl-5-shadow-monarch'),
    'Permanent unlock invariance: Sung Jin-woo remains unlocked even after streak reset'
  );
  assertEqual(
    resReset.gamification.activeHeroId,
    'lvl-5-shadow-monarch',
    'Active hero stays Sung Jin-woo'
  );

  // 4e. Level upgrade unlocks next hero and updates activeHeroId
  const nearLvl2State: GamificationState = {
    currentXp: 480,
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDate: '2026-10-10',
    unlockedHeroIds: ['lvl-1-awakening'],
    activeHeroId: 'lvl-1-awakening',
    lastBackupTimestamp: 1700000000000,
  };
  const resLvlUp = recordTaskCompletion(nearLvl2State, {}, task, now); // +60 XP -> 540 XP
  assertEqual(resLvlUp.gamification.currentXp, 540, 'XP crosses 500 threshold');
  assert(resLvlUp.gamification.unlockedHeroIds.includes('lvl-2-iron-will'), 'Lvl 2 newly unlocked');
  assertEqual(resLvlUp.gamification.activeHeroId, 'lvl-2-iron-will', 'activeHeroId updated to lvl-2-iron-will');
}

// ==========================================
// 5. Test recordDailyFocusCompletion
// ==========================================
console.log('\n--- 5. Record Daily Focus Completion ---');
{
  const now = new Date(2026, 9, 11, 16, 0, 0);
  const state: GamificationState = {
    currentXp: 200,
    currentStreak: 2,
    longestStreak: 2,
    lastActiveDate: '2026-10-10', // yesterday
    unlockedHeroIds: ['lvl-1-awakening'],
    activeHeroId: 'lvl-1-awakening',
    lastBackupTimestamp: 1700000000000,
  };

  const resFocus = recordDailyFocusCompletion(state, {}, 50, now);
  assertEqual(resFocus.earnedXp, 250, 'Awards flat 250 XP for daily focus');
  assertEqual(resFocus.gamification.currentXp, 450, 'currentXp increases 200 -> 450');
  assertEqual(resFocus.gamification.currentStreak, 3, 'Streak advances from 2 to 3');
  assertEqual(resFocus.gamification.lastActiveDate, '2026-10-11', 'lastActiveDate updated to today');
  assertEqual(resFocus.history['2026-10-11'].dailyGoalCompleted, true, 'dailyGoalCompleted marked true in history');
  assertEqual(resFocus.history['2026-10-11'].focusMinutes, 50, 'focusMinutes updated to 50 in history');
  assertEqual(resFocus.history['2026-10-11'].xpEarned, 250, 'xpEarned is 250 in history');
}

if (failures === 0) {
  console.log('\n🎉 ALL GAMIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`\n❌ ${failures} TESTS FAILED!`);
  process.exit(1);
}
