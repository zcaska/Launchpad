import { isClockOnlyDeadline } from '../../utils/taskDeadline';
import { parsePeriodDeadline } from '../../utils/taskPeriod';

export function formatLocalYMD(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function joinDeadlineParts(date: string, time: string): string {
  if (date && time) return `${date} ${time}`;
  return date || time;
}

export function projectDeadlineEditor(deadline: string, now: Date) {
  const text = deadline.trim();
  const hasClock = /(?:^|\s|T)\d{1,2}:\d{2}/i.test(text);
  // Recover the original fields for invalid imports so they can still be edited.
  let date = deadline.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  let time = deadline.match(/(?:^|\s|T)(\d{2}:\d{2})/i)?.[1] ?? '';
  const parsed = hasClock ? parsePeriodDeadline(text, now) : null;
  if (parsed) {
    const clockOnly = isClockOnlyDeadline(text);
    if (!clockOnly) date = formatLocalYMD(parsed);
    time = clockOnly ? text.padStart(5, '0') : parsed.toTimeString().slice(0, 5);
  }

  return {
    value: deadline || undefined,
    date,
    time,
    withDate(nextDate: string) {
      return nextDate === date ? deadline : joinDeadlineParts(nextDate, time);
    },
    withTime(nextTime: string) {
      if (nextTime === time) return deadline;
      return joinDeadlineParts(nextTime ? date || formatLocalYMD(now) : date, nextTime);
    },
  };
}
