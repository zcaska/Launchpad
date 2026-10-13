import {
  parseTaskDeadline,
  calculateTaskUrgency,
  projectTasksToRadarCoordinates,
  computeSubtaskContainerState,
  calculateTaskOpportunityScore,
  rankTasksByOpportunity,
  getTopOpportunity,
  calculateSessionMomentumIndex,
  toggleTaskInList,
  toggleSubtaskInList,
  RADAR_VIEWBOX,
  RADAR_RINGS,
  DEFAULT_VISIBLE_SUBTASKS,
} from './taskUrgency';
import { QuickNote, Subtask } from '../types';

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

console.log('=== Running taskUrgency.test.ts ===\n');

// Fixed reference date: Tuesday, Oct 13, 2026, 12:00:00 PM local
const refDate = new Date(2026, 9, 13, 12, 0, 0);

// Verify imported constants
assertEqual(RADAR_VIEWBOX.width, 500, 'RADAR_VIEWBOX width is 500');
assertEqual(RADAR_VIEWBOX.height, 400, 'RADAR_VIEWBOX height is 400');
assertEqual(RADAR_RINGS.length, 6, 'RADAR_RINGS has 6 concentric rings defined');
assertEqual(DEFAULT_VISIBLE_SUBTASKS, 2, 'DEFAULT_VISIBLE_SUBTASKS is 2');

// Direct parseTaskDeadline checks
const parsedTime = parseTaskDeadline('15:30', refDate);
assert(parsedTime !== null && parsedTime.getHours() === 15 && parsedTime.getMinutes() === 30, 'parseTaskDeadline parses HH:MM');
const parsedInvalid = parseTaskDeadline('invalid-date-string', refDate);
assertEqual(parsedInvalid, null, 'parseTaskDeadline returns null for invalid string');

// ============================================================================
// 1. Task Deadline Urgency Calculation
// ============================================================================
console.log('--- 1. Task Deadline Urgency Calculation ---');

// 1.1 No deadline
const noDeadlineInfo = calculateTaskUrgency(undefined, refDate);
assertEqual(noDeadlineInfo.tier, 'no_deadline', 'Undefined deadline -> no_deadline tier');
assertEqual(noDeadlineInfo.urgencyWeight, 5, 'No deadline weight is 5');

const emptyDeadlineInfo = calculateTaskUrgency('', refDate);
assertEqual(emptyDeadlineInfo.tier, 'no_deadline', 'Empty string -> no_deadline tier');

// 1.2 Overdue
// Past time today: 10:00 (ref is 12:00)
const overdueTodayInfo = calculateTaskUrgency('10:00', refDate);
assertEqual(overdueTodayInfo.tier, 'overdue', '10:00 AM (past noon) -> overdue');
assert(overdueTodayInfo.isOverdue, 'isOverdue is true');
assertEqual(overdueTodayInfo.urgencyWeight, 100, 'Overdue weight is 100');

// Past date: 2026-10-10
const overdueDateInfo = calculateTaskUrgency('2026-10-10 18:00', refDate);
assertEqual(overdueDateInfo.tier, 'overdue', '2026-10-10 18:00 -> overdue');

// 1.3 Due Soon (<1d / <24h)
// Later today: 16:00 (ref is 12:00, 4 hours later)
const dueTodayInfo = calculateTaskUrgency('16:00', refDate);
assertEqual(dueTodayInfo.tier, 'due_soon', '16:00 (4h away) -> due_soon');
assertEqual(dueTodayInfo.badgeText, 'Due <1d', 'Due soon badge text is Due <1d');
assert(dueTodayInfo.isDueToday, 'isDueToday is true for today');

// Tomorrow morning at 09:00 (21 hours away, < 24h)
const dueTomorrowMorning = calculateTaskUrgency('2026-10-14 09:00', refDate);
assertEqual(dueTomorrowMorning.tier, 'due_soon', '21h away (<24h) -> due_soon');

// 1.4 Upcoming (1 - 3 days / 24h to 72h)
// 2026-10-15 12:00 (48 hours away = 2 days)
const upcomingInfo = calculateTaskUrgency('2026-10-15 12:00', refDate);
assertEqual(upcomingInfo.tier, 'upcoming', '48h away -> upcoming');
assertEqual(upcomingInfo.badgeText, '1-3d', 'Upcoming badge is 1-3d');

