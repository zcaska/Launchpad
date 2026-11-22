import { QuickNote, Subtask } from '../types';
import { calculateTaskLoad, calculateBuffer } from './timeBudget';
import { calculateTaskUrgency, formatTaskCountdown, computeSubtaskContainerState } from './taskUrgency';
import { formatMinutesToHours as formatEventDuration } from './timeBudget';
import { FocusTimerState, elapsedSeconds, formatElapsed } from './focusTimer';

let failures = 0;

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected "${expected}", got "${actual}")`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('=== Running importedTaskBehavior.test.ts ===\n');

// Standardized test fixtures
const localTask: QuickNote & Record<string, unknown> = {
  id: 'task-local-1',
  text: 'Draft Q4 Project Roadmap',
  description: 'Outline key milestones and deliverables',
  isDone: false,
  createdAt: Date.now() - 3600000,
  durationMinutes: 90,
  deadline: '2026-11-10T14:00:00.000Z',
  priority: 'high',
  source: 'local',
  timeSpentSeconds: 1200,
};

const importedGCalTask: QuickNote & Record<string, unknown> = {
  id: 'task-gcal-1',
  text: 'Quarterly Architecture Review',
  description: 'Synchronized event discussion with system engineers',
  isDone: false,
  createdAt: Date.now() - 7200000,
  durationMinutes: 90,
  deadline: '2026-11-10T14:00:00.000Z',
  priority: 'high',
  source: 'google_calendar',
  eventId: 'gcal-evt-999',
  timeSpentSeconds: 1200,
  attachedUrls: [{ id: 'url-gcal-1', title: 'Calendar Invite', url: 'https://meet.google.com/abc-defg-hij' }],
};

const importedTickTickTask: QuickNote & Record<string, unknown> = {
  id: 'task-tt-1',
  text: 'Refactor Auth Token Pipeline',
  description: 'Imported from TickTick work project',
  isDone: false,
  createdAt: Date.now() - 10800000,
  durationMinutes: 90,
  deadline: '2026-11-10T14:00:00.000Z',
  priority: 'high',
  source: 'ticktick',
  ticktickTaskId: 'tt-task-888',
  ticktickProjectId: 'tt-proj-1',
  timeSpentSeconds: 1200,
};

// =========================================================================
// 1. WORKLOAD & TIME BUDGET PARITY
// =========================================================================
console.log('--- 1. Workload and Time Budget Parity ---');

const localOnlyLoad = calculateTaskLoad([localTask]);
const gcalOnlyLoad = calculateTaskLoad([importedGCalTask]);
const ttOnlyLoad = calculateTaskLoad([importedTickTickTask]);

assertEqual(gcalOnlyLoad.pendingMinutes, localOnlyLoad.pendingMinutes, 'Google Calendar task produces identical pending minutes to local task (90m)');
assertEqual(ttOnlyLoad.pendingMinutes, localOnlyLoad.pendingMinutes, 'TickTick task produces identical pending minutes to local task (90m)');



const combinedLoad = calculateTaskLoad([localTask, importedGCalTask, importedTickTickTask]);
assertEqual(combinedLoad.pendingCount, 3, 'All 3 tasks counted in unified pendingCount');
assertEqual(combinedLoad.pendingMinutes, 270, 'Combined pendingMinutes is exactly 270m (90 + 90 + 90)');

const bufferLocal = calculateBuffer(360, localOnlyLoad.pendingMinutes);
const bufferGCal = calculateBuffer(360, gcalOnlyLoad.pendingMinutes);
const bufferTT = calculateBuffer(360, ttOnlyLoad.pendingMinutes);

assertEqual(bufferGCal.bufferMinutes, bufferLocal.bufferMinutes, 'Buffer minutes match across local and GCal tasks');
assertEqual(bufferTT.bufferMinutes, bufferLocal.bufferMinutes, 'Buffer minutes match across local and TickTick tasks');
assertEqual(bufferGCal.status, bufferLocal.status, 'Buffer status matches across local and GCal tasks');
assertEqual(bufferTT.status, bufferLocal.status, 'Buffer status matches across local and TickTick tasks');

// =========================================================================
// 2. TASK URGENCY & SELECTION PARITY
// =========================================================================
console.log('\n--- 2. Task Urgency and Selection Parity ---');

const refNow = new Date('2026-11-10T12:00:00.000Z');
const urgLocal = calculateTaskUrgency(localTask.deadline, refNow);
const urgGCal = calculateTaskUrgency(importedGCalTask.deadline, refNow);
const urgTT = calculateTaskUrgency(importedTickTickTask.deadline, refNow);

assertEqual(urgGCal.tier, urgLocal.tier, 'Urgency tier matches between GCal and local tasks');
assertEqual(urgTT.tier, urgLocal.tier, 'Urgency tier matches between TickTick and local tasks');
assertEqual(urgGCal.urgencyWeight, urgLocal.urgencyWeight, 'Urgency weight matches between GCal and local tasks');
assertEqual(urgTT.urgencyWeight, urgLocal.urgencyWeight, 'Urgency weight matches between TickTick and local tasks');
assertEqual(urgGCal.badgeText, urgLocal.badgeText, 'Urgency badge matches between GCal and local tasks');

assertEqual(formatTaskCountdown(importedGCalTask, refNow), formatTaskCountdown(localTask, refNow), 'Countdown formatting matches between GCal and local tasks (2h left)');
assertEqual(formatTaskCountdown(importedTickTickTask, refNow), formatTaskCountdown(localTask, refNow), 'Countdown formatting matches between TickTick and local tasks (2h left)');

// Focus Selection Priority: urgency tier determines active task, not task source
const overdueGCalTask: QuickNote & Record<string, unknown> = {
  ...importedGCalTask,
  id: 'task-gcal-overdue',
  deadline: '2026-11-10T10:00:00.000Z', // 2h overdue relative to refNow
};

function selectActiveTask(taskList: QuickNote[]): QuickNote | null {
  const pending = taskList.filter((t) => !t.isDone);
  if (pending.length === 0) return null;
  return [...pending].sort((a, b) => {
    const wa = calculateTaskUrgency(a.deadline, refNow).urgencyWeight;
    const wb = calculateTaskUrgency(b.deadline, refNow).urgencyWeight;
    return wb - wa;
  })[0];
}

const selected1 = selectActiveTask([localTask, overdueGCalTask]);
assertEqual(selected1?.id, overdueGCalTask.id, 'Imported overdue GCal task correctly selected over due_soon local task');

const overdueLocalTask: QuickNote & Record<string, unknown> = {
  ...localTask,
  id: 'task-local-overdue',
  deadline: '2026-11-10T10:00:00.000Z', // 2h overdue
};

const selected2 = selectActiveTask([importedTickTickTask, overdueLocalTask]);
assertEqual(selected2?.id, overdueLocalTask.id, 'Local overdue task correctly selected over due_soon imported task');

// =========================================================================
// 3. TIMER & EXECUTION PARITY
// =========================================================================
console.log('\n--- 3. Focus Timer & Execution Parity ---');

const baseTime = 1700000000000;
const localTimer: FocusTimerState = {
  taskId: localTask.id,
  running: true,
  startedAt: baseTime,
  baseSeconds: 0,
};

const gcalTimer: FocusTimerState = {
  taskId: importedGCalTask.id,
  running: true,
  startedAt: baseTime,
  baseSeconds: 0,
};

const ttTimer: FocusTimerState = {
  taskId: importedTickTickTask.id,
  running: true,
  startedAt: baseTime,
  baseSeconds: 0,
};

const nowPlus300s = baseTime + 300000;
assertEqual(elapsedSeconds(gcalTimer, nowPlus300s), elapsedSeconds(localTimer, nowPlus300s), 'GCal timer elapsed seconds matches local timer exactly (300s)');
assertEqual(elapsedSeconds(ttTimer, nowPlus300s), elapsedSeconds(localTimer, nowPlus300s), 'TickTick timer elapsed seconds matches local timer exactly (300s)');
assertEqual(formatElapsed(elapsedSeconds(gcalTimer, nowPlus300s)), '5:00', 'Timer formatting renders identical 5:00 for imported task');

// Time banking parity
function bankTimerSeconds(task: QuickNote, elapsedSec: number): QuickNote {
  return {
    ...task,
    timeSpentSeconds: (task.timeSpentSeconds || 0) + elapsedSec,
  };
}

const bankedLocal = bankTimerSeconds(localTask, 300);
const bankedGCal = bankTimerSeconds(importedGCalTask, 300);
const bankedTT = bankTimerSeconds(importedTickTickTask, 300);

assertEqual(bankedLocal.timeSpentSeconds, 1500, 'Banked seconds on local task matches 1500s');
assertEqual(bankedGCal.timeSpentSeconds, 1500, 'Banked seconds on GCal task matches local (1200 + 300 = 1500s)');
assertEqual(bankedTT.timeSpentSeconds, 1500, 'Banked seconds on TickTick task matches local (1200 + 300 = 1500s)');

// =========================================================================
// 4. SUBTASK CONTAINER PARITY
// =========================================================================
console.log('\n--- 4. Subtasks and Content Preservation Parity ---');

const testSubtasks: Subtask[] = [
  { id: 'sub-1', text: 'Step A', isDone: true },
  { id: 'sub-2', text: 'Step B', isDone: false },
  { id: 'sub-3', text: 'Step C', isDone: false },
];

const gcalWithSubtasks: QuickNote & Record<string, unknown> = { ...importedGCalTask, subtasks: testSubtasks };
const localWithSubtasks: QuickNote & Record<string, unknown> = { ...localTask, subtasks: testSubtasks };

const subStateGCal = computeSubtaskContainerState(gcalWithSubtasks.subtasks || [], false, 2);
const subStateLocal = computeSubtaskContainerState(localWithSubtasks.subtasks || [], false, 2);

assertEqual(subStateGCal.totalCount, subStateLocal.totalCount, 'Subtask total count matches');
assertEqual(subStateGCal.completedCount, subStateLocal.completedCount, 'Subtask completed count matches');
assertEqual(subStateGCal.hiddenCount, subStateLocal.hiddenCount, 'Subtask hidden count matches');
assertEqual(subStateGCal.canExpand, subStateLocal.canExpand, 'Subtask canExpand matches');

// Duration estimate parity
assertEqual(formatEventDuration(importedGCalTask.durationMinutes || 0), formatEventDuration(localTask.durationMinutes || 0), 'formatEventDuration produces identical output (1h 30m)');

// =========================================================================
// 5. COMPLETION & TOGGLE PARITY
// =========================================================================
console.log('\n--- 5. Task Completion Toggle Parity ---');

function toggleTask(task: QuickNote): QuickNote {
  return {
    ...task,
    isDone: !task.isDone,
  };
}

const toggledLocal = toggleTask(localTask);
const toggledGCal = toggleTask(importedGCalTask);
const toggledTT = toggleTask(importedTickTickTask);

assertEqual(toggledGCal.isDone, true, 'Imported GCal task toggles to completed identically');
assertEqual(toggledTT.isDone, true, 'Imported TickTick task toggles to completed identically');

// Post-completion workload parity
const completedLoad = calculateTaskLoad([toggledLocal, toggledGCal, toggledTT]);
assertEqual(completedLoad.pendingCount, 0, 'All completed tasks leave 0 pendingCount');
assertEqual(completedLoad.completedCount, 3, 'All completed tasks counted in completedCount');
assertEqual(completedLoad.completedMinutes, 270, 'Completed minutes = 270m');
assertEqual(completedLoad.pendingMinutes, 0, 'Pending minutes = 0m');

console.log('\n=======================================');
if (failures > 0) {
  console.error(`❌ ${failures} test(s) FAILED`);
  process.exit(1);
} else {
  console.log('🎉 ALL IMPORTED TASK BEHAVIOR PARITY TESTS PASSED SUCCESSFULLY! (0 failures)');
}
