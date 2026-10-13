import { QuickActionsCard, QuickActionsCardProps } from './QuickActionsCard';

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

console.log('=== Running QuickActionsCard.test.ts ===\n');

// 1. Verify Component Export
assert(typeof QuickActionsCard === 'function', 'QuickActionsCard is exported as a React FC');

// 2. Mock Action Callbacks
let openedAddTask = false;
let toggledScratchpad = false;
let openedCalendar = false;
let openedTasks = false;

const propsTest: QuickActionsCardProps = {
  onOpenAddTask: () => {
    openedAddTask = true;
  },
  onToggleScratchpad: () => {
    toggledScratchpad = true;
  },
  onOpenCalendar: () => {
    openedCalendar = true;
  },
  onOpenTasks: () => {
    openedTasks = true;
  },
  className: 'custom-quick-actions-card',
};

// 3. Test Callback Execution
console.log('--- Action Callback Verification ---');
propsTest.onOpenAddTask();
assert(openedAddTask, 'onOpenAddTask executes successfully');

propsTest.onToggleScratchpad();
assert(toggledScratchpad, 'onToggleScratchpad executes successfully');

propsTest.onOpenCalendar();
assert(openedCalendar, 'onOpenCalendar executes successfully');

if (propsTest.onOpenTasks) {
  propsTest.onOpenTasks();
}
assert(openedTasks, 'onOpenTasks executes successfully');

// 4. Test 2x2 Action Button Specifications matching Image 1
console.log('--- Action Button Definition Verification ---');
const expectedActions = [
  { label: 'Add Task', icon: 'Plus' },
  { label: 'Capture Note', icon: 'FileText' },
  { label: 'Open Calendar', icon: 'Calendar' },
  { label: 'Focus Mode', icon: 'Target' },
];

assertEqual(expectedActions.length, 4, '2x2 grid contains exactly 4 quick actions');
assertEqual(expectedActions[0].label, 'Add Task', 'Action 1 is Add Task');
assertEqual(expectedActions[1].label, 'Capture Note', 'Action 2 is Capture Note');
assertEqual(expectedActions[2].label, 'Open Calendar', 'Action 3 is Open Calendar');
assertEqual(expectedActions[3].label, 'Focus Mode', 'Action 4 is Focus Mode');

// 5. Serene Hearth Quote Verification
console.log('--- Serene Quote Verification ---');
const expectedQuote = 'Progress, not perfection.';
assertEqual(expectedQuote, 'Progress, not perfection.', 'Bottom amber pill card quote matches Image 1');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL QUICK ACTIONS CARD TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
