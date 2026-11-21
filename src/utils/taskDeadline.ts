const CLOCK_ONLY = /^(\d{1,2}):(\d{2})$/;
const CALENDAR_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?=$|[TZ\s])/i;
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/i;

export function isClockOnlyDeadline(deadline: string): boolean {
  return CLOCK_ONLY.test(deadline.trim());
}

function isCalendarDate(text: string): boolean {
  const [year, month, day] = text.split('-').map(Number);
  // Check the calendar components in UTC so local DST cannot affect validation.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseDeadline(deadline: string | undefined, reference: Date): Date | null {
  if (typeof deadline !== 'string') return null;
  const text = deadline.trim();
  if (!text) return null;

  const clock = CLOCK_ONLY.exec(text);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return null;
    const due = new Date(reference);
    due.setHours(hours, minutes, 0, 0);
    return Number.isNaN(due.getTime()) ? null : due;
  }

  const calendarDate = CALENDAR_DATE_PREFIX.exec(text)?.[1];
  if (calendarDate && !isCalendarDate(calendarDate)) return null;
  if (calendarDate === text) return new Date(`${text}T23:59:59.999`);

  // Imported slash dates, RFC date-times, and other legacy strings use native parsing.
  let dateInput = text;
  const dateTime = DATE_TIME.exec(text);
  if (dateTime) {
    const [, date, time, zone = ''] = dateTime;
    // ISO permits 24:00 only at the exact end of the day.
    const [hours, minutes, seconds = '00'] = time.split(':');
    if (Number(hours) > 24 || Number(minutes) > 59 || Number(seconds.slice(0, 2)) > 59) return null;
    if (hours === '24' && /[1-9]/.test(minutes + seconds)) return null;
    dateInput = `${date}T${time}${zone}`;
  }

  const due = new Date(dateInput);
  return Number.isNaN(due.getTime()) ? null : due;
}
