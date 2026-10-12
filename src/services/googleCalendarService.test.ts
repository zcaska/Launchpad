import {
  getInMemoryGoogleToken,
  setInMemoryGoogleToken,
  isGoogleTokenExpired,
  extractPrimaryCalendarEmail,
  revokeGoogleAuthorization,
  requestGoogleAccessToken,
  requestSilentGoogleAccessToken,
} from './googleCalendarService';

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

// Polyfill minimal browser globals for testing in Node / tsx
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as any).document = {
  getElementById: () => null,
  createElement: () => ({ setAttribute: () => {}, addEventListener: () => {} }),
  head: { appendChild: () => {} },
};

console.log('--- Testing googleCalendarService.ts ---');

// 1. In-memory and localStorage token caching
{
  storageMap.clear();
  setInMemoryGoogleToken('test-token-123', 3600);
  assertEqual(getInMemoryGoogleToken(), 'test-token-123', 'getInMemoryGoogleToken retrieves fresh token');
  assertEqual(isGoogleTokenExpired(), false, 'isGoogleTokenExpired returns false for valid token');

  // Verify it was stored in localStorage
  const stored = storageMap.get('launchpad_gcal_token_v1');
  assert(stored !== null && stored !== undefined, 'Token is serialized to localStorage');
  const parsed = JSON.parse(stored!);
  assertEqual(parsed.token, 'test-token-123', 'Stored token matches input');
  assert(parsed.expiresAt > Date.now(), 'Stored expiresAt is in the future');
}

// 2. Token expiration handling
{
  storageMap.clear();
  // Set expired token (-10 seconds)
  setInMemoryGoogleToken('expired-token', -10);
  assertEqual(getInMemoryGoogleToken(), null, 'getInMemoryGoogleToken returns null for expired token');
  assertEqual(isGoogleTokenExpired(), true, 'isGoogleTokenExpired returns true for expired token');
  assertEqual(storageMap.get('launchpad_gcal_token_v1'), undefined, 'Expired token is cleaned up from localStorage');
}

// 3. Token clearance
{
  storageMap.clear();
  setInMemoryGoogleToken('active-token', 3600);
  assertEqual(isGoogleTokenExpired(), false, 'Token is active before clear');
  setInMemoryGoogleToken(null);
  assertEqual(getInMemoryGoogleToken(), null, 'Setting token to null clears token');
  assertEqual(isGoogleTokenExpired(), true, 'isGoogleTokenExpired returns true after clear');
  assertEqual(storageMap.get('launchpad_gcal_token_v1'), undefined, 'Storage key removed when set to null');
}

// 4. Primary account email extraction
{
  // Test case A: summary has email
  const dataWithSummaryEmail = {
    kind: 'calendar#events',
    summary: 'jane.focus@gmail.com',
    items: [],
  };
  assertEqual(
    extractPrimaryCalendarEmail(dataWithSummaryEmail),
    'jane.focus@gmail.com',
    'extractPrimaryCalendarEmail extracts email from calendar summary'
  );

  // Test case B: summary is generic title, self-attendee has email
  const dataWithSelfAttendee = {
    kind: 'calendar#events',
    summary: 'My Work Calendar',
    items: [
      {
        summary: 'Team Standup',
        attendees: [
          { email: 'colleague@company.com', self: false },
          { email: 'jane.focus@company.com', self: true },
        ],
      },
    ],
  };
  assertEqual(
    extractPrimaryCalendarEmail(dataWithSelfAttendee),
    'jane.focus@company.com',
    'extractPrimaryCalendarEmail extracts email from self attendee'
  );

  // Test case C: creator has email
  const dataWithCreatorEmail = {
    kind: 'calendar#events',
    summary: 'Calendar',
    items: [
      {
        summary: 'Solo Focus Session',
        creator: { email: 'developer@example.org' },
      },
    ],
  };
  assertEqual(
    extractPrimaryCalendarEmail(dataWithCreatorEmail),
    'developer@example.org',
    'extractPrimaryCalendarEmail extracts email from creator'
  );

  // Test case D: no email present
  assertEqual(
    extractPrimaryCalendarEmail({ summary: 'No Email Calendar', items: [] }),
    null,
    'extractPrimaryCalendarEmail returns null when no email exists'
  );
  assertEqual(
    extractPrimaryCalendarEmail(null),
    null,
    'extractPrimaryCalendarEmail returns null for null data'
  );
}

