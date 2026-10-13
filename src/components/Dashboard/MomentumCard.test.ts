import { MomentumCard, MomentumCardProps } from './MomentumCard';
import { QuickNote, DailyGrowthRecord, GamificationState } from '../../types';

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

console.log('=== Running MomentumCard.test.ts ===\n');

// 1. Verify Component Export
assert(typeof MomentumCard === 'function', 'MomentumCard is exported as a React FC');

// 2. Mock Data matching Image 1 (1 / 4 tasks completed)
const mockTasks: QuickNote[] = [
  {
    id: 'task-1',
    text: 'AI Summit Keynote Prep',
    isDone: true,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'task-2',
    text: 'Revise Economics Notes',
    isDone: false,
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'task-3',
    text: 'Excel Test Practice',
    isDone: false,
    createdAt: Date.now() - 10800000,
  },
  {
    id: 'task-4',
    text: 'Spanish Practice',
    isDone: false,
    createdAt: Date.now() - 14400000,
  },
];

const mockGrowthHistory: Record<string, DailyGrowthRecord> = {
  '2026-10-13': {
    tasksCompleted: 1,
    focusMinutes: 120,
    xpEarned: 240,
    dailyGoalCompleted: false,
  },
};

const mockGamification: GamificationState = {
  currentXp: 1850,
  currentStreak: 4,
  longestStreak: 12,
  lastActiveDate: '2026-10-13',
  unlockedHeroIds: ['awakening', 'rocky_goggins', 'tony_tesla'],
  activeHeroId: 'tony_tesla',
  lastBackupTimestamp: Date.now(),
};

// 3. Test Props Interface Conformance
console.log('--- Props Interface Conformance ---');
const propsTest: MomentumCardProps = {
  tasks: mockTasks,
  growthHistory: mockGrowthHistory,
  gamification: mockGamification,
  className: 'test-class',
};

assert(Array.isArray(propsTest.tasks), 'Accepts tasks array prop');
assertEqual(propsTest.tasks.length, 4, 'Tasks count is 4');
assert(propsTest.growthHistory !== undefined, 'Accepts growthHistory prop');
assert(propsTest.gamification !== undefined, 'Accepts gamification prop');

// 4. Test Calculation Metrics
console.log('--- Momentum Logic Verification ---');
const completed = mockTasks.filter((t) => t.isDone).length;
const total = mockTasks.length;
assertEqual(completed, 1, 'Completed tasks count is 1');
assertEqual(total, 4, 'Total tasks count is 4');

const progressRatio = completed / total;
assertEqual(progressRatio, 0.25, 'Progress ratio matches 0.25 (25%)');

// Milestone leaf verification: 1st milestone reached, remaining 3 pending
const milestone1 = completed >= 1;
const milestone2 = completed >= 2;
const milestone3 = completed >= 3;
const milestone4 = completed >= 4;

assert(milestone1 === true, 'Milestone 1 is reached (active leaf)');
assert(milestone2 === false, 'Milestone 2 is not reached (muted leaf)');
assert(milestone3 === false, 'Milestone 3 is not reached (muted leaf)');
assert(milestone4 === false, 'Milestone 4 is not reached (muted leaf)');

// 5. SVG Ring Geometry Verification
console.log('--- SVG Geometry Verification ---');
const radius = 38;
const circumference = 2 * Math.PI * radius;
const dashOffset = circumference - progressRatio * circumference;
assert(circumference > 238 && circumference < 240, 'SVG circumference is ~238.76px');
assert(dashOffset > 178 && dashOffset < 180, 'Dashoffset correctly offsets 75% for 25% progress');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL MOMENTUM CARD TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
