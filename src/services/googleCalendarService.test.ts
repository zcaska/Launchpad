import {
  getInMemoryGoogleToken,
  setInMemoryGoogleToken,
  isGoogleTokenExpired,
  extractPrimaryCalendarEmail,
  revokeGoogleAuthorization,
  requestGoogleAccessToken,
  requestSilentGoogleAccessToken,
  fetchTodayGoogleEvents,
  GoogleAuthError,
  needsReauthorization,
  isTransientGoogleError,
} from './googleCalendarService';

import { syncCalendarEventsToQuickNotes } from '../utils/calendarSchedule';

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

// 8. Concurrent authorization requests share ONE token client / popup
{
  storageMap.clear();
  let initCount = 0;
  let pendingCallback: ((r: any) => void) | null = null;

  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            initCount++;
            return {
              requestAccessToken: () => {
                // Popup stays open until the test releases it.
                pendingCallback = config.callback;
              },
            };
          },
        },
      },
    },
  };

  const first = requestGoogleAccessToken('concurrent.apps.googleusercontent.com', '', 'user@concurrent.com');
  const second = requestGoogleAccessToken('concurrent.apps.googleusercontent.com', '', 'user@concurrent.com');
  const third = requestSilentGoogleAccessToken('concurrent.apps.googleusercontent.com', 'user@concurrent.com');

  // Let the SDK load + client init settle before asserting the popup count.
  await new Promise((r) => setTimeout(r, 0));
  assertEqual(initCount, 1, 'Concurrent token requests initialize only ONE GIS token client (no duplicate popups)');
  assert(pendingCallback !== null, 'The single shared popup is pending');

  // Release the single in-flight popup.
  pendingCallback!({ access_token: 'shared-token', expires_in: 3600 });

  assertEqual(await first, 'shared-token', 'First caller receives the shared token');
  assertEqual(await second, 'shared-token', 'Second caller receives the same shared token');
  assertEqual(await third, 'shared-token', 'Silent caller joins the shared request instead of opening another popup');
  assertEqual(getInMemoryGoogleToken(), 'shared-token', 'Shared token is cached after the concurrent burst');

  // The lock must be released once settled, otherwise authorization is dead forever.
  let secondInitCount = 0;
  (globalThis as any).window.google.accounts.oauth2.initTokenClient = (config: any) => {
    secondInitCount++;
    return { requestAccessToken: () => config.callback({ access_token: 'post-lock-token', expires_in: 3600 }) };
  };
  assertEqual(
    await requestGoogleAccessToken('concurrent.apps.googleusercontent.com'),
    'post-lock-token',
    'A later authorization attempt works (lock was released after settle)'
  );
  assertEqual(secondInitCount, 1, 'Post-settle request creates its own token client');
}

// 9. popup_closed_by_user is a cancellation, not a sync failure
{
  storageMap.clear();
  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => ({
            requestAccessToken: () => config.callback({ error: 'popup_closed_by_user' }),
          }),
        },
      },
    },
  };

  let cancelledErr: any = null;
  try {
    await requestGoogleAccessToken('cancel.apps.googleusercontent.com');
  } catch (e: any) {
    cancelledErr = e;
  }
  assert(cancelledErr instanceof GoogleAuthError, 'Popup dismissal throws a typed GoogleAuthError');
  assertEqual(cancelledErr?.kind, 'user_cancelled', 'popup_closed_by_user maps to kind "user_cancelled"');
  assertEqual(needsReauthorization(cancelledErr), false, 'A cancelled popup does NOT require re-authorization');
}

// 9b. Popup blocking via error_callback (popup_failed_to_open)
{
  storageMap.clear();
  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => ({
            requestAccessToken: () => config.error_callback({ type: 'popup_failed_to_open' }),
          }),
        },
      },
    },
  };

  let blockedErr: any = null;
  try {
    await requestGoogleAccessToken('blocked.apps.googleusercontent.com');
  } catch (e: any) {
    blockedErr = e;
  }
  assert(blockedErr instanceof GoogleAuthError, 'Popup blocking throws a typed GoogleAuthError');
  assertEqual(blockedErr?.kind, 'popup_blocked', 'popup_failed_to_open maps to kind "popup_blocked"');
  assertEqual(needsReauthorization(blockedErr), false, 'A blocked popup does NOT require re-authorization');
  assert(blockedErr?.message.includes('blocked by your browser'), 'Error message informs user of popup blocker');

  // Verify error_callback popup_closed also maps to user_cancelled
  (globalThis as any).window.google.accounts.oauth2.initTokenClient = (config: any) => ({
    requestAccessToken: () => config.error_callback({ type: 'popup_closed' }),
  });
  let closedErr: any = null;
  try {
    await requestGoogleAccessToken('closed.apps.googleusercontent.com');
  } catch (e: any) {
    closedErr = e;
  }
  assertEqual(closedErr?.kind, 'user_cancelled', 'error_callback popup_closed maps to kind "user_cancelled"');
}

