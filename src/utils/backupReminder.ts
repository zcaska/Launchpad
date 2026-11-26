const BACKUP_REMINDER_DISMISSAL_PREFIX = 'launchpad_backup_reminder_dismissed_v1:';
const REMINDER_INTERVAL_MS = 5 * 24 * 60 * 60 * 1000;
const inMemoryDismissals = new Map<string, string>();

export function getBackupReminderCycle(lastBackupTimestamp: number, now = Date.now()): string {
  const timestamp = Number.isFinite(lastBackupTimestamp) ? Math.max(0, lastBackupTimestamp) : 0;
  const cycle = Math.floor(Math.max(0, now - timestamp) / REMINDER_INTERVAL_MS);
  return `${timestamp}:${cycle}`;
}

function dismissalKey(scope: string): string {
  return `${BACKUP_REMINDER_DISMISSAL_PREFIX}${encodeURIComponent(scope)}`;
}

export function isBackupReminderDismissed(scope: string, cycle: string): boolean {
  const key = dismissalKey(scope);
  if (inMemoryDismissals.get(key) === cycle) return true;
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) === cycle;
  } catch {
    return false;
  }
}

export function dismissBackupReminder(scope: string, cycle: string): void {
  const key = dismissalKey(scope);
  inMemoryDismissals.set(key, cycle);
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, cycle);
  } catch {
    // Dismissal should not interfere with using the app when browser storage is unavailable.
  }
}
