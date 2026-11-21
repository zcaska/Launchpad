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
  const timeOnly = /^\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text);
  const localDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text);
  // Local form values already contain the picker fields. Other valid date-times
  // use the same local calendar and clock as the Tasks list.
  const parsed = hasClock && !timeOnly && !localDateTime ? parsePeriodDeadline(text, now) : null;
  const date = parsed ? formatLocalYMD(parsed) : deadline.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  const time = parsed ? parsed.toTimeString().slice(0, 5) : deadline.match(/(?:^|\s|T)(\d{2}:\d{2})/)?.[1] ?? '';

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
