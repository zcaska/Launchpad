import { CalendarEventItem, CalendarScheduleSummary, QuickNote } from '../types';

/**
 * Merges overlapping or contiguous time intervals: O(N log N).
 * Eliminates double-counting of simultaneous or overlapping meetings.
 */
export function mergeIntervals(
  intervals: Array<{ startMs: number; endMs: number }>
): Array<{ startMs: number; endMs: number }> {
  if (intervals.length <= 1) return intervals;

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const merged: Array<{ startMs: number; endMs: number }> = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.startMs <= prev.endMs) {
      // Overlapping or contiguous interval
      prev.endMs = Math.max(prev.endMs, curr.endMs);
    } else {
      merged.push({ startMs: curr.startMs, endMs: curr.endMs });
    }
  }

  return merged;
}

/**
 * Normalizes raw Google Calendar v3 API item into CalendarEventItem.
 * Returns null for cancelled events.
 */
export function normalizeGoogleCalendarEvent(rawItem: any): CalendarEventItem | null {
  if (!rawItem || rawItem.status === 'cancelled') return null;

  const isAllDay = Boolean(rawItem.start?.date && !rawItem.start?.dateTime);
  const startStr = rawItem.start?.dateTime || rawItem.start?.date || '';
  const endStr = rawItem.end?.dateTime || rawItem.end?.date || '';

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  const startMs = !isNaN(startDate.getTime()) ? startDate.getTime() : 0;
  const endMs = !isNaN(endDate.getTime()) ? endDate.getTime() : startMs;
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));

  return {
    id: rawItem.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    summary: (rawItem.summary || '(Untitled Event)').trim(),
    description: rawItem.description || undefined,
    startTime: startStr,
    endTime: endStr,
    startMs,
    endMs,
    durationMinutes,
    isAllDay,
    transparency: rawItem.transparency === 'transparent' ? 'transparent' : 'opaque',
    status: rawItem.status === 'tentative' ? 'tentative' : 'confirmed',
    htmlLink: rawItem.htmlLink || undefined,
    location: rawItem.location || undefined,
    colorId: rawItem.colorId || undefined,
  };
}

/**
 * Calculates schedule summary, clipping intervals to working day boundaries
 * and merging overlapping meetings to avoid double-counting.
 */
export function calculateCalendarScheduleSummary(
  events: CalendarEventItem[] = [],
  now: Date = new Date(),
  endHour: number = 22
): CalendarScheduleSummary {
  const currentMs = now.getTime();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  // Filter valid timed events (exclude all-day events from minute deductions)
  const validTimedEvents = events
    .filter((e) => !e.isAllDay && e.status !== 'cancelled')
    .sort((a, b) => a.startMs - b.startMs);

  // 1. Collect clipped intervals for total busy time today (only opaque/busy events)
  const totalBusyIntervals: Array<{ startMs: number; endMs: number }> = [];
  // 2. Collect clipped intervals for remaining busy time (from now to dayEnd)
  const remainingBusyIntervals: Array<{ startMs: number; endMs: number }> = [];

  let nextEvent: CalendarEventItem | undefined;
  let currentEvent: CalendarEventItem | undefined;

  for (const event of validTimedEvents) {
    // Detect ongoing event
    if (currentMs >= event.startMs && currentMs < event.endMs) {
      currentEvent = event;
    }

    // Detect next upcoming event
    if (event.startMs > currentMs && !nextEvent) {
      nextEvent = event;
    }

    // Only opaque events deduct focus capacity
    if (event.transparency !== 'transparent') {
      // Total busy interval clipped to day boundaries [dayStartMs, dayEndMs]
      const totalClippedStart = Math.max(dayStartMs, event.startMs);
      const totalClippedEnd = Math.min(dayEndMs, event.endMs);
      if (totalClippedEnd > totalClippedStart) {
        totalBusyIntervals.push({ startMs: totalClippedStart, endMs: totalClippedEnd });
      }

      // Remaining busy interval clipped to [currentMs, dayEndMs]
      const remClippedStart = Math.max(currentMs, event.startMs);
      const remClippedEnd = Math.min(dayEndMs, event.endMs);
      if (remClippedEnd > remClippedStart) {
        remainingBusyIntervals.push({ startMs: remClippedStart, endMs: remClippedEnd });
      }
    }
  }

  // Merge overlapping intervals
  const mergedTotal = mergeIntervals(totalBusyIntervals);
  const mergedRemaining = mergeIntervals(remainingBusyIntervals);

  const totalBusyMinutesToday = Math.round(
    mergedTotal.reduce((acc, curr) => acc + (curr.endMs - curr.startMs), 0) / 60000
  );
  const remainingBusyMinutesToday = Math.round(
    mergedRemaining.reduce((acc, curr) => acc + (curr.endMs - curr.startMs), 0) / 60000
  );

  const minutesUntilNextEvent = nextEvent
    ? Math.max(0, Math.round((nextEvent.startMs - currentMs) / 60000))
    : undefined;

  return {
    events,
    totalBusyMinutesToday,
    remainingBusyMinutesToday,
    nextEvent,
    minutesUntilNextEvent,
    currentEvent,
  };
}

