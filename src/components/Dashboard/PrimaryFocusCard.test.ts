import { PrimaryFocusCard, PrimaryFocusCardProps } from './PrimaryFocusCard';
import { QuickNote, Subtask } from '../../types';
import { calculateTaskUrgency, computeSubtaskContainerState } from '../../utils/taskUrgency';

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

console.log('=== Running PrimaryFocusCard.test.ts ===\n');

// 1. Verify Component Definition
assert(typeof PrimaryFocusCard === 'function', 'PrimaryFocusCard component is exported as a React FC');

// 2. Mock Data for Image 1
const mockSubtasks: Subtask[] = [
  {
    id: 'sub-1',
    text: 'Prepare keynote material\nCreate draft slides and key talking points',
    isDone: false,
  },
  {
    id: 'sub-2',
    text: 'Review meeting details\nCheck agenda, audience profile and venue info',
    isDone: false,
  },
  {
    id: 'sub-3',
    text: 'Rehearse presentation timing',
    isDone: false,
  },
  {
    id: 'sub-4',
    text: 'Coordinate with conference AV team',
    isDone: false,
  },
  {
    id: 'sub-5',
    text: 'Prepare live demo fallback video',
    isDone: false,
  },
  {
    id: 'sub-6',
    text: 'Print attendee summary sheets',
    isDone: false,
  },
  {
    id: 'sub-7',
    text: 'Send confirmation email to organizers',
    isDone: false,
  },
];

const mockTask: QuickNote = {
  id: 'task-ai-summit',
  text: 'AI Summit Conference',
  description: 'AI summit meeting at Pune – Hall A keynote',
  isDone: false,
  createdAt: Date.now() - 3600000,
  durationMinutes: 120,
  deadline: '22:00', // Due today at 10:00 PM
  priority: 'high',
  source: 'google_calendar',
  eventId: 'gcal-event-123',
  subtasks: mockSubtasks,
};

// 3. Test computeSubtaskContainerState with Image 1 properties
console.log('--- Subtask Container State Verification ---');
const collapsedState = computeSubtaskContainerState(mockSubtasks, false, 2);
assertEqual(collapsedState.totalCount, 7, 'Total subtasks is 7');
assertEqual(collapsedState.completedCount, 0, 'Completed subtasks is 0');
assertEqual(collapsedState.visibleSubtasks.length, 2, 'Default visible subtasks count is exactly 2');
assertEqual(collapsedState.canExpand, true, 'canExpand is true when subtasks > 2');
assertEqual(collapsedState.hiddenCount, 5, 'Hidden subtasks count is 5 (7 - 2)');

const expandedState = computeSubtaskContainerState(mockSubtasks, true, 2);
assertEqual(expandedState.visibleSubtasks.length, 7, 'Expanded visible subtasks count is 7');
assertEqual(expandedState.hiddenCount, 0, 'Hidden subtasks count is 0 when expanded');

// 4. Test calculateTaskUrgency Integration
console.log('--- Task Urgency Integration ---');
const urgencyInfo = calculateTaskUrgency(mockTask.deadline);
assert(urgencyInfo.tier !== undefined, 'Urgency tier is defined');
assert(urgencyInfo.badgeText !== undefined, 'Urgency badgeText is defined');

// 5. Test Props interface conformance
console.log('--- Props Interface Conformance ---');
const propsTest: PrimaryFocusCardProps = {
  tasks: [mockTask],
  selectedTaskId: mockTask.id,
  onSelectTask: (_id: string) => {},
  onToggleTask: (_taskId: string) => {},
  onToggleSubtask: (_taskId: string, _subtaskId: string) => {},
  onOpenTaskEdit: (_task: QuickNote) => {},
  onOpenCalendarSettings: () => {},
  clockFormat: '12h',
  className: 'custom-test-class',
};
assert(propsTest.tasks.length === 1, 'Accepts tasks array prop');
assert(propsTest.clockFormat === '12h', 'Accepts clockFormat 12h or 24h prop');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL PRIMARY FOCUS CARD TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
