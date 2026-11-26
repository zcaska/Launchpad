/** Angle in degrees clockwise from 12 o'clock, normalized to [0, 360). */
export function getDialAngle(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
  const radians = Math.atan2(clientX - (rect.left + rect.width / 2), (rect.top + rect.height / 2) - clientY);
  return (radians * 180 / Math.PI + 360) % 360;
}

/** Smallest signed clockwise angle from the previous pointer position. */
export function getDialAngleDelta(previous: number, next: number) {
  return ((next - previous + 540) % 360) - 180;
}

/** Convert an angle to the nearest hour mark in the current 12-hour cycle. */
export function getHourAtDialAngle(angle: number, cycleStart: number) {
  const mark = Math.round(angle / 30) % 12;
  return cycleStart + mark;
}

export function clampDialHour(hour: number, maximum: number) {
  return Math.max(0, Math.min(maximum, hour));
}