/**
 * Calculates net available focus time after deducting merged calendar meetings.
 */
export function calculateTrueFocusSurplus(
  rawDayRemainingMinutes: number,
  remainingBusyMinutes: number,
  pendingTaskMinutes: number
): { netAvailableMinutes: number; surplusMinutes: number; status: 'surplus' | 'tight' | 'overloaded' } {
  const netAvailableMinutes = Math.max(0, rawDayRemainingMinutes - remainingBusyMinutes);
  const surplusMinutes = netAvailableMinutes - pendingTaskMinutes;

  let status: 'surplus' | 'tight' | 'overloaded' = 'surplus';
  if (surplusMinutes < 0) {
    status = 'overloaded';
  } else if (surplusMinutes < 45) {
    status = 'tight';
  }

  return {
    netAvailableMinutes,
    surplusMinutes,
    status,
  };
}

/**
 * Helper to identify whether a note is a calendar task (current or legacy).
 */
export function isCalendarTask(n: QuickNote): boolean {
  return (
    n.source === 'google_calendar' ||
    Boolean(n.eventId) ||
    (typeof n.id === 'string' && n.id.startsWith('cal-task-'))
  );
}

/**
 * Synchronizes Google Calendar events into LaunchPAD QuickNotes.
 * - Converts each active calendar event to a task with matching title, description, expected time, deadline, and Google Calendar link.
 * - Preserves existing completion status (`isDone`) of already synced tasks.
 * - Removes synced tasks that are no longer present in today's active calendar events (e.g. deleted/moved).
 * - Leaves purely user-created local tasks completely intact (filters out legacy or untagged calendar items).
 */
export function syncCalendarEventsToQuickNotes(
  currentNotes: QuickNote[] = [],
  events: CalendarEventItem[] = []
): QuickNote[] {
  // Keep all purely manual/local notes (filter out any calendar notes)
  const localNotes = currentNotes.filter((n) => !isCalendarTask(n));

  // Existing synced notes mapped by eventId and stripped id
  const existingSyncedMap = new Map<string, QuickNote>();
  for (const n of currentNotes) {
    if (isCalendarTask(n)) {
      if (n.eventId) {
        existingSyncedMap.set(n.eventId, n);
      }
      if (typeof n.id === 'string') {
        const strippedId = n.id.replace(/^cal-task-/, '');
        if (strippedId) {
          existingSyncedMap.set(strippedId, n);
        }
      }
    }
  }

  // Active non-cancelled, timed calendar events for today (exclude all-day events)
  const activeEvents = events.filter((e) => !e.isAllDay && e.status !== 'cancelled');

  const syncedNotes: QuickNote[] = activeEvents.map((evt) => {
    const existing = existingSyncedMap.get(evt.id);

    // Format deadline from start time (e.g. "YYYY-MM-DD HH:MM")
    let deadlineStr: string | undefined = undefined;
    if (evt.startTime) {
      try {
        const d = new Date(evt.startTime);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          deadlineStr = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
        }
      } catch {
        // Fallback
      }
    }

    const duration = evt.durationMinutes > 0 ? evt.durationMinutes : 30;

    // Attached Google Calendar link
    const attachedUrls = evt.htmlLink
      ? [
          {
            id: `cal-link-${evt.id}`,
            title: 'Google Calendar Event',
            url: evt.htmlLink,
          },
        ]
      : [];

    const defaultIsDone = Boolean(evt.endMs && evt.endMs <= Date.now());

    return {
      id: existing ? existing.id : `cal-task-${evt.id}`,
      eventId: evt.id,
      source: 'google_calendar' as const,
      text: evt.summary || 'Scheduled Calendar Event',
      description: evt.description || undefined,
      isDone: existing ? existing.isDone : defaultIsDone,
      createdAt: existing ? existing.createdAt : evt.startMs || Date.now(),
      durationMinutes: duration,
      deadline: deadlineStr,
      priority: existing?.priority || 'medium',
      attachedUrls: attachedUrls.length > 0 ? attachedUrls : undefined,
      subtasks: existing?.subtasks || [],
    };
  });

  // Preserve ordering: synced calendar tasks followed by local notes
  return [...syncedNotes, ...localNotes];
}
