import {
  mergeIntervals,
  normalizeGoogleCalendarEvent,
  calculateCalendarScheduleSummary,
  calculateTrueFocusSurplus,
  syncCalendarEventsToQuickNotes,
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

// 5. Test syncCalendarEventsToQuickNotes
{
  const localTask = {
    id: 'local-1',
    text: 'Local Task 1',
    isDone: false,
    createdAt: 1000,
    durationMinutes: 45,
    source: 'local' as const,
  };

  const calEvent: CalendarEventItem = {
    id: 'cal-conf-1',
    summary: 'Conference Meeting',
    description: 'AI summit Meeting at Pune',
    startTime: '2026-10-11T15:00:00Z',
    endTime: '2026-10-11T17:00:00Z',
    startMs: new Date('2026-10-11T15:00:00Z').getTime(),
    endMs: new Date('2026-10-11T17:00:00Z').getTime(),
    durationMinutes: 120, // 2 hours
    isAllDay: false,
    transparency: 'opaque',
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/event?eid=123',
  };

  const syncedTasks = syncCalendarEventsToQuickNotes([localTask], [calEvent]);

  assertEqual(syncedTasks.length, 2, 'syncCalendarEventsToQuickNotes: returns 2 tasks (1 synced + 1 local)');
  const confTask = syncedTasks.find((t) => t.eventId === 'cal-conf-1');
  assertEqual(confTask?.text, 'Conference Meeting', 'syncCalendarEventsToQuickNotes: syncs event summary as title');
  assertEqual(confTask?.description, 'AI summit Meeting at Pune', 'syncCalendarEventsToQuickNotes: syncs event description');
  assertEqual(confTask?.durationMinutes, 120, 'syncCalendarEventsToQuickNotes: syncs expected duration of 2 hrs (120m)');
  assertEqual(confTask?.source, 'google_calendar', 'syncCalendarEventsToQuickNotes: marks source as google_calendar');
  assertEqual(confTask?.attachedUrls?.[0]?.url, 'https://calendar.google.com/event?eid=123', 'syncCalendarEventsToQuickNotes: includes Google Calendar event link');

  // Test updating event updates task without losing existing local state
  confTask!.isDone = true;
  const updatedEvent: CalendarEventItem = {
    ...calEvent,
    summary: 'Updated Conference Meeting',
    description: 'Updated description for AI summit',
  };
  const reSyncedTasks = syncCalendarEventsToQuickNotes(syncedTasks, [updatedEvent]);
  const updatedTask = reSyncedTasks.find((t) => t.eventId === 'cal-conf-1');
  assertEqual(updatedTask?.text, 'Updated Conference Meeting', 'syncCalendarEventsToQuickNotes: updates title on re-sync');
  assertEqual(updatedTask?.description, 'Updated description for AI summit', 'syncCalendarEventsToQuickNotes: updates description on re-sync');
  assertEqual(updatedTask?.isDone, true, 'syncCalendarEventsToQuickNotes: preserves isDone status across syncs');

  // Test that all-day events (isAllDay: true) are filtered out and not converted to tasks
  const allDayHoliday: CalendarEventItem = {
    id: 'cal-holiday-1',
    summary: 'National Holiday',
    startTime: '2026-10-11',
    endTime: '2026-10-12',
    startMs: new Date('2026-10-11T00:00:00Z').getTime(),
    endMs: new Date('2026-10-12T00:00:00Z').getTime(),
    durationMinutes: 1440,
    isAllDay: true,
    transparency: 'transparent',
    status: 'confirmed',
  };
  const tasksWithAllDay = syncCalendarEventsToQuickNotes([localTask], [calEvent, allDayHoliday]);
  assertEqual(tasksWithAllDay.length, 2, 'syncCalendarEventsToQuickNotes: ignores all-day events (isAllDay: true)');
  const holidayTask = tasksWithAllDay.find((t) => t.eventId === 'cal-holiday-1');
  assertEqual(holidayTask, undefined, 'syncCalendarEventsToQuickNotes: all-day event is NOT converted to task');

  // Test legacy calendar task deduplication (where existing note had id cal-task-123 but no source field)
  const legacyTask = {
    id: 'cal-task-event-legacy-99',
    text: 'Legacy Meeting Task',
    isDone: true,
    priority: 'urgent' as const,
    createdAt: 500,
    durationMinutes: 30,
    // Note: no source: 'google_calendar' and no eventId
  };
  const legacySyncEvent: CalendarEventItem = {
    id: 'event-legacy-99',
    summary: 'Legacy Meeting Event',
    startTime: '2026-10-11T18:00:00Z',
    endTime: '2026-10-11T18:30:00Z',
    startMs: new Date('2026-10-11T18:00:00Z').getTime(),
    endMs: new Date('2026-10-11T18:30:00Z').getTime(),
    durationMinutes: 30,
    isAllDay: false,
    transparency: 'opaque',
    status: 'confirmed',
  };

  const tasksWithLegacy = syncCalendarEventsToQuickNotes([legacyTask, localTask], [legacySyncEvent]);
  assertEqual(tasksWithLegacy.length, 2, 'syncCalendarEventsToQuickNotes: legacy calendar task is deduplicated and not copied into localNotes');
  const matchedLegacy = tasksWithLegacy.find((t) => t.eventId === 'event-legacy-99');
  assert(matchedLegacy !== undefined, 'syncCalendarEventsToQuickNotes: correctly mapped legacy calendar event');
  assertEqual(matchedLegacy?.isDone, true, 'syncCalendarEventsToQuickNotes: preserves isDone from legacy task');
  assertEqual(matchedLegacy?.priority, 'urgent', 'syncCalendarEventsToQuickNotes: preserves priority from legacy task');

  // Test past calendar event auto-completion (endMs <= Date.now())
  const pastEvent: CalendarEventItem = {
    id: 'past-event-1',
    summary: 'Morning Standup (Already Finished)',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    startMs: Date.now() - 7200000,
    endMs: Date.now() - 3600000, // Ended 1 hour ago
    durationMinutes: 60,
    isAllDay: false,
    transparency: 'opaque',
    status: 'confirmed',
  };
  const tasksWithPast = syncCalendarEventsToQuickNotes([], [pastEvent]);
  assertEqual(tasksWithPast.length, 1, 'syncCalendarEventsToQuickNotes: synced 1 past event');
  assertEqual(tasksWithPast[0].isDone, true, 'syncCalendarEventsToQuickNotes: past event defaults isDone to true');

  // Test event deletion: when an event is deleted in Google Calendar, it is pruned from quickNotes
  const retainedTasks = syncCalendarEventsToQuickNotes(tasksWithPast, []);
  assertEqual(retainedTasks.length, 0, 'syncCalendarEventsToQuickNotes: deleted Google Calendar event is pruned from quickNotes');

  // Test event rescheduling: if a past completed event is rescheduled to the future, isDone resets to false
  const completedPastTask = {
    ...tasksWithPast[0],
    isDone: true,
  };
  const futureRescheduledEvent: CalendarEventItem = {
    ...pastEvent,
    summary: 'Morning Standup (Rescheduled to Tomorrow)',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    startMs: Date.now() + 86400000,
    endMs: Date.now() + 86400000 + 3600000,
  };
  const rescheduledTasks = syncCalendarEventsToQuickNotes([completedPastTask], [futureRescheduledEvent]);
  assertEqual(rescheduledTasks.length, 1, 'syncCalendarEventsToQuickNotes: returns rescheduled task');
  assertEqual(rescheduledTasks[0].isDone, false, 'syncCalendarEventsToQuickNotes: future rescheduled event resets isDone to false');
  assertEqual(rescheduledTasks[0].text, 'Morning Standup (Rescheduled to Tomorrow)', 'syncCalendarEventsToQuickNotes: updates title on rescheduled event');

  // Test class link extraction from rich description into attachedUrls and clean description
  const classEventRaw = {
    id: 'cal-class-sem3',
    summary: 'Microeconomics Lecture',
    description: '<a href="https://www.poonamkumari.com/learn/home/sem3">Sem-3---Intermediate-Micro-1 (Poonam Kumari)</a>',
    start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
    end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
    htmlLink: 'https://calendar.google.com/event?eid=123',
    status: 'confirmed',
  };
  const normalizedClassEvent = normalizeGoogleCalendarEvent(classEventRaw);
  assert(normalizedClassEvent !== null, 'normalizeGoogleCalendarEvent: normalizes class event');
  assertEqual(
    normalizedClassEvent?.description,
    'Sem-3---Intermediate-Micro-1 (Poonam Kumari)',
    'normalizeGoogleCalendarEvent: cleans description of raw HTML anchor tags'
  );
  assertEqual(
    normalizedClassEvent?.extractedUrls?.length,
    1,
    'normalizeGoogleCalendarEvent: extracts class url'
  );
  assertEqual(
    normalizedClassEvent?.extractedUrls?.[0]?.url,
    'https://www.poonamkumari.com/learn/home/sem3',
    'normalizeGoogleCalendarEvent: preserves class url target'
  );
  assertEqual(
    normalizedClassEvent?.extractedUrls?.[0]?.title,
    'Sem-3---Intermediate-Micro-1 (Poonam Kumari)',
    'normalizeGoogleCalendarEvent: preserves meaningful anchor title'
  );

  // Test syncing the class event into quick notes
  const syncedClassTasks = syncCalendarEventsToQuickNotes([], [normalizedClassEvent!]);
  assertEqual(syncedClassTasks.length, 1, 'syncCalendarEventsToQuickNotes: syncs 1 class task');
  const classTask = syncedClassTasks[0];
  assertEqual(
    classTask.description,
    'Sem-3---Intermediate-Micro-1 (Poonam Kumari)',
    'syncCalendarEventsToQuickNotes: task description contains clean text without raw <a> or href markup'
  );
  assertEqual(classTask.attachedUrls?.length, 2, 'syncCalendarEventsToQuickNotes: has class link + calendar event link');
  assertEqual(
    classTask.attachedUrls?.[0]?.title,
    'Sem-3---Intermediate-Micro-1 (Poonam Kumari)',
    'syncCalendarEventsToQuickNotes: class link title is meaningful'
  );
  assertEqual(
    classTask.attachedUrls?.[0]?.url,
    'https://www.poonamkumari.com/learn/home/sem3',
    'syncCalendarEventsToQuickNotes: class link URL matches destination'
  );
  assertEqual(
    classTask.attachedUrls?.[1]?.title,
    'Google Calendar Event',
    'syncCalendarEventsToQuickNotes: calendar event link is preserved'
  );

  // Test preservation of user completed status on future tasks when NOT rescheduled
  const userCompletedFutureTask = {
    ...classTask,
    isDone: true,
  };
  const reSyncedFutureTasks = syncCalendarEventsToQuickNotes([userCompletedFutureTask], [normalizedClassEvent!]);
  assertEqual(
    reSyncedFutureTasks[0].isDone,
    true,
    'syncCalendarEventsToQuickNotes: user completed status is preserved on future task without re-unchecking'
  );

  // Test 4: Declined attendee event filtering
  const declinedEventRaw = {
    id: 'declined-meeting-1',
    summary: 'Optional Team Hangout',
    start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
    end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
    attendees: [
      { email: 'colleague@example.com', responseStatus: 'accepted' },
      { email: 'user@example.com', self: true, responseStatus: 'declined' },
    ],
    status: 'confirmed',
  };
  const normDeclined = normalizeGoogleCalendarEvent(declinedEventRaw);
  assertEqual(normDeclined, null, 'normalizeGoogleCalendarEvent: returns null for user-declined events');

  // Test 5: Multi-day event clamping
  const multiDayEvent: CalendarEventItem = {
    id: 'multi-day-hackathon',
    summary: '3-Day Global Hackathon',
    startTime: new Date(Date.now() - 86400000).toISOString(), // started yesterday
    endTime: new Date(Date.now() + 2 * 86400000).toISOString(), // ends day after tomorrow
    startMs: Date.now() - 86400000,
    endMs: Date.now() + 2 * 86400000,
    durationMinutes: 4320, // 72 hours
    isAllDay: false,
    status: 'confirmed',
  };
  const multiDayTasks = syncCalendarEventsToQuickNotes([], [multiDayEvent]);
  assertEqual(multiDayTasks.length, 1, 'syncCalendarEventsToQuickNotes: syncs multi-day event');
  const firstMultiTask = multiDayTasks[0];
  assert(
    Boolean(firstMultiTask && firstMultiTask.durationMinutes && firstMultiTask.durationMinutes <= 1440),
    `syncCalendarEventsToQuickNotes: multi-day duration is clamped to today (got ${firstMultiTask?.durationMinutes}m, expected <= 1440m)`
  );
}

if (failures === 0) {
  console.log('\n🎉 ALL CALENDAR SCHEDULE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`\n❌ ${failures} TESTS FAILED!`);
  process.exit(1);
}