// 1.5 Later (> 3 days up to 14 days)
// 2026-10-18 (5 days away)
const laterInfo = calculateTaskUrgency('2026-10-18 12:00', refDate);
assertEqual(laterInfo.tier, 'later', '5 days away -> later');
assertEqual(laterInfo.badgeText, '>3d', 'Later badge is >3d');

// 1.6 Long term (>= 14 days)
// 2026-11-15 (approx 33 days away)
const longTermInfo = calculateTaskUrgency('2026-11-15', refDate);
assertEqual(longTermInfo.tier, 'long_term', '33 days away -> long_term');
assertEqual(longTermInfo.badgeText, 'Long term', 'Long term badge');

// ============================================================================
// 2. Concentric Commitment Radar Coordinate Projection Algorithm
// ============================================================================
console.log('\n--- 2. Concentric Commitment Radar Coordinate Projection ---');

const sampleTasks: QuickNote[] = [
  {
    id: 't-overdue-1',
    text: 'Fix security vulnerability',
    isDone: false,
    createdAt: Date.now(),
    deadline: '2026-10-12 10:00',
    priority: 'urgent',
    durationMinutes: 45,
  },
  {
    id: 't-due-soon-1',
    text: 'Submit code review',
    isDone: false,
    createdAt: Date.now(),
    deadline: '2026-10-13 16:00',
    priority: 'high',
    durationMinutes: 30,
  },
  {
    id: 't-upcoming-1',
    text: 'Prepare sprint demo',
    isDone: false,
    createdAt: Date.now(),
    deadline: '2026-10-15 12:00',
    priority: 'medium',
    durationMinutes: 60,
  },
  {
    id: 't-later-1',
    text: 'Refactor search indexer',
    isDone: false,
    createdAt: Date.now(),
    deadline: '2026-10-19 12:00',
    priority: 'low',
    durationMinutes: 90,
  },
  {
    id: 't-longterm-1',
    text: 'Annual architecture roadmap',
    isDone: false,
    createdAt: Date.now(),
    deadline: '2026-11-20',
    priority: 'low',
    durationMinutes: 120,
  },
  {
    id: 't-nodeadline-1',
    text: 'Organize desktop bookmarks',
    isDone: false,
    createdAt: Date.now(),
    priority: 'medium',
    durationMinutes: 15,
  },
  {
    id: 't-done-1',
    text: 'Completed yesterday',
    isDone: true,
    createdAt: Date.now(),
  },
];

const projectedNodes = projectTasksToRadarCoordinates(sampleTasks, { referenceDate: refDate });

// Should exclude completed task
assertEqual(projectedNodes.length, 6, 'Projected nodes count equals 6 pending tasks');

// Verify all nodes are within SVG viewBox (0 0 500 400)
projectedNodes.forEach((node) => {
  assert(node.x >= 15 && node.x <= 485, `Node ${node.task.text} x=${node.x} inside viewBox [15, 485]`);
  assert(node.y >= 15 && node.y <= 385, `Node ${node.task.text} y=${node.y} inside viewBox [15, 385]`);
});

// Verify radius mapping matches concentric rings
const overdueNode = projectedNodes.find((n) => n.task.id === 't-overdue-1');
assert(Boolean(overdueNode), 'Overdue node found');
assertEqual(overdueNode?.tier, 'overdue', 'Overdue node has tier overdue');
assertEqual(overdueNode?.radius, 42, 'Overdue node is on inner ring (radius 42)');

const noDeadlineNode = projectedNodes.find((n) => n.task.id === 't-nodeadline-1');
assert(Boolean(noDeadlineNode), 'No deadline node found');
assertEqual(noDeadlineNode?.tier, 'no_deadline', 'No deadline node has tier no_deadline');
assertEqual(noDeadlineNode?.radius, 194, 'No deadline node is on outer rim (radius 194)');

