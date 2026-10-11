/**
 * Calendar formatting utilities for event times and durations.
 */

/**
 * Extracts hours and minutes from a Date object or date/time string.
 */
function parseTimeComponents(dateInput: string | Date): { hours: number; minutes: number } | null {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return { hours: dateInput.getHours(), minutes: dateInput.getMinutes() };
  }

  if (typeof dateInput !== 'string') return null;

  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  // Check for simple time format: "14:30", "9:05", "2:30 PM", "11:00 am"
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;
  const timeMatch = trimmed.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[4]?.toUpperCase();

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  // Parse as general Date string (e.g. ISO 8601 string)
  const parsedDate = new Date(trimmed);
  if (isNaN(parsedDate.getTime())) return null;

  return { hours: parsedDate.getHours(), minutes: parsedDate.getMinutes() };
}

/**
 * Formats an event time into 12-hour (e.g. "9:05 AM", "2:30 PM") or 24-hour ("09:05", "14:30") format.
 *
 * @param dateInput Date object or date/time string
 * @param clockFormat '12h' (default) or '24h'
 * @returns Formatted time string, or empty string on invalid input
 */
export function formatEventTime(
  dateInput: string | Date,
  clockFormat: '12h' | '24h' = '12h'
): string {
  const parsed = parseTimeComponents(dateInput);
  if (!parsed) return '';

  const { hours, minutes } = parsed;
  const minutesFormatted = String(minutes).padStart(2, '0');

  if (clockFormat === '24h') {
    const hoursFormatted = String(hours).padStart(2, '0');
    return `${hoursFormatted}:${minutesFormatted}`;
  }

  // 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutesFormatted} ${period}`;
}

/**
 * Formats event duration in minutes to a human-readable representation (e.g. "30m", "1h", "1h 30m").
 *
 * @param durationMinutes Duration in minutes
 * @returns Formatted duration string
 */
export function formatEventDuration(durationMinutes: number): string {
  if (typeof durationMinutes !== 'number' || isNaN(durationMinutes) || durationMinutes <= 0) {
    return '0m';
  }

  const roundedMinutes = Math.round(durationMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Self-contained test suite asserting correct behavior of calendar formatting functions.
 * Returns true if all assertions succeed.
 */
export function runCalendarFormattingTests(): boolean {
  function assertEqual(actual: unknown, expected: unknown, message: string) {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected: "${expected}", Received: "${actual}"`);
    }
  }

  try {
    // Test formatEventTime with Date objects (12h format default)
    const morningDate = new Date(2026, 9, 10, 9, 5);
    const afternoonDate = new Date(2026, 9, 10, 14, 30);
    const midnightDate = new Date(2026, 9, 10, 0, 0);
    const noonDate = new Date(2026, 9, 10, 12, 0);

    assertEqual(formatEventTime(morningDate), '9:05 AM', 'formatEventTime morning Date (12h default)');
    assertEqual(formatEventTime(afternoonDate), '2:30 PM', 'formatEventTime afternoon Date (12h default)');
    assertEqual(formatEventTime(midnightDate), '12:00 AM', 'formatEventTime midnight Date (12h)');
    assertEqual(formatEventTime(noonDate), '12:00 PM', 'formatEventTime noon Date (12h)');

    // Test formatEventTime with Date objects (24h format)
    assertEqual(formatEventTime(morningDate, '24h'), '09:05', 'formatEventTime morning Date (24h)');
    assertEqual(formatEventTime(afternoonDate, '24h'), '14:30', 'formatEventTime afternoon Date (24h)');
    assertEqual(formatEventTime(midnightDate, '24h'), '00:00', 'formatEventTime midnight Date (24h)');
    assertEqual(formatEventTime(noonDate, '24h'), '12:00', 'formatEventTime noon Date (24h)');

    // Test formatEventTime with time strings
    assertEqual(formatEventTime('14:30', '12h'), '2:30 PM', 'formatEventTime 24h string to 12h');
    assertEqual(formatEventTime('14:30', '24h'), '14:30', 'formatEventTime 24h string to 24h');
    assertEqual(formatEventTime('09:05', '12h'), '9:05 AM', 'formatEventTime string with leading zero');
    assertEqual(formatEventTime('9:05', '12h'), '9:05 AM', 'formatEventTime string without leading zero');
    assertEqual(formatEventTime('2:30 PM', '24h'), '14:30', 'formatEventTime 12h string to 24h');
    assertEqual(formatEventTime('12:00 AM', '24h'), '00:00', 'formatEventTime 12h midnight string to 24h');

    // Test formatEventTime edge cases / invalid inputs
    assertEqual(formatEventTime(''), '', 'formatEventTime empty string');
    assertEqual(formatEventTime('invalid-time-string'), '', 'formatEventTime invalid string');
    assertEqual(formatEventTime(new Date(NaN)), '', 'formatEventTime invalid Date object');

    // Test formatEventDuration
    assertEqual(formatEventDuration(0), '0m', 'formatEventDuration 0m');
    assertEqual(formatEventDuration(-15), '0m', 'formatEventDuration negative duration');
    assertEqual(formatEventDuration(NaN), '0m', 'formatEventDuration NaN');
    assertEqual(formatEventDuration(15), '15m', 'formatEventDuration 15m');
    assertEqual(formatEventDuration(45), '45m', 'formatEventDuration 45m');
    assertEqual(formatEventDuration(60), '1h', 'formatEventDuration 60m -> 1h');
    assertEqual(formatEventDuration(90), '1h 30m', 'formatEventDuration 90m -> 1h 30m');
    assertEqual(formatEventDuration(120), '2h', 'formatEventDuration 120m -> 2h');
    assertEqual(formatEventDuration(135), '2h 15m', 'formatEventDuration 135m -> 2h 15m');
    assertEqual(formatEventDuration(74.6), '1h 15m', 'formatEventDuration rounding float minutes');

    return true;
  } catch (error) {
    console.error('Calendar formatting test assertion error:', error);
    return false;
  }
}

// Auto-run when executed directly in CLI (e.g. tsx src/utils/calendarFormatting.ts)
if (
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  (process.argv[1].endsWith('calendarFormatting.ts') || process.argv[1].endsWith('calendarFormatting.js'))
) {
  const result = runCalendarFormattingTests();
  if (result) {
    console.log('✅ runCalendarFormattingTests: All assertions passed successfully.');
  } else {
    console.error('❌ runCalendarFormattingTests: Assertion failure.');
    process.exit(1);
  }
}
