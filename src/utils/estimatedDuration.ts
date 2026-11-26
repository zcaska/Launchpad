export const MAX_ESTIMATED_MINUTES = 525600;

export function updateEstimatedHours(currentMinutes: number, hours: number) {
  const minutePart = currentMinutes % 60;
  return Math.max(5, Math.min(MAX_ESTIMATED_MINUTES, hours * 60 + minutePart));
}

export function updateEstimatedMinutes(currentMinutes: number, minutes: number) {
  const hourPart = Math.floor(currentMinutes / 60);
  return Math.max(5, Math.min(MAX_ESTIMATED_MINUTES, hourPart * 60 + minutes));
}
