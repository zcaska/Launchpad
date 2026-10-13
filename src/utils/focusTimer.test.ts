import {
  loadFocusTimer,
  saveFocusTimer,
  elapsedSeconds,
  formatElapsed,
  FOCUS_TIMER_STORAGE_KEY,
  FocusTimerState,
} from './focusTimer';

let failures = 0;

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

// Minimal localStorage polyfill for Node / tsx
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

console.log('--- Testing focusTimer.ts ---\n');

// 1. Empty storage loads null
{
  storageMap.clear();
  assertEqual(loadFocusTimer(), null, 'No stored timer loads as null');
  assertEqual(elapsedSeconds(null), 0, 'Null timer reports 0 elapsed');
}

// 2. Running timer accumulates from startedAt + base
{
  storageMap.clear();
  const now = Date.now();
  const state: FocusTimerState = { taskId: 't1', startedAt: now - 90_000, baseSeconds: 30, running: true };
  saveFocusTimer(state);
  const loaded = loadFocusTimer();
  assertEqual(loaded?.taskId, 't1', 'Running timer round-trips through storage');
  const elapsed = elapsedSeconds(loaded, now);
  assertEqual(elapsed >= 119 && elapsed <= 121, true, `Running timer elapsed ≈ 120s (got ${elapsed})`);
}

// 3. Paused timer freezes at baseSeconds
{
  const paused: FocusTimerState = { taskId: 't1', startedAt: Date.now() - 3_600_000, baseSeconds: 45, running: false };
  assertEqual(elapsedSeconds(paused, Date.now() + 60_000), 45, 'Paused timer ignores wall-clock passage');
}

// 4. Clearing the timer removes the key
{
  saveFocusTimer(null);
  assertEqual(storageMap.has(FOCUS_TIMER_STORAGE_KEY), false, 'Clearing removes the storage key');
  assertEqual(loadFocusTimer(), null, 'Cleared timer loads as null');
}

// 5. Corrupt payloads never crash
{
  storageMap.set(FOCUS_TIMER_STORAGE_KEY, '{not json');
  assertEqual(loadFocusTimer(), null, 'Corrupt JSON loads as null');
  storageMap.set(FOCUS_TIMER_STORAGE_KEY, JSON.stringify({ nope: true }));
  assertEqual(loadFocusTimer(), null, 'Wrong shape loads as null');
}

// 6. Formatting fits badge + card
{
  assertEqual(formatElapsed(0), '0:00', '0s formats as 0:00');
  assertEqual(formatElapsed(65), '1:05', '65s formats as 1:05');
  assertEqual(formatElapsed(3599), '59:59', '3599s stays M:SS');
  assertEqual(formatElapsed(3600), '1:00:00', '3600s flips to H:MM:SS');
  assertEqual(formatElapsed(7384), '2:03:04', '7384s formats as 2:03:04');
  assertEqual(formatElapsed(-5), '0:00', 'Negative input clamps to 0:00');
}

if (failures > 0) {
  console.error(`\n❌ ${failures} FOCUS TIMER ASSERTION(S) FAILED`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL FOCUS TIMER TESTS PASSED!');
}
