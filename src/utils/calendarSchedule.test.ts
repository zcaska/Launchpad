import {
  mergeIntervals,
  normalizeGoogleCalendarEvent,
  calculateCalendarScheduleSummary,
  calculateTrueFocusSurplus,
} from './calendarSchedule';
import { CalendarEventItem } from '../types';

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

console.log('--- Testing calendarSchedule.ts ---');

// 1. Test mergeIntervals
{
  const empty = mergeIntervals([]);
  assertEqual(empty.length, 0, 'mergeIntervals: empty array returns empty');

  const single = mergeIntervals([{ startMs: 100, endMs: 200 }]);
  assertEqual(single.length, 1, 'mergeIntervals: single interval returns same');

  const disjoint = mergeIntervals([
    { startMs: 100, endMs: 200 },
    { startMs: 300, endMs: 400 },
  ]);
  assertEqual(disjoint.length, 2, 'mergeIntervals: disjoint intervals remain disjoint');

  // Overlapping: 14:00-15:00 (0-60m) and 14:30-15:30 (30-90m)
  const overlapping = mergeIntervals([
    { startMs: 1000, endMs: 4000 },
    { startMs: 2500, endMs: 5500 },
  ]);
  assertEqual(overlapping.length, 1, 'mergeIntervals: overlapping intervals merged into 1');
  assertEqual(overlapping[0].startMs, 1000, 'mergeIntervals: merged start is 1000');
  assertEqual(overlapping[0].endMs, 5500, 'mergeIntervals: merged end is 5500');

  // Fully contained: 1000-5000 and 2000-3000
  const contained = mergeIntervals([
    { startMs: 1000, endMs: 5000 },
    { startMs: 2000, endMs: 3000 },
  ]);
  assertEqual(contained.length, 1, 'mergeIntervals: contained interval merged');
  assertEqual(contained[0].endMs, 5000, 'mergeIntervals: contained interval preserves max endMs');
}

// 2. Test normalizeGoogleCalendarEvent
{
  const cancelled = normalizeGoogleCalendarEvent({ status: 'cancelled', summary: 'Cancelled Meeting' });
  assertEqual(cancelled, null, 'normalizeGoogleCalendarEvent: cancelled event returns null');

  const rawTimed = {
    id: 'test-123',
    summary: 'Team Sync',
    start: { dateTime: '2026-10-11T10:00:00Z' },
    end: { dateTime: '2026-10-11T11:00:00Z' },
    transparency: 'opaque',
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/event?id=123',
  };
  const normalized = normalizeGoogleCalendarEvent(rawTimed);
  assert(normalized !== null, 'normalizeGoogleCalendarEvent: returns valid event object');
  assertEqual(normalized?.summary, 'Team Sync', 'normalizeGoogleCalendarEvent: extracts summary');
  assertEqual(normalized?.durationMinutes, 60, 'normalizeGoogleCalendarEvent: calculates 60m duration');
  assertEqual(normalized?.isAllDay, false, 'normalizeGoogleCalendarEvent: detects timed event');
  assertEqual(normalized?.transparency, 'opaque', 'normalizeGoogleCalendarEvent: preserves opaque transparency');

  const rawAllDay = {
    id: 'test-all-day',
    summary: 'Company Holiday',
    start: { date: '2026-10-11' },
    end: { date: '2026-10-12' },
  };
  const normAllDay = normalizeGoogleCalendarEvent(rawAllDay);
  assertEqual(normAllDay?.isAllDay, true, 'normalizeGoogleCalendarEvent: detects all-day event');

  const rawTransparent = {
    id: 'test-transparent',
    summary: 'Optional Webinar',
    start: { dateTime: '2026-10-11T14:00:00Z' },
    end: { dateTime: '2026-10-11T15:00:00Z' },
    transparency: 'transparent',
  };
  const normTransparent = normalizeGoogleCalendarEvent(rawTransparent);
  assertEqual(normTransparent?.transparency, 'transparent', 'normalizeGoogleCalendarEvent: detects transparent event');
}

