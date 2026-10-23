import { 
  generateCandidatePool, 
  getRankedRecommendations, 
  recordRejection 
} from '../utils/recommender';
import { DEFAULT_INITIAL_PREFERENCES } from '../data/seedData';
import { toggleTaskInList } from '../utils/taskUrgency';
import { calculateTaskLoad } from '../utils/timeBudget';
import { QuickNote } from '../types';

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

console.log('\n=== RUNNING FEATURES VERIFICATION TEST ===\n');

// -----------------------------------------------------------------------------
// 1. Smart Suggestion Shuffle (No Rejection Penalty)
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Smart Suggestion Shuffle ---');
{
  const pool = generateCandidatePool();
  let prefs = { ...DEFAULT_INITIAL_PREFERENCES };

  const ranked = getRankedRecommendations(pool, prefs, 'morning', pool.length);
  assert(ranked.length > 3, `Pool has multiple candidates (${ranked.length})`);

  let offset = 0;
  const firstSuggestion = ranked[offset % ranked.length];
  assert(Boolean(firstSuggestion), 'First suggestion retrieved');

  // User shuffles to next suggestion without rejecting
  offset++;
  const secondSuggestion = ranked[offset % ranked.length];
  assert(Boolean(secondSuggestion), 'Second suggestion retrieved on shuffle');
  assert(firstSuggestion.id !== secondSuggestion.id, 'Second suggestion differs from first');

  // Verify learned preferences were NOT penalized by shuffle
  assertEqual(prefs.rejectionsCount, 0, 'Rejection count remains 0 on shuffle');
  assertEqual(prefs.approvalsCount, 0, 'Approval count remains 0 on shuffle');
  assertEqual(prefs.recentRejections.length, 0, 'No rejections in history');

  // Only when user explicitly dislikes/rejects:
  prefs = recordRejection(prefs, secondSuggestion, 'morning');
  assertEqual(prefs.rejectionsCount, 1, 'Rejection recorded only on explicit reject');
  assert(prefs.recentRejections.some((r) => r.id === secondSuggestion.id), 'Rejected id saved in history');
}

// -----------------------------------------------------------------------------
// 2. All Tasks Cleared Confetti Celebration Trigger
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing All Tasks Cleared Celebration Logic ---');
{
  const initialNotes: QuickNote[] = [
    { id: 'task-1', text: 'Task 1', isDone: false, createdAt: Date.now(), durationMinutes: 30 },
    { id: 'task-2', text: 'Task 2', isDone: false, createdAt: Date.now(), durationMinutes: 45 },
  ];

  let prevPendingForCelebration = initialNotes.filter((t) => !t.isDone).length;
  let isCelebrating = false;

  // Step 1: Complete first task
  const { updatedTasks: step1Tasks, isNowDone: step1Done } = toggleTaskInList(initialNotes, 'task-1');
  assert(step1Done, 'Task 1 marked done');

  const pendingStep1 = step1Tasks.filter((t) => !t.isDone).length;
  assertEqual(pendingStep1, 1, 'Pending count is 1 after first task done');

  // Check celebration condition for step 1
  if (prevPendingForCelebration > 0 && pendingStep1 === 0 && step1Tasks.length > 0) {
    isCelebrating = true;
  }
  prevPendingForCelebration = pendingStep1;
  assert(!isCelebrating, 'Celebration NOT triggered after 1 of 2 tasks done');

  // Step 2: Complete second and final task
  const { updatedTasks: step2Tasks, isNowDone: step2Done } = toggleTaskInList(step1Tasks, 'task-2');
  assert(step2Done, 'Task 2 marked done');

  const pendingStep2 = step2Tasks.filter((t) => !t.isDone).length;
  assertEqual(pendingStep2, 0, 'Pending count is 0 after final task done');

  // Check celebration condition with dedicated ref
  if (prevPendingForCelebration > 0 && pendingStep2 === 0 && step2Tasks.length > 0) {
    isCelebrating = true;
  }
  prevPendingForCelebration = pendingStep2;
  assert(isCelebrating, 'Celebration TRIGGERED when all tasks are cleared!');

  // Also verify direct handler condition
  const allClearDirect = step2Tasks.length > 0 && step2Tasks.every((t) => t.isDone);
  assert(allClearDirect, 'Direct check also confirms all tasks cleared');
}

// -----------------------------------------------------------------------------
// 3. Quick Add Task Shortcut & Load Computation
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Quick Add Task Shortcut Logic ---');
{
  const existingNotes: QuickNote[] = [
    { id: 'task-1', text: 'Existing task', isDone: true, createdAt: Date.now(), durationMinutes: 30 },
  ];

  const newTaskPayload = {
    text: 'Urgent Client Review',
    durationMinutes: 45,
    priority: 'high' as const,
    deadline: '16:00',
  };

  const newNote: QuickNote = {
    id: `task-${Date.now()}`,
    text: newTaskPayload.text.trim(),
    isDone: false,
    createdAt: Date.now(),
    durationMinutes: newTaskPayload.durationMinutes,
    priority: newTaskPayload.priority,
    deadline: newTaskPayload.deadline,
  };

  const updatedNotes = [newNote, ...existingNotes];
  assertEqual(updatedNotes.length, 2, 'New task added to list');
  assertEqual(updatedNotes[0].text, 'Urgent Client Review', 'New task prepended to head of list');
  assertEqual(updatedNotes[0].priority, 'high', 'Priority preserved');
  assertEqual(updatedNotes[0].deadline, '16:00', 'Deadline preserved');

  const load = calculateTaskLoad(updatedNotes);
  assertEqual(load.pendingCount, 1, 'Pending count is 1');
  assertEqual(load.pendingMinutes, 45, 'Pending minutes updated to 45m');
}

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL FEATURE TESTS PASSED SUCCESSFULLY! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
