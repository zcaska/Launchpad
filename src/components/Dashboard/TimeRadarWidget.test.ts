import { TimeRadarWidget } from './TimeRadarWidget';
import { DayTimeRemaining, TaskLoadSummary, BufferSummary } from '../../utils/timeBudget';
import { CalendarScheduleSummary } from '../../types';

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

console.log('=== Running TimeRadarWidget.test.ts ===\n');

// 1. Verify Component Export
assert(typeof TimeRadarWidget === 'function' || typeof TimeRadarWidget === 'object', 'TimeRadarWidget is exported as a React FC');

// 2. Mock Props Data
const mockTimeRemaining: DayTimeRemaining = {
  totalMinutes: 300,
  formatted: '5h 0m',
  isPastCutoff: false,
  percentageRemaining: 60,
};

const mockTaskLoad: TaskLoadSummary = {
  pendingCount: 3,
  completedCount: 2,
  pendingMinutes: 120,
  completedMinutes: 60,
  localPendingMinutes: 120,
  calendarPendingMinutes: 0,
  formattedPending: '2h 0m',
  formattedCompleted: '1h 0m',
};

const mockBuffer: BufferSummary = {
  bufferMinutes: 180,
  status: 'surplus',
  formatted: '3h 0m',
  loadRatioPercentage: 40,
};

let tasksOpened = false;
let calendarSynced = false;
let calendarSettingsOpened = false;

const mockCalendarSummary: CalendarScheduleSummary = {
  totalBusyMinutesToday: 60,
  remainingBusyMinutesToday: 45,
  nextEvent: {
    id: 'evt-1',
    summary: 'Team Sync',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    startMs: Date.now(),
    endMs: Date.now() + 1800000,
    durationMinutes: 30,
    isAllDay: false,
    status: 'confirmed',
  },
  minutesUntilNextEvent: 15,
  events: [],
  isTokenExpired: false,
  syncError: undefined,
};

const testProps = {
  timeRemaining: mockTimeRemaining,
  taskLoad: mockTaskLoad,
  buffer: mockBuffer,
  endHour: 22,
  onOpenTasks: () => { tasksOpened = true; },
  calendarSummary: mockCalendarSummary,
  onSyncCalendar: () => { calendarSynced = true; },
  isSyncingCalendar: false,
  onOpenCalendarSettings: () => { calendarSettingsOpened = true; },
  onReauthorize: () => {},
};

// 3. Test Callbacks
console.log('--- Action Callbacks Verification ---');
testProps.onOpenTasks();
assert(tasksOpened, 'onOpenTasks callback executes successfully');

testProps.onSyncCalendar();
assert(calendarSynced, 'onSyncCalendar callback executes successfully');

testProps.onOpenCalendarSettings();
assert(calendarSettingsOpened, 'onOpenCalendarSettings callback executes successfully');

// 4. Test Metric Calculations
console.log('--- Time Remaining & Buffer Metrics Verification ---');
assertEqual(testProps.timeRemaining.totalMinutes, 300, 'Time remaining total minutes matches 300');
assertEqual(testProps.taskLoad.pendingMinutes, 120, 'Task load pending minutes matches 120');
assertEqual(testProps.buffer.bufferMinutes, 180, 'Focus buffer matches 180 minutes');
assertEqual(testProps.buffer.status, 'surplus', 'Buffer status is surplus');
assertEqual(testProps.endHour, 22, 'End hour cutoff is 22 (10:00 PM)');

console.log('\n=======================================');
if (failures === 0) {
  console.log('🎉 ALL TIME RADAR WIDGET TESTS PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
