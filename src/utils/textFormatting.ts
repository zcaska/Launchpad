/**
 * Formatting helpers for task times, durations, and links.
 */
import { formatApproximateDuration } from './timeBudget';

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
  return formatApproximateDuration(durationMinutes, { allowWeeks: false });
}

/**
 * Validates whether a URL uses safe web protocols (http or https).
 * Rejects dangerous schemes like javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Decodes standard named and numeric HTML entities.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return isNaN(code) ? '' : String.fromCharCode(code);
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return isNaN(code) ? '' : String.fromCharCode(code);
      } catch {
        return '';
      }
    });
}

/**
 * Derives a human-friendly fallback title from a URL when no meaningful title is provided.
 */
export function deriveUrlTitle(rawUrl: string, fallback: string = 'Open Link'): string {
  try {
    const urlObj = new URL(rawUrl.trim());
    const host = urlObj.hostname.replace(/^www\./i, '');
    if (host) return host;
  } catch {
    // Ignore invalid url parse
  }
  return fallback;
}
