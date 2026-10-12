/**
 * Calendar formatting utilities for event times, durations, and description link extraction.
 */
import { TaskUrl } from '../types';

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

export interface ExtractedCalendarDetails {
  cleanDescription: string;
  extractedUrls: TaskUrl[];
}

/**
 * Extracts links from Google Calendar descriptions (raw HTML anchors, escaped anchors, plain URLs),
 * unescapes entities, sanitizes protocols, and produces clean human-readable plain text
 * along with structured TaskUrl items.
 */
export function extractCalendarDescriptionLinksAndCleanText(
  rawDescription?: string,
  eventId?: string
): ExtractedCalendarDetails {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { cleanDescription: '', extractedUrls: [] };
  }

  const prefix = eventId ? `cal-link-${eventId}` : `cal-link-${Date.now()}`;
  const extractedUrls: TaskUrl[] = [];
  const seenUrls = new Set<string>();

  // If the description contains escaped HTML tags (&lt;a href=...), unescape entities first
  let text = rawDescription;
  if (/&lt;a\s+/i.test(text) || /&lt;\/a&gt;/i.test(text)) {
    text = decodeHtmlEntities(text);
  }

  // 1. Match HTML anchor tags: <a ... href="..." ...>...</a>
  const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  text = text.replace(anchorRegex, (_, href, innerContent) => {
    const decodedUrl = decodeHtmlEntities(href).trim();
    // Strip nested tags from innerContent if any
    const rawTitle = decodeHtmlEntities(innerContent.replace(/<[^>]+>/g, '')).trim();

    if (isSafeUrl(decodedUrl) && !seenUrls.has(decodedUrl)) {
      seenUrls.add(decodedUrl);

      // Determine readable title
      // Prefer anchor title if meaningful; if empty or identical to URL, fallback to hostname
      let title = rawTitle;
      if (!title || title.toLowerCase() === decodedUrl.toLowerCase()) {
        title = deriveUrlTitle(decodedUrl, 'Open Class Link');
      }

      extractedUrls.push({
        id: `${prefix}-${extractedUrls.length}`,
        title,
        url: decodedUrl,
      });
    }

    // In plain text description, replace the anchor tag with the readable title (or empty if none)
    return rawTitle;
  });

  // 2. Match standalone plain-text URLs not in anchors
  const urlRegex = /\bhttps?:\/\/[^\s<>"']+/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    const rawUrl = match[0].replace(/[.,;:)\]]+$/, ''); // strip trailing punctuation
    if (isSafeUrl(rawUrl) && !seenUrls.has(rawUrl)) {
      seenUrls.add(rawUrl);
      extractedUrls.push({
        id: `${prefix}-${extractedUrls.length}`,
        title: deriveUrlTitle(rawUrl, 'Open Link'),
        url: rawUrl,
      });
    }
  }

  // 3. Convert line-breaking tags to newlines
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  // 4. Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 5. Decode any remaining HTML entities in the text
  text = decodeHtmlEntities(text);

  // 6. Clean up newlines and excessive whitespace
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    cleanDescription: text,
    extractedUrls,
  };
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

    // Test isSafeUrl
    assertEqual(isSafeUrl('https://www.poonamkumari.com/learn'), true, 'isSafeUrl https valid');
    assertEqual(isSafeUrl('http://zoom.us/j/12345'), true, 'isSafeUrl http valid');
    assertEqual(isSafeUrl('javascript:alert(1)'), false, 'isSafeUrl javascript rejected');
    assertEqual(isSafeUrl('data:text/html,<script>'), false, 'isSafeUrl data scheme rejected');
    assertEqual(isSafeUrl('vbscript:msgbox'), false, 'isSafeUrl vbscript rejected');
    assertEqual(isSafeUrl('file:///C:/passwords.txt'), false, 'isSafeUrl file scheme rejected');
    assertEqual(isSafeUrl(''), false, 'isSafeUrl empty string rejected');

    // Test decodeHtmlEntities
    assertEqual(
      decodeHtmlEntities('Sem-3 &amp; Economics &quot;Micro-1&quot; &#39;2026&#39;'),
      "Sem-3 & Economics \"Micro-1\" '2026'",
      'decodeHtmlEntities standard entities'
    );
    assertEqual(
      decodeHtmlEntities('&lt;a href=&quot;test&quot;&gt;Hello&lt;/a&gt;'),
      '<a href="test">Hello</a>',
      'decodeHtmlEntities tag brackets'
    );

    // Test deriveUrlTitle
    assertEqual(deriveUrlTitle('https://www.poonamkumari.com/learn/home'), 'poonamkumari.com', 'deriveUrlTitle strips www');
    assertEqual(deriveUrlTitle('https://zoom.us/j/123456?pwd=abc'), 'zoom.us', 'deriveUrlTitle hostname');
    assertEqual(deriveUrlTitle('invalid', 'Fallback'), 'Fallback', 'deriveUrlTitle fallback');

    // Test extractCalendarDescriptionLinksAndCleanText on User Example
    const userClassHtml = '<a href="https://www.poonamkumari.com/learn/home/sem3">Sem-3---Intermediate-Micro-1 (Poonam Kumari)</a>';
    const parsedUserExample = extractCalendarDescriptionLinksAndCleanText(userClassHtml, 'evt-101');
    assertEqual(parsedUserExample.cleanDescription, 'Sem-3---Intermediate-Micro-1 (Poonam Kumari)', 'User example cleanDescription has no html markup');
    assertEqual(parsedUserExample.extractedUrls.length, 1, 'User example extracts 1 url');
    assertEqual(parsedUserExample.extractedUrls[0].title, 'Sem-3---Intermediate-Micro-1 (Poonam Kumari)', 'User example title preserved from anchor text');
    assertEqual(parsedUserExample.extractedUrls[0].url, 'https://www.poonamkumari.com/learn/home/sem3', 'User example url extracted');

    // Test extractCalendarDescriptionLinksAndCleanText on Escaped HTML
    const escapedHtml = 'Class link: &lt;a href=&quot;https://meet.google.com/xyz-pdqr-abc&quot;&gt;Google Meet&lt;/a&gt; for today';
    const parsedEscaped = extractCalendarDescriptionLinksAndCleanText(escapedHtml, 'evt-102');
    assertEqual(parsedEscaped.cleanDescription, 'Class link: Google Meet for today', 'Escaped html tags cleaned in text');
    assertEqual(parsedEscaped.extractedUrls.length, 1, 'Escaped html extracts link');
    assertEqual(parsedEscaped.extractedUrls[0].url, 'https://meet.google.com/xyz-pdqr-abc', 'Escaped url extracted');
    assertEqual(parsedEscaped.extractedUrls[0].title, 'Google Meet', 'Escaped title extracted');

    // Test extractCalendarDescriptionLinksAndCleanText on Malformed / Dangerous URLs
    const dangerousHtml = 'Click <a href="javascript:alert(1)">Here</a> or <a href="https://legit.com">Legit</a>';
    const parsedDangerous = extractCalendarDescriptionLinksAndCleanText(dangerousHtml, 'evt-103');
    assertEqual(parsedDangerous.extractedUrls.length, 1, 'Dangerous schemes filtered out');
    assertEqual(parsedDangerous.extractedUrls[0].url, 'https://legit.com', 'Only safe url extracted');

    // Test plain text URLs alongside text
    const plainTextWithUrl = 'Notes are at https://docs.google.com/document/d/123/edit.<br>Please read.';
    const parsedPlain = extractCalendarDescriptionLinksAndCleanText(plainTextWithUrl, 'evt-104');
    assertEqual(parsedPlain.cleanDescription, 'Notes are at https://docs.google.com/document/d/123/edit.\nPlease read.', 'Plain text converted line breaks');
    assertEqual(parsedPlain.extractedUrls.length, 1, 'Plain text url extracted');
    assertEqual(parsedPlain.extractedUrls[0].url, 'https://docs.google.com/document/d/123/edit', 'Plain url matched without trailing period');
    assertEqual(parsedPlain.extractedUrls[0].title, 'docs.google.com', 'Plain url title defaults to domain');

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

