import {
  loadAppData,
  saveAppData,
  pruneExpendableData,
  importDataFromJson,
  getStorageMetrics,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
} from './storage';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import { AppData } from '../types';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing storage.ts ---');

// In-memory mock localStorage for standalone testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public throwQuotaError: boolean = false;

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.throwQuotaError) {
      const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      throw err;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// 1. Test basic save and load
{
  mockStorage.clear();
  const testData: AppData = {
    ...DEFAULT_SEED_DATA,
    scratchpadText: 'Hello test storage',
  };
  const saved = saveAppData(testData);
  assert(saved, 'saveAppData returns true on success');
  assertEqual(mockStorage.getItem(STORAGE_KEY) !== null, true, 'STORAGE_KEY is populated');

  const loaded = loadAppData();
  assertEqual(loaded.scratchpadText, 'Hello test storage', 'loadAppData reads saved data correctly');
}

// 2. Test rolling backup and corruption recovery
{
  mockStorage.clear();
  const validData: AppData = {
    ...DEFAULT_SEED_DATA,
    scratchpadText: 'Crucial User Content',
  };
  saveAppData(validData);
  // Also create a backup
  mockStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(validData));

  // Corrupt the primary storage key with invalid JSON
  mockStorage.setItem(STORAGE_KEY, '{"corrupted: true, broken json...');

  const recovered = loadAppData();
  assertEqual(recovered.scratchpadText, 'Crucial User Content', 'loadAppData recovers from rolling backup when primary JSON is corrupted');
}

// 2b. Test v2 legacy migration to v3
{
  mockStorage.clear();
  const legacyV2Data = {
    version: 2,
    folders: [{ id: 'f-legacy', name: 'Legacy Folder' }],
    links: [{ id: 'l-legacy', title: 'Legacy Link', url: 'https://example.com', folderId: 'f-legacy' }],
    quickNotes: [{ id: 't-preserved', text: 'Important task', isDone: false, durationMinutes: 30 }],
    scratchpadText: 'Preserved notes',
    learnedPreferences: { approvalsCount: 5, rejectionsCount: 2, categoryWeights: {}, tagWeights: {}, timeOfDayAffinity: { morning: {}, afternoon: {}, evening: {}, night: {} }, recentRejections: [] },
  };
  mockStorage.setItem('launchpad_app_data_v2', JSON.stringify(legacyV2Data));

  const migrated = loadAppData();
  assertEqual(migrated.version, 3, 'loadAppData migrates legacy v2 data to version 3');
  assertEqual(migrated.quickNotes.length, 1, 'Preserves quickNotes across migration');
  assertEqual(migrated.quickNotes[0].text, 'Important task', 'Preserves task text');
  assertEqual(migrated.scratchpadText, 'Preserved notes', 'Preserves scratchpadText');
  assertEqual(migrated.learnedPreferences.approvalsCount, 5, 'Preserves learnedPreferences approvals count');
  assertEqual(migrated.folders?.length ?? 0, 0, 'Folders are cleanly removed in v3');
  assertEqual(migrated.links?.length ?? 0, 0, 'Links are cleanly removed in v3');
}

// 3. Test QuotaExceededError detection and self-healing
{
  mockStorage.clear();
  const dummyData: AppData = {
    ...DEFAULT_SEED_DATA,
    calendarEvents: [
      {
        id: 'e1',
        summary: 'Heavy Cache Event',
        startTime: '2026-10-21T10:00:00Z',
        endTime: '2026-10-21T11:00:00Z',
        startMs: 1,
        endMs: 2,
        durationMinutes: 60,
        isAllDay: false,
        status: 'confirmed',
      },
    ],
    growthHistory: {
      '2024-01-01': { tasksCompleted: 5, focusMinutes: 120, xpEarned: 100, dailyGoalCompleted: false },
      '2026-10-21': { tasksCompleted: 2, focusMinutes: 45, xpEarned: 50, dailyGoalCompleted: true },
    },
  };

  const pruned = pruneExpendableData(dummyData);
  assertEqual(pruned.calendarEvents?.length ?? 0, 0, 'pruneExpendableData clears re-fetchable calendarEvents');
  assert(Boolean(pruned.growthHistory['2026-10-21']), 'pruneExpendableData preserves recent growthHistory');

  // Trigger simulated quota failure
  mockStorage.throwQuotaError = true;
  const didSave = saveAppData(dummyData);
  assertEqual(didSave, false, 'saveAppData returns false when quota remains exceeded');
  mockStorage.throwQuotaError = false;
}

// 4. Test Deep Validation on Import
{
  // Valid JSON import (both legacy with folders/links, and v3)
  const legacyJson = JSON.stringify({
    version: 2,
    folders: [{ id: 'f1', name: 'Work' }],
    links: [
      { id: 'l1', title: 'Google', url: 'https://google.com', folderId: 'f1' },
      { id: 'l2', url: 'https://github.com' },
    ],
    quickNotes: [
      { id: 't1', text: 'Task 1', isDone: false, durationMinutes: 45 },
    ],
  });

  const imported = importDataFromJson(legacyJson);
  assertEqual(imported.version, 3, 'importDataFromJson upgrades version to 3');
  assertEqual(imported.quickNotes[0].durationMinutes, 45, 'importDataFromJson preserves task duration');
  assertEqual(imported.quickNotes[0].text, 'Task 1', 'importDataFromJson preserves task text');

  // Corrupted / invalid imports
  let caught = false;
  try {
    importDataFromJson('not a json');
  } catch (e: any) {
    caught = true;
    assert(e.message.includes('Invalid JSON format'), 'Rejects non-JSON string');
  }
  assert(caught, 'Caught non-JSON error');

  caught = false;
  try {
    importDataFromJson(JSON.stringify({ someWrong: 'object' }));
  } catch (e: any) {
    caught = true;
    assert(e.message.includes('Invalid LaunchPad backup file format'), 'Rejects invalid root schema');
  }
  assert(caught, 'Caught invalid schema error');
}

// 5. Test getStorageMetrics
{
  mockStorage.clear();
  mockStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_DATA));
  const metrics = getStorageMetrics();
  assert(metrics.usedBytes > 0, 'getStorageMetrics computes positive usedBytes');
  assert(typeof metrics.usedFormatted === 'string', 'getStorageMetrics provides formatted size string');
  assertEqual(metrics.folderCount, DEFAULT_SEED_DATA.folders.length, 'getStorageMetrics counts folders');
  assertEqual(metrics.linkCount, DEFAULT_SEED_DATA.links.length, 'getStorageMetrics counts links');
}

console.log('------------------------------------');
if (failures === 0) {
  console.log('🎉 ALL STORAGE TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`);
  process.exit(1);
}