// Test sub-track interleaving on dense ring
console.log('Testing dense ring sub-track interleaving:');
const denseOverdueTasks: QuickNote[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t-dense-${i}`,
  text: `Dense Overdue Task ${i}`,
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-12 18:00', // Overdue (inner ring R=42, circumference ~264px, 264/12 = 22px < 26px minNodeDistance)
  priority: 'high',
}));

const denseNodes = projectTasksToRadarCoordinates(denseOverdueTasks, { referenceDate: refDate });
assertEqual(denseNodes.length, 12, '12 dense nodes projected');
const subTrackNodes = denseNodes.filter((n) => n.isSubTrack);
assert(subTrackNodes.length > 0, 'Sub-tracks activated for crowded ring to prevent overlap');

// ============================================================================
// 3. Stable Subtask Container Behavior
// ============================================================================
console.log('\n--- 3. Stable Subtask Container Behavior ---');

const sampleSubtasks: Subtask[] = [
  { id: 's1', text: 'Step 1: Write spec', isDone: true },
  { id: 's2', text: 'Step 2: Implement core algorithm', isDone: true },
  { id: 's3', text: 'Step 3: Add unit tests', isDone: false },
  { id: 's4', text: 'Step 4: Verify in browser', isDone: false },
  { id: 's5', text: 'Step 5: Document handoff', isDone: false },
];

// 3.1 Collapsed default (2 visible)
const collapsedState = computeSubtaskContainerState(sampleSubtasks, false);
assertEqual(collapsedState.totalCount, 5, 'Total subtasks is 5');
assertEqual(collapsedState.completedCount, 2, 'Completed subtasks is 2');
assertEqual(collapsedState.progressPercentage, 40, 'Progress percentage is 40%');
assertEqual(collapsedState.canExpand, true, 'canExpand is true (>2)');
assertEqual(collapsedState.isExpanded, false, 'isExpanded is false');
assertEqual(collapsedState.visibleSubtasks.length, 2, 'Visible subtasks is 2 when collapsed');
assertEqual(collapsedState.hiddenCount, 3, 'Hidden count is 3 (5 - 2)');
assertEqual(collapsedState.toggleLabel, '+3 more subtasks', 'Toggle label matches +3 more subtasks');
assert(!collapsedState.classes.list.includes('max-h-48'), 'Collapsed does not have scroll container');

// 3.2 Expanded state
const expandedState = computeSubtaskContainerState(sampleSubtasks, true);
assertEqual(expandedState.visibleSubtasks.length, 5, 'Visible subtasks is 5 when expanded');
assertEqual(expandedState.hiddenCount, 0, 'Hidden count is 0 when expanded');
assertEqual(expandedState.toggleLabel, 'Show less', 'Toggle label matches Show less');
assert(expandedState.classes.list.includes('overscroll-contain'), 'Expanded has overscroll-contain');
assert(expandedState.classes.list.includes('overflow-y-auto'), 'Expanded has overflow-y-auto');

// 3.3 Small subtasks (<= 2)
const smallSubtasks: Subtask[] = [
  { id: 's1', text: 'Only subtask', isDone: true },
];
const smallState = computeSubtaskContainerState(smallSubtasks, false);
assertEqual(smallState.canExpand, false, 'canExpand is false for 1 subtask');
assertEqual(smallState.hiddenCount, 0, 'hiddenCount is 0 for 1 subtask');
assertEqual(smallState.status, 'completed', 'Status is completed when all are done');

// ============================================================================
// 4. Momentum & Next Opportunity Ranking Logic
// ============================================================================
console.log('\n--- 4. Momentum & Next Opportunity Ranking Logic ---');

const ranked = rankTasksByOpportunity(sampleTasks, {
  availableFocusMinutes: 45,
  referenceDate: refDate,
});

assertEqual(ranked.length, 6, 'Ranked pending tasks count is 6');

// First ranked should be highest priority + urgency (Fix security vulnerability - overdue urgent)
const topOpp = getTopOpportunity(sampleTasks, {
  availableFocusMinutes: 45,
  referenceDate: refDate,
});

assert(Boolean(topOpp), 'Top opportunity returned');
assertEqual(topOpp?.task.id, 't-overdue-1', 'Top opportunity is overdue urgent task');
assertEqual(topOpp?.tag, 'critical_overdue', 'Top opportunity tag is critical_overdue');

// Test momentum bonus with partial subtasks
const highMomentumTask: QuickNote = {
  id: 't-momentum-1',
  text: 'Finalize client report',
  isDone: false,
  createdAt: Date.now(),
  priority: 'high',
  durationMinutes: 30,
  deadline: '2026-10-13 18:00', // due today
  subtasks: [
    { id: 'sm1', text: 'Part 1', isDone: true },
    { id: 'sm2', text: 'Part 2', isDone: true },
    { id: 'sm3', text: 'Part 3', isDone: true },
    { id: 'sm4', text: 'Part 4', isDone: false }, // 75% done!
  ],
};

const momentumAnalysis = calculateTaskOpportunityScore(highMomentumTask, {
  availableFocusMinutes: 45,
  referenceDate: refDate,
});

assert(momentumAnalysis.breakdown.momentumScore >= 30, 'High momentum bonus awarded (>=30)');
assertEqual(momentumAnalysis.tag, 'high_momentum', 'Tag classified as high_momentum');

// 4.2 Session Momentum Index
const sessionStats = calculateSessionMomentumIndex([
  ...sampleTasks,
  highMomentumTask,
]);

assert(sessionStats.momentumIndex > 0, `Session momentum index calculated: ${sessionStats.momentumIndex}`);
assert(['Ignition', 'Building Steam', 'Flow State', 'Unstoppable'].includes(sessionStats.tierName), 'Valid tier name');

// ============================================================================
// 5. Subtask and Parent Task Completion Synchronization
// ============================================================================
console.log('\n--- 5. Subtask and Parent Task Completion Synchronization ---');

const syncTask1: QuickNote = {
  id: 't-sync-1',
  text: 'Sync Parent Task',
  isDone: false,
  createdAt: Date.now(),
  subtasks: [
    { id: 'st-1', text: 'Subtask 1', isDone: false },
    { id: 'st-2', text: 'Subtask 2', isDone: false },
    { id: 'st-3', text: 'Subtask 3', isDone: false },
  ],
};

const taskList = [syncTask1];

// 5.1 Completing parent task marks all subtasks complete
const { updatedTasks: afterParentDone, isNowDone } = toggleTaskInList(taskList, 't-sync-1');
assertEqual(isNowDone, true, 'Parent task toggled to done');
assertEqual(afterParentDone[0].isDone, true, 'Parent task isDone is true');
assert(afterParentDone[0].subtasks?.every((s) => s.isDone) === true, 'All subtasks are marked done when parent is completed');

// 5.2 Uncompleting parent task marks all subtasks incomplete
const { updatedTasks: afterParentUndone } = toggleTaskInList(afterParentDone, 't-sync-1');
assertEqual(afterParentUndone[0].isDone, false, 'Parent task isDone is false');
assert(afterParentUndone[0].subtasks?.every((s) => !s.isDone) === true, 'All subtasks are marked incomplete when parent is uncompleted');

// 5.3 Completing 1 of 3 subtasks does NOT complete parent task
const { updatedTasks: afterSub1, parentBecameDone: pDone1 } = toggleSubtaskInList(afterParentUndone, 't-sync-1', 'st-1');
assertEqual(pDone1, false, 'Parent did not become done after 1 of 3 subtasks');
assertEqual(afterSub1[0].isDone, false, 'Parent task remains incomplete after 1 subtask');

// 5.4 Completing 2 of 3 subtasks does NOT complete parent task
const { updatedTasks: afterSub2, parentBecameDone: pDone2 } = toggleSubtaskInList(afterSub1, 't-sync-1', 'st-2');
assertEqual(pDone2, false, 'Parent did not become done after 2 of 3 subtasks');
assertEqual(afterSub2[0].isDone, false, 'Parent task remains incomplete after 2 subtasks');

// 5.5 Completing all 3 subtasks marks parent task complete
const { updatedTasks: afterSub3, parentBecameDone: pDone3 } = toggleSubtaskInList(afterSub2, 't-sync-1', 'st-3');
assertEqual(pDone3, true, 'parentBecameDone is true when final subtask completed');
assertEqual(afterSub3[0].isDone, true, 'Parent task is marked complete when all subtasks completed');

// 5.6 Unchecking 1 subtask when parent was complete marks parent task incomplete
const { updatedTasks: afterUncheckSub, parentBecameIncomplete } = toggleSubtaskInList(afterSub3, 't-sync-1', 'st-2');
assertEqual(parentBecameIncomplete, true, 'parentBecameIncomplete is true when subtask unchecked');
assertEqual(afterUncheckSub[0].isDone, false, 'Parent task is marked incomplete when any subtask unchecked');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (0 failures)');
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`);
  process.exit(1);
}