// 5. Revoke authorization
{
  storageMap.clear();
  setInMemoryGoogleToken('token-to-revoke', 3600);
  let revokeCalledWith: string | null = null;
  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          revoke: (t: string, cb: () => void) => {
            revokeCalledWith = t;
            cb();
          },
        },
      },
    },
  };

  await revokeGoogleAuthorization();
  assertEqual(revokeCalledWith, 'token-to-revoke', 'revokeGoogleAuthorization calls google.accounts.oauth2.revoke with token');
  assertEqual(getInMemoryGoogleToken(), null, 'revokeGoogleAuthorization clears local and memory token');
}

// 6. Google Identity Services initialization parameters (prompt & login_hint verification)
{
  let capturedClientConfig: any = null;
  let capturedRequestOptions: any = null;

  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            capturedClientConfig = config;
            return {
              requestAccessToken: (options: any) => {
                capturedRequestOptions = options;
                config.callback({ access_token: 'new-auth-token', expires_in: 3600 });
              },
            };
          },
        },
      },
    },
  };

  // Test standard authorization with userEmail provided as loginHint
  const token = await requestGoogleAccessToken('client-xyz.apps.googleusercontent.com', '', 'jane.focus@gmail.com');
  assertEqual(token, 'new-auth-token', 'requestGoogleAccessToken resolves with returned token');
  assertEqual(capturedClientConfig.client_id, 'client-xyz.apps.googleusercontent.com', 'client_id is passed');
  assertEqual(capturedClientConfig.prompt, '', 'prompt: "" is explicitly configured on initTokenClient to prevent default select_account');
  assertEqual(capturedClientConfig.login_hint, 'jane.focus@gmail.com', 'login_hint is passed to initTokenClient');
  assertEqual(capturedRequestOptions.prompt, '', 'prompt: "" is passed to requestAccessToken');
  assertEqual(capturedRequestOptions.login_hint, 'jane.focus@gmail.com', 'login_hint is passed to requestAccessToken');

  // Test forced account selection when user clicks "Switch account"
  capturedClientConfig = null;
  capturedRequestOptions = null;
  await requestGoogleAccessToken('client-xyz.apps.googleusercontent.com', 'select_account', undefined);
  assertEqual(capturedClientConfig.prompt, 'select_account', 'prompt: "select_account" is passed when explicitly requested');
  assertEqual(capturedClientConfig.login_hint, undefined, 'login_hint is omitted when select_account is requested');
  assertEqual(capturedRequestOptions.prompt, 'select_account', 'requestAccessToken receives select_account');
}

// 7. Silent token request helper with loginHint
{
  let capturedLoginHint: string | undefined = undefined;
  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => ({
            requestAccessToken: () => {
              capturedLoginHint = config.login_hint;
              config.callback({ access_token: 'silent-refreshed-token', expires_in: 3600 });
            },
          }),
        },
      },
    },
  };

  const silentToken = await requestSilentGoogleAccessToken('client-xyz.apps.googleusercontent.com', 'user@domain.com');
  assertEqual(silentToken, 'silent-refreshed-token', 'requestSilentGoogleAccessToken returns token');
  assertEqual(capturedLoginHint, 'user@domain.com', 'requestSilentGoogleAccessToken forwards loginHint');
}

if (failures > 0) {
  console.error(`\n💥 Tests finished with ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL GOOGLE CALENDAR SERVICE TESTS PASSED SUCCESSFULLY!');
}
