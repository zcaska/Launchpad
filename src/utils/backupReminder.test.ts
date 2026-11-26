import assert from 'node:assert/strict';
import { dismissBackupReminder, getBackupReminderCycle, isBackupReminderDismissed } from './backupReminder';

const DAY = 24 * 60 * 60 * 1000;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const values = new Map<string, string>();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } },
});

const accountA = 'https://project-a.supabase.co:user-1';
const accountB = 'https://project-a.supabase.co:user-2';
const lastBackup = 1_800_000_000_000;
const firstReminderCycle = getBackupReminderCycle(lastBackup, lastBackup + 5 * DAY);
const nextReminderCycle = getBackupReminderCycle(lastBackup, lastBackup + 10 * DAY);

assert.equal(isBackupReminderDismissed(accountA, firstReminderCycle), false);
dismissBackupReminder(accountA, firstReminderCycle);
assert.equal(isBackupReminderDismissed(accountA, firstReminderCycle), true, 'dismissal is saved for the active reminder');
assert.equal(isBackupReminderDismissed(accountA, nextReminderCycle), false, 'dismissal expires at the next five-day reminder');
assert.equal(isBackupReminderDismissed(accountB, firstReminderCycle), false, 'dismissal is scoped to the account');
assert.notEqual(
  getBackupReminderCycle(lastBackup + 11 * DAY, lastBackup + 16 * DAY),
  getBackupReminderCycle(lastBackup, lastBackup + 16 * DAY),
  'a backup resets the cycle identity even if its interval number matches',
);

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  get() { throw new Error('storage access denied'); },
});
const blockedScope = 'private-browser-session';
const blockedCycle = getBackupReminderCycle(lastBackup, lastBackup + 5 * DAY);
assert.equal(isBackupReminderDismissed(blockedScope, blockedCycle), false);
dismissBackupReminder(blockedScope, blockedCycle);
assert.equal(isBackupReminderDismissed(blockedScope, blockedCycle), true, 'dismissal still works in memory if localStorage is blocked');

if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
else delete (globalThis as { window?: unknown }).window;

console.log('Backup reminder tests passed.');