// 10. OAuth error payload classification via a stub that returns error codes
{
  storageMap.clear();
  const makeStub = (code: string) => {
    (globalThis as any).window = {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (config: any) => ({
              requestAccessToken: () => config.callback({ error: code, error_description: code }),
            }),
          },
        },
      },
    };
  };

  let e1: any = null;
  makeStub('interaction_required');
  try { await requestGoogleAccessToken('c1.apps.googleusercontent.com'); } catch (e: any) { e1 = e; }
  assertEqual(e1?.kind, 'expired', 'interaction_required maps to "expired"');
  assertEqual(needsReauthorization(e1), true, 'expired requires re-authorization');

  let e2: any = null;
  makeStub('access_denied');
  try { await requestGoogleAccessToken('c2.apps.googleusercontent.com'); } catch (e: any) { e2 = e; }
  assertEqual(e2?.kind, 'denied', 'access_denied maps to "denied" (user refused consent)');

  let e3: any = null;
  makeStub('some_unknown_code');
  try { await requestGoogleAccessToken('c3.apps.googleusercontent.com'); } catch (e: any) { e3 = e; }
  assertEqual(e3?.kind, 'unknown', 'Unrecognised OAuth error maps to "unknown"');
}

// 11. Google Calendar API error classification (401 vs 403 vs 429 vs network)
{
  storageMap.clear();

  const stubFetch = (impl: () => Promise<any>) => {
    (globalThis as any).fetch = impl;
  };

  const jsonResponse = (status: number, body: any) => ({
    ok: false,
    status,
    json: async () => body,
  });

  // 11a. 401 -> expired, token cleared, re-auth required
  {
    setInMemoryGoogleToken('token-401', 3600);
    stubFetch(async () => jsonResponse(401, { error: { message: 'Invalid Credentials', errors: [{ reason: 'authError' }] } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-401');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'expired', 'HTTP 401 maps to "expired"');
    assertEqual(needsReauthorization(err), true, '401 requires re-authorization');
    assertEqual(getInMemoryGoogleToken(), null, '401 clears the cached token so a fresh one is requested');
  }

  // 11b. 403 insufficientPermissions -> re-auth required, but token is NOT wiped blindly
  {
    setInMemoryGoogleToken('token-scope', 3600);
    stubFetch(async () => jsonResponse(403, { error: { message: 'Insufficient Permission', errors: [{ reason: 'insufficientPermissions' }] } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-scope');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'insufficient_scope', '403 insufficientPermissions maps to "insufficient_scope"');
    assertEqual(needsReauthorization(err), true, 'Missing scope requires re-authorization');
  }

  // 11c. 403 authError -> revoked, token cleared
  {
    setInMemoryGoogleToken('token-revoked', 3600);
    stubFetch(async () => jsonResponse(403, { error: { message: 'AuthError', errors: [{ reason: 'authError' }] } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-revoked');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'revoked', '403 authError maps to "revoked"');
    assertEqual(needsReauthorization(err), true, 'Revoked access requires re-authorization');
    assertEqual(getInMemoryGoogleToken(), null, 'Revoked access clears the cached token');
  }

  // 11d. 403 rateLimitExceeded -> transient, NEVER treated as expiry
  {
    setInMemoryGoogleToken('token-ratelimit', 3600);
    stubFetch(async () => jsonResponse(403, { error: { message: 'Quota exceeded', errors: [{ reason: 'rateLimitExceeded' }] } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-ratelimit');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'rate_limited', '403 rateLimitExceeded maps to "rate_limited"');
    assertEqual(needsReauthorization(err), false, 'Rate limit does NOT trigger re-authorization');
    assertEqual(isTransientGoogleError(err), true, 'Rate limit is transient');
    assertEqual(getInMemoryGoogleToken(), 'token-ratelimit', 'Rate limit keeps the valid token cached (no forced re-auth)');
  }

  // 11e. 403 forbidden (calendar not shared) -> forbidden, token kept, transient
  {
    setInMemoryGoogleToken('token-forbidden', 3600);
    stubFetch(async () => jsonResponse(403, { error: { message: 'Not Found', errors: [{ reason: 'notFound' }] } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-forbidden');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'forbidden', 'Non-auth 403 maps to "forbidden", NOT "expired"');
    assertEqual(getInMemoryGoogleToken(), 'token-forbidden', 'Non-auth 403 keeps the token (403 is never expiry)');
  }

  // 11f. 429 -> rate_limited
  {
    stubFetch(async () => jsonResponse(429, { error: { message: 'Quota exceeded' } }));
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-429');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'rate_limited', 'HTTP 429 maps to "rate_limited"');
  }

  // 11g. Network failure -> network, token untouched
  {
    setInMemoryGoogleToken('token-offline', 3600);
    stubFetch(async () => { throw new TypeError('Failed to fetch'); });
    let err: any = null;
    try {
      await fetchTodayGoogleEvents('token-offline');
    } catch (e: any) { err = e; }
    assertEqual(err?.kind, 'network', 'fetch rejection maps to "network"');
    assertEqual(needsReauthorization(err), false, 'Network failure does NOT require re-authorization');
    assertEqual(isTransientGoogleError(err), true, 'Network failure is transient');
    assertEqual(getInMemoryGoogleToken(), 'token-offline', 'Network failure keeps the token for the next attempt');
  }
}

// 12. Recovery: 401 followed by re-authorization then a successful fetch
{
  storageMap.clear();
  let serverStatus = 401;
  (globalThis as any).fetch = async () => {
    if (serverStatus === 401) {
      return { ok: false, status: 401, json: async () => ({ error: { message: 'Invalid Credentials' } }) };
    }
    return { ok: true, status: 200, json: async () => ({ items: [{ id: 'evt-recovered', summary: 'Recovered Meeting', start: { dateTime: `${new Date().toISOString().slice(0, 10)}T10:00:00Z` }, end: { dateTime: `${new Date().toISOString().slice(0, 10)}T11:00:00Z` } }] }) };
  };

  let firstErr: any = null;
  try {
    await fetchTodayGoogleEvents(getInMemoryGoogleToken() ?? 'stale');
  } catch (e: any) { firstErr = e; }
  assertEqual(firstErr?.kind, 'expired', 'Stale token yields "expired" and clears the cache');
  assertEqual(getInMemoryGoogleToken(), null, 'No token remains after the 401');

  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => ({
            requestAccessToken: () => config.callback({ access_token: 'fresh-token', expires_in: 3600 }),
          }),
        },
      },
    },
  };
  const freshToken = await requestGoogleAccessToken('recover.apps.googleusercontent.com', '', 'user@recover.com');
  assertEqual(freshToken, 'fresh-token', 'Re-authorization yields a new token after a 401');

  serverStatus = 200;
  const events = await fetchTodayGoogleEvents(freshToken);
  assertEqual(events.length, 1, 'Sync recovers after re-authorization');
  assertEqual(events[0].summary, 'Recovered Meeting', 'Recovered sync returns the real event');
}

// 13. Pagination + cancellation handling still work after the refactor
{
  storageMap.clear();
  let call = 0;
  (globalThis as any).fetch = async () => {
    call++;
    if (call === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 'p1', summary: 'Page One', status: 'confirmed', start: { dateTime: `${new Date().toISOString().slice(0, 10)}T09:00:00Z` }, end: { dateTime: `${new Date().toISOString().slice(0, 10)}T10:00:00Z` } },
            { id: 'p2', summary: 'Cancelled Event', status: 'cancelled', start: { dateTime: `${new Date().toISOString().slice(0, 10)}T11:00:00Z` }, end: { dateTime: `${new Date().toISOString().slice(0, 10)}T12:00:00Z` } },
          ],
          nextPageToken: 'page-2',
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { id: 'p3', summary: 'Page Two Event', status: 'confirmed', start: { dateTime: `${new Date().toISOString().slice(0, 10)}T13:00:00Z` }, end: { dateTime: `${new Date().toISOString().slice(0, 10)}T14:00:00Z` } },
        ],
      }),
    };
  };

  const paged = await fetchTodayGoogleEvents('page-token');
  assertEqual(call, 2, 'Pagination follows nextPageToken to the second page');
  assertEqual(paged.length, 2, 'All pages are accumulated');
  assertEqual(paged.some((e) => e.summary === 'Cancelled Event'), false, 'Cancelled events are dropped by the normalizer');

  const notesAfterDelete = syncCalendarEventsToQuickNotes(
    syncCalendarEventsToQuickNotes([], paged),
    paged.filter((e) => e.id !== 'p1')
  );
  assertEqual(
    notesAfterDelete.some((n) => n.text === 'Page One'),
    false,
    'A deleted Google Calendar event is pruned from Launchpad tasks'
  );
  assertEqual(
    notesAfterDelete.some((n) => n.text === 'Page Two Event'),
    true,
    'Remaining events stay in Launchpad tasks'
  );
}

if (failures > 0) {
  console.error(`\n💥 Tests finished with ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL GOOGLE CALENDAR SERVICE TESTS PASSED SUCCESSFULLY!');
}
