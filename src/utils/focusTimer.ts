/**
 * Focus timer helpers: a single active timer persisted in localStorage so it
 * survives reloads, plus elapsed-time formatting shared by the app and the
 * message payload mirrored to the extension.
 */

export interface FocusTimerState {
  taskId: string;
  startedAt: number; // epoch ms when the current run segment began
  baseSeconds: number; // accumulated seconds banked before this segment
  running: boolean;
}

export const FOCUS_TIMER_STORAGE_KEY = 'launchpad_focus_timer_v1';

export function loadFocusTimer(): FocusTimerState | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(FOCUS_TIMER_STORAGE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.taskId !== 'string' || typeof parsed.startedAt !== 'number') return null;
    return {
      taskId: parsed.taskId,
      startedAt: parsed.startedAt,
      baseSeconds: typeof parsed.baseSeconds === 'number' && parsed.baseSeconds >= 0 ? Math.floor(parsed.baseSeconds) : 0,
      running: parsed.running !== false,
    };
  } catch {
    return null;
  }
}

export function saveFocusTimer(state: FocusTimerState | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!state) {
      localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: timer keeps running in memory only.
  }
}

/** Total elapsed seconds for a timer state at reference time `nowMs`. */
export function elapsedSeconds(state: FocusTimerState | null, nowMs: number = Date.now()): number {
  if (!state) return 0;
  if (!state.running) return state.baseSeconds;
  return state.baseSeconds + Math.max(0, Math.floor((nowMs - state.startedAt) / 1000));
}

/** `M:SS` under an hour, `H:MM:SS` beyond. Fits extension badge + card. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const mm = hours > 0 ? String(mins).padStart(2, '0') : String(mins);
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
