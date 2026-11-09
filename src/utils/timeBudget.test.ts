import { formatMinutesToHours } from './timeBudget';
import { formatEventDuration } from './textFormatting';
import { formatTaskCountdown } from './taskUrgency';
import { QuickNote } from '../types';

let failures = 0;

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected "${expected}", got "${actual}")`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('=== Running timeBudget.test.ts ===\n');

// 1. Test formatMinutesToHours
console.log('--- 1. formatMinutesToHours verification ---');
assertEqual(formatMinutesToHours(0), '0m', '0 minutes returns 0m');
assertEqual(formatMinutesToHours(-10), '0m', 'Negative minutes returns 0m');
assertEqual(formatMinutesToHours(15), '15m', '15 minutes returns 15m');
assertEqual(formatMinutesToHours(45), '45m', '45 minutes returns 45m');
assertEqual(formatMinutesToHours(59), '59m', '59 minutes returns 59m');
assertEqual(formatMinutesToHours(60), '1h', '60 minutes returns 1h');
assertEqual(formatMinutesToHours(75), '1h 15m', '75 minutes returns 1h 15m');
assertEqual(formatMinutesToHours(90), '1h 30m', '90 minutes returns 1h 30m');
assertEqual(formatMinutesToHours(120), '2h', '120 minutes returns 2h');
assertEqual(formatMinutesToHours(1439), '23h 59m', '1439 minutes returns 23h 59m');
assertEqual(formatMinutesToHours(1440), '1d', '1440 minutes (24h) returns 1d');
assertEqual(formatMinutesToHours(1500), '1d 1h', '1500 minutes (25h) returns 1d 1h');
assertEqual(formatMinutesToHours(1560), '1d 2h', '1560 minutes (26h) returns 1d 2h');
assertEqual(formatMinutesToHours(2880), '2d', '2880 minutes (48h) returns 2d');
assertEqual(formatMinutesToHours(3000), '2d 2h', '3000 minutes (50h) returns 2d 2h');

// 2. Test formatEventDuration
console.log('\n--- 2. formatEventDuration verification ---');
assertEqual(formatEventDuration(0), '0m', '0 event duration returns 0m');
assertEqual(formatEventDuration(-5), '0m', 'Negative event duration returns 0m');
assertEqual(formatEventDuration(30), '30m', '30 minutes event returns 30m');
assertEqual(formatEventDuration(60), '1h', '60 minutes event returns 1h');
assertEqual(formatEventDuration(90), '1h 30m', '90 minutes event returns 1h 30m');
assertEqual(formatEventDuration(1440), '1d', '24h event returns 1d');
assertEqual(formatEventDuration(1500), '1d 1h', '25h event returns 1d 1h');
assertEqual(formatEventDuration(2880), '2d', '48h event returns 2d');
assertEqual(formatEventDuration(3000), '2d 2h', '50h event returns 2d 2h');

// 3. Test formatTaskCountdown
console.log('\n--- 3. formatTaskCountdown verification ---');
const refDate = new Date('2026-10-20T12:00:00.000Z');

const taskDue30m: QuickNote = {
  id: 't-1',
  text: 'Task 30m',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-20T12:30:00.000Z',
  priority: 'medium',
};
assertEqual(formatTaskCountdown(taskDue30m, refDate), '30m left', 'Due in 30m formats as 30m left');

const taskDue5h: QuickNote = {
  id: 't-2',
  text: 'Task 5h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-20T17:00:00.000Z',
  priority: 'medium',
};
assertEqual(formatTaskCountdown(taskDue5h, refDate), '5h left', 'Due in exact 5h formats as 5h left');

const taskDue5h35m: QuickNote = {
  id: 't-3',
  text: 'Task 5h 35m',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-20T17:35:00.000Z',
  priority: 'medium',
};
assertEqual(formatTaskCountdown(taskDue5h35m, refDate), '5h 35m left', 'Due in 5h 35m formats as 5h 35m left');

const taskDue24h: QuickNote = {
  id: 't-4',
  text: 'Task 24h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-21T12:00:00.000Z',
  priority: 'medium',
};
assertEqual(formatTaskCountdown(taskDue24h, refDate), '1d left', 'Due in 24h formats as 1d left');

const taskDue26h: QuickNote = {
  id: 't-5',
  text: 'Task 26h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-21T14:00:00.000Z',
  priority: 'medium',
};
assertEqual(formatTaskCountdown(taskDue26h, refDate), '1d 2h left', 'Due in 26h formats as 1d 2h left');

const taskOverdue45m: QuickNote = {
  id: 't-6',
  text: 'Overdue 45m',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-20T11:15:00.000Z',
  priority: 'high',
};
assertEqual(formatTaskCountdown(taskOverdue45m, refDate), '45m overdue', 'Overdue 45m formats as 45m overdue');

const taskOverdue5h: QuickNote = {
  id: 't-7',
  text: 'Overdue 5h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-20T07:00:00.000Z',
  priority: 'high',
};
assertEqual(formatTaskCountdown(taskOverdue5h, refDate), 'Overdue by 5h', 'Overdue 5h formats as Overdue by 5h');

const taskOverdue26h: QuickNote = {
  id: 't-8',
  text: 'Overdue 26h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-19T10:00:00.000Z',
  priority: 'high',
};
assertEqual(formatTaskCountdown(taskOverdue26h, refDate), 'Overdue by 1d 2h', 'Overdue 26h formats as Overdue by 1d 2h');

const taskOverdue48h: QuickNote = {
  id: 't-9',
  text: 'Overdue 48h',
  isDone: false,
  createdAt: Date.now(),
  deadline: '2026-10-18T12:00:00.000Z',
  priority: 'high',
};
assertEqual(formatTaskCountdown(taskOverdue48h, refDate), 'Overdue by 2d', 'Overdue 48h formats as Overdue by 2d');

console.log('\n=======================================');
if (failures > 0) {
  console.error(`❌ ${failures} test(s) FAILED`);
  process.exit(1);
} else {
  console.log('🎉 ALL TIME FORMATTING TESTS PASSED SUCCESSFULLY! (0 failures)');
}
