import {
  TICKTICK_SETTINGS_STORAGE_KEY,
  DEFAULT_TICKTICK_SETTINGS,
  loadTickTickSettings,
  saveTickTickSettings,
} from './ticktickSyncManager';
import type { TickTickSettings } from '../types';

let failures = 0;

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

// Mock localStorage for Node test runner environment
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  },
};

async function runTests() {
  console.log('--- Testing ticktickSyncManager.ts ---');

  // Test 1: Storage Key
  assertEqual(
    TICKTICK_SETTINGS_STORAGE_KEY,
    'launchpad_ticktick_settings_v1',
    'TICKTICK_SETTINGS_STORAGE_KEY is launchpad_ticktick_settings_v1'
  );

  // Test 2: Default Settings
  assertEqual(DEFAULT_TICKTICK_SETTINGS.enabled, false, 'Default enabled is false');
  assertEqual(DEFAULT_TICKTICK_SETTINGS.accessToken, '', 'Default accessToken is empty');
  assertEqual(DEFAULT_TICKTICK_SETTINGS.selectedProjectId, '', 'Default selectedProjectId is empty');
  assertEqual(DEFAULT_TICKTICK_SETTINGS.autoSyncIntervalMinutes, 5, 'Default autoSyncIntervalMinutes is 5');

  // Test 3: Load when empty returns defaults
  localStorage.clear();
  const loadedDefault = loadTickTickSettings();
  assertEqual(loadedDefault.enabled, false, 'Loaded settings when empty has enabled=false');
  assertEqual(loadedDefault.autoSyncIntervalMinutes, 5, 'Loaded settings when empty has interval=5');

  // Test 4: Save and load settings
  const customSettings: TickTickSettings = {
    enabled: true,
    accessToken: 'test-oauth-token-123',
    selectedProjectId: 'proj_inbox_999',
    selectedProjectName: 'Work Tasks',
    autoSyncIntervalMinutes: 15,
    proxyUrl: 'https://my-proxy.com/api',
  };
  saveTickTickSettings(customSettings);
  const loadedCustom = loadTickTickSettings();
  assertEqual(loadedCustom.enabled, true, 'Custom enabled flag saved and loaded');
  assertEqual(loadedCustom.accessToken, 'test-oauth-token-123', 'Custom access token saved and loaded');
  assertEqual(loadedCustom.selectedProjectId, 'proj_inbox_999', 'Custom projectId saved and loaded');
  assertEqual(loadedCustom.selectedProjectName, 'Work Tasks', 'Custom projectName saved and loaded');
  assertEqual(loadedCustom.autoSyncIntervalMinutes, 15, 'Custom interval saved and loaded');
  assertEqual(loadedCustom.proxyUrl, 'https://my-proxy.com/api', 'Custom proxyUrl saved and loaded');

  // Test 5: Graceful error fallback on corrupted JSON
  localStorage.setItem(TICKTICK_SETTINGS_STORAGE_KEY, 'invalid-json{{{');
  const loadedCorrupted = loadTickTickSettings();
  assertEqual(loadedCorrupted.enabled, false, 'Corrupted JSON falls back safely to default enabled');
  assertEqual(loadedCorrupted.autoSyncIntervalMinutes, 5, 'Corrupted JSON falls back safely to default interval');

  console.log(`\n=======================================`);
  if (failures > 0) {
    console.error(`❌ ${failures} TEST ASSERTION(S) FAILED`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL TICKTICK SYNC MANAGER TESTS PASSED (0 failures)`);
  }
}

runTests();