// 3. Test calculateCalendarScheduleSummary
{
  const now = new Date(2026, 9, 11, 12, 0, 0, 0); // Oct 11, 2026 at 12:00 PM
  const emptySummary = calculateCalendarScheduleSummary([], now, 22);
  assertEqual(emptySummary.totalBusyMinutesToday, 0, 'calculateCalendarScheduleSummary: empty events -> 0 busy minutes');
  assertEqual(emptySummary.remainingBusyMinutesToday, 0, 'calculateCalendarScheduleSummary: empty events -> 0 remaining busy');

  // Overlapping events: 13:00-14:00 (60m) and 13:30-14:30 (60m)
  // Total span = 13:00 to 14:30 = 90 minutes (NOT 120 minutes)
  const event1: CalendarEventItem = {
    id: 'e1',
    summary: 'Meeting 1',
    startTime: new Date(2026, 9, 11, 13, 0).toISOString(),
    endTime: new Date(2026, 9, 11, 14, 0).toISOString(),
    startMs: new Date(2026, 9, 11, 13, 0).getTime(),
    endMs: new Date(2026, 9, 11, 14, 0).getTime(),
    durationMinutes: 60,
    isAllDay: false,
    transparency: 'opaque',
    status: 'confirmed',
  };
  const event2: CalendarEventItem = {
    id: 'e2',
    summary: 'Meeting 2',
    startTime: new Date(2026, 9, 11, 13, 30).toISOString(),
    endTime: new Date(2026, 9, 11, 14, 30).toISOString(),
    startMs: new Date(2026, 9, 11, 13, 30).getTime(),
    endMs: new Date(2026, 9, 11, 14, 30).getTime(),
    durationMinutes: 60,
    isAllDay: false,
    transparency: 'opaque',
    status: 'confirmed',
  };

  const overlappingSummary = calculateCalendarScheduleSummary([event1, event2], now, 22);
  assertEqual(overlappingSummary.totalBusyMinutesToday, 90, 'calculateCalendarScheduleSummary: merges overlapping meetings to 90m');
  assertEqual(overlappingSummary.remainingBusyMinutesToday, 90, 'calculateCalendarScheduleSummary: remaining busy time is 90m');
  assertEqual(overlappingSummary.nextEvent?.id, 'e1', 'calculateCalendarScheduleSummary: identifies next upcoming event');
  assertEqual(overlappingSummary.minutesUntilNextEvent, 60, 'calculateCalendarScheduleSummary: 60 mins until next event at 13:00');

  // Transparent event should not add busy time
  const transparentEvent: CalendarEventItem = {
    id: 'e3',
    summary: 'Free Webinar',
    startTime: new Date(2026, 9, 11, 15, 0).toISOString(),
    endTime: new Date(2026, 9, 11, 16, 0).toISOString(),
    startMs: new Date(2026, 9, 11, 15, 0).getTime(),
    endMs: new Date(2026, 9, 11, 16, 0).getTime(),
    durationMinutes: 60,
    isAllDay: false,
    transparency: 'transparent',
    status: 'confirmed',
  };
  const withTransparentSummary = calculateCalendarScheduleSummary([event1, event2, transparentEvent], now, 22);
  assertEqual(withTransparentSummary.totalBusyMinutesToday, 90, 'calculateCalendarScheduleSummary: transparent events excluded from busy minutes');
}

// 4. Test calculateTrueFocusSurplus
{
  // 300m day remaining, 90m meetings, 120m tasks -> net available = 210m, surplus = 90m -> surplus
  const surplusRes = calculateTrueFocusSurplus(300, 90, 120);
  assertEqual(surplusRes.netAvailableMinutes, 210, 'calculateTrueFocusSurplus: net available minutes is 210');
  assertEqual(surplusRes.surplusMinutes, 90, 'calculateTrueFocusSurplus: surplus minutes is 90');
  assertEqual(surplusRes.status, 'surplus', 'calculateTrueFocusSurplus: status is surplus');

  // 150m day remaining, 60m meetings, 70m tasks -> net available = 90m, surplus = 20m -> tight (< 45m)
  const tightRes = calculateTrueFocusSurplus(150, 60, 70);
  assertEqual(tightRes.status, 'tight', 'calculateTrueFocusSurplus: status is tight when surplus < 45m');

  // 120m day remaining, 60m meetings, 90m tasks -> net available = 60m, surplus = -30m -> overloaded
  const overRes = calculateTrueFocusSurplus(120, 60, 90);
  assertEqual(overRes.status, 'overloaded', 'calculateTrueFocusSurplus: status is overloaded when surplus < 0');
}

if (failures === 0) {
  console.log('\n🎉 ALL CALENDAR SCHEDULE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`\n❌ ${failures} TESTS FAILED!`);
  process.exit(1);
}
