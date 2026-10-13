import {
  CommitmentRadarWidget,
  CommitmentRadarWidgetProps,
  formatTaskCountdown,
  TIER_PRESENTATION_MAP,
} from './CommitmentRadarWidget';
import { QuickNote, CalendarScheduleSummary } from '../../types';
import {
  projectTasksToRadarCoordinates,
  RADAR_VIEWBOX,
  RADAR_RINGS,
  URGENCY_COLOR_MAP,
  calculateTaskUrgency,
} from '../../utils/taskUrgency';

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

console.log('=== Running CommitmentRadarWidget.test.ts ===\n');

// 1. Verify Component Definition
assert(typeof CommitmentRadarWidget === 'function', 'CommitmentRadarWidget component is exported as a React FC');

// 2. Mock Data Matching Image 1 from docs/Design-Proposal/LaunchPad Productivity Dashboard.png
const refDate = new Date('2026-10-13T16:25:00.000Z');

const mockTasksImage1: QuickNote[] = [
  // 1. "AI Summit" - Due in ~5h 35m
  {
    id: 'task-ai-summit',
    text: 'AI Summit',
    isDone: false,
    createdAt: Date.now() - 3600000,
    deadline: '2026-10-13T22:00:00.000Z', // +5h 35m
    priority: 'high',
  },
  // 2. "Economics Essay" - Due in 2 days
  {
    id: 'task-economics-essay',
    text: 'Economics Essay',
    isDone: false,
    createdAt: Date.now() - 3600000,
    deadline: '2026-10-15T16:25:00.000Z', // +2 days
    priority: 'medium',
  },
  // 3. "Excel Test" - Due in 4 days
  {
    id: 'task-excel-test',
    text: 'Excel Test',
    isDone: false,
    createdAt: Date.now() - 3600000,
    deadline: '2026-10-17T16:25:00.000Z', // +4 days
    priority: 'medium',
  },
  // 4. "DSC Interview" - Due in 6 days
  {
    id: 'task-dsc-interview',
    text: 'DSC Interview',
    isDone: false,
    createdAt: Date.now() - 3600000,
    deadline: '2026-10-19T16:25:00.000Z', // +6 days
    priority: 'urgent',
  },
  // 5. "Spanish Practice" - Due in 1 week (7 days)
  {
    id: 'task-spanish-practice',
    text: 'Spanish Practice',
    isDone: false,
    createdAt: Date.now() - 3600000,
    deadline: '2026-10-20T16:25:00.000Z', // +7 days -> 1 week
    priority: 'low',
  },
  // 6. No deadline task
  {
    id: 'task-open-horizon',
    text: 'Read Book',
    isDone: false,
    createdAt: Date.now() - 3600000,
  },
];

// 3. Test Direct calculateTaskUrgency Usage
console.log('--- Direct calculateTaskUrgency Verification ---');
const urgencyInfo = calculateTaskUrgency(mockTasksImage1[0].deadline, refDate);
assertEqual(urgencyInfo.tier, 'due_soon', 'AI Summit calculates to tier "due_soon"');
assert(urgencyInfo.diffHours !== null && urgencyInfo.diffHours < 24, 'AI Summit diffHours is < 24h');

// 4. Test Countdown Formatting matching Image 1
console.log('--- Countdown Formatting Verification ---');
const countdownAi = formatTaskCountdown(mockTasksImage1[0], refDate);
assertEqual(countdownAi, '5h 35m left', 'AI Summit countdown matches "5h 35m left"');

const countdownEcon = formatTaskCountdown(mockTasksImage1[1], refDate);
assertEqual(countdownEcon, '2 days left', 'Economics Essay countdown matches "2 days left"');

const countdownExcel = formatTaskCountdown(mockTasksImage1[2], refDate);
assertEqual(countdownExcel, '4 days left', 'Excel Test countdown matches "4 days left"');

const countdownDsc = formatTaskCountdown(mockTasksImage1[3], refDate);
assertEqual(countdownDsc, '6 days left', 'DSC Interview countdown matches "6 days left"');

const countdownSpanish = formatTaskCountdown(mockTasksImage1[4], refDate);
assertEqual(countdownSpanish, '1 week left', 'Spanish Practice countdown matches "1 week left"');

const countdownNoDeadline = formatTaskCountdown(mockTasksImage1[5], refDate);
assertEqual(countdownNoDeadline, 'No deadline', 'Open Horizon task countdown returns "No deadline"');

// 5. Test Coordinate Projection via projectTasksToRadarCoordinates
console.log('--- Coordinate Projection Verification ---');
const projected = projectTasksToRadarCoordinates(mockTasksImage1, {
  viewBox: RADAR_VIEWBOX,
  referenceDate: refDate,
});

assertEqual(projected.length, 6, 'All 6 pending tasks are projected');
assertEqual(RADAR_VIEWBOX.width, 500, 'RADAR_VIEWBOX width is 500');
assertEqual(RADAR_VIEWBOX.height, 400, 'RADAR_VIEWBOX height is 400');
assertEqual(RADAR_VIEWBOX.centerX, 250, 'RADAR_VIEWBOX centerX is 250');
assertEqual(RADAR_VIEWBOX.centerY, 200, 'RADAR_VIEWBOX centerY is 200');
assert(RADAR_RINGS.length >= 5, 'RADAR_RINGS has at least 5 rings');

projected.forEach((node) => {
  assert(node.x >= 0 && node.x <= 500, `Node ${node.task.text} x (${node.x}) is within SVG width [0, 500]`);
  assert(node.y >= 0 && node.y <= 400, `Node ${node.task.text} y (${node.y}) is within SVG height [0, 400]`);
  assert(node.nodeSize > 0, `Node ${node.task.text} has positive nodeSize`);
});

// 6. Test Urgency Token Maps
console.log('--- Urgency Token Verification ---');
assert(URGENCY_COLOR_MAP.overdue.radarPoint !== undefined, 'URGENCY_COLOR_MAP has overdue color');
assert(URGENCY_COLOR_MAP.due_soon.radarPoint !== undefined, 'URGENCY_COLOR_MAP has due_soon color');
assert(TIER_PRESENTATION_MAP.due_soon.legendDotColor === '#f43f5e', 'Critical dot color is rose/red (#f43f5e)');
assert(TIER_PRESENTATION_MAP.upcoming.legendDotColor === '#f97316', 'Upcoming dot color is orange (#f97316)');
assert(TIER_PRESENTATION_MAP.later.legendDotColor === '#eab308', 'Later dot color is yellow/amber (#eab308)');
assert(TIER_PRESENTATION_MAP.long_term.legendDotColor === '#10b981', 'Long term dot color is green (#10b981)');

// 7. Test Props Interface Conformance
console.log('--- Props Interface Conformance ---');
const mockCalendarSummary: CalendarScheduleSummary = {
  events: [],
  totalBusyMinutesToday: 90,
  remainingBusyMinutesToday: 90,
};

const validProps: CommitmentRadarWidgetProps = {
  tasks: mockTasksImage1,
  onSelectTask: (_id: string) => {},
  onOpenTasks: () => {},
  className: 'custom-radar-class',
  calendarSummary: mockCalendarSummary,
};

assert(validProps.tasks.length === 6, 'Accepts tasks array');
assert(typeof validProps.onSelectTask === 'function', 'Accepts onSelectTask callback');
assert(typeof validProps.onOpenTasks === 'function', 'Accepts onOpenTasks callback');
assert(validProps.calendarSummary?.remainingBusyMinutesToday === 90, 'Accepts calendarSummary');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL COMMITMENT RADAR WIDGET TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
