import { CalendarEventItem } from '../types';
import { normalizeGoogleCalendarEvent } from '../utils/calendarSchedule';

const GCAL_TOKEN_STORAGE_KEY = 'launchpad_gcal_token_v1';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const TOKEN_REQUEST_TIMEOUT_MS = 180000;

// In-memory token cache backed by localStorage
let memoryAccessToken: string | null = null;
let memoryTokenExpiresAt: number = 0;

/**
 * Single in-flight authorization request.
 *
 * Google Identity Services token clients share global popup + callback state: calling
 * `initTokenClient` again while a popup is open replaces the previous client's callback,
 * so the first request never settles (no token stored, spinner stuck, "random" auth
 * failure). One promise is shared by all callers until it settles.
 */
let pendingTokenRequest: Promise<string> | null = null;

/**
 * Why an authorization/API call failed. Callers must branch on this instead of assuming
 * any failure means "disconnected": only `expired` and `revoked` mean the credential is
 * gone, and a 403 is never expiry.
 */
export type GoogleAuthErrorKind =
  | 'invalid_config'
  | 'expired'
  | 'revoked'
  | 'denied'
  | 'insufficient_scope'
  | 'forbidden'
  | 'rate_limited'
  | 'network'
  | 'user_cancelled'
  | 'popup_blocked'
  | 'unknown';

export class GoogleAuthError extends Error {
  readonly kind: GoogleAuthErrorKind;

  constructor(message: string, kind: GoogleAuthErrorKind) {
    super(message);
    this.name = 'GoogleAuthError';
    this.kind = kind;
  }
}

/** True when the credential itself is gone and the user must re-authorize. */
export function needsReauthorization(err: unknown): boolean {
  const kind = err instanceof GoogleAuthError ? err.kind : 'unknown';
  return kind === 'expired' || kind === 'revoked' || kind === 'insufficient_scope';
}

/** True when the failure was not a credential problem, so retrying with the token is sane. */
export function isTransientGoogleError(err: unknown): boolean {
  const kind = err instanceof GoogleAuthError ? err.kind : 'unknown';
  return kind === 'rate_limited' || kind === 'network' || kind === 'forbidden';
}

export function getInMemoryGoogleToken(): string | null {
  // Check memory first
  if (memoryAccessToken && Date.now() < memoryTokenExpiresAt - 30000) {
    return memoryAccessToken;
  }

  // Check localStorage if memory is missing or expired
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(GCAL_TOKEN_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && typeof parsed.expiresAt === 'number') {
        if (Date.now() < parsed.expiresAt - 30000) {
          memoryAccessToken = parsed.token;
          memoryTokenExpiresAt = parsed.expiresAt;
          return memoryAccessToken;
        } else {
          // Stored token expired, clear it
          localStorage.removeItem(GCAL_TOKEN_STORAGE_KEY);
        }
      }
    }
  } catch {
    // Ignore storage parsing errors
  }

  return null;
}

export function setInMemoryGoogleToken(token: string | null, expiresInSeconds: number = 3599): void {
  memoryAccessToken = token;
  memoryTokenExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;

  try {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem(
          GCAL_TOKEN_STORAGE_KEY,
          JSON.stringify({ token, expiresAt: memoryTokenExpiresAt })
        );
      } else {
        localStorage.removeItem(GCAL_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage quota/permission errors
  }
}

export function isGoogleTokenExpired(): boolean {
  return getInMemoryGoogleToken() === null;
}

/**
 * Dynamically loads Google Identity Services script if not already present
 */
export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('gsi-client-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Extracts the user's primary account email from Google Calendar API response.
 */
export function extractPrimaryCalendarEmail(data: any): string | null {
  if (!data) return null;
  if (typeof data.summary === 'string' && data.summary.includes('@')) {
    return data.summary.trim();
  }
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (Array.isArray(item.attendees)) {
        const selfAttendee = item.attendees.find((a: any) => a?.self && typeof a?.email === 'string');
        if (selfAttendee?.email) {
          return selfAttendee.email.trim();
        }
      }
      if (item.creator?.email && typeof item.creator.email === 'string') {
        return item.creator.email.trim();
      }
      if (item.organizer?.email && typeof item.organizer.email === 'string') {
        return item.organizer.email.trim();
      }
    }
  }
  return null;
}

/** Maps a GIS token-callback error payload onto a typed failure. */
function classifyTokenResponseError(response: any): GoogleAuthError {
  const code = String(response?.error || '');
  const description = String(response?.error_description || response?.error || 'Google authorization failed.');

  if (code === 'popup_closed_by_user' || code === 'user_cancelled') {
    return new GoogleAuthError('Google authorization was cancelled.', 'user_cancelled');
  }
  if (code === 'popup_failed_to_open' || code === 'popup_blocked') {
    return new GoogleAuthError('Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.', 'popup_blocked');
  }
  if (code === 'access_denied') {
    return new GoogleAuthError(description, 'denied');
  }
  if (['interaction_required', 'consent_required', 'invalid_grant', 'unauthorized_client'].includes(code)) {
    return new GoogleAuthError(description, 'expired');
  }
  return new GoogleAuthError(description, 'unknown');
}

/**
 * Performs the actual GIS token request. Callers go through `requestGoogleAccessToken`,
 * which serializes concurrent calls onto one popup.
 */
async function performGoogleTokenRequest(
  clientId: string,
  prompt: string,
  loginHint?: string
): Promise<string> {
  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new GoogleAuthError('Google Identity Services SDK is unavailable in this environment.', 'unknown'));
      return;
    }

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    // A popup that never calls back (blocked, dismissed by the browser, focus lost) would
    // otherwise hang the promise forever and block every later authorization attempt.
    const timer = setTimeout(() => {
      settle(() => reject(new GoogleAuthError('Google authorization timed out. Please try again.', 'unknown')));
    }, TOKEN_REQUEST_TIMEOUT_MS);

    const clientConfig: any = {
      client_id: clientId,
      scope: GCAL_SCOPE,
      // Crucial: Passing prompt (default '') prevents GIS from defaulting to 'select_account'
      prompt: prompt,
      callback: (response: any) => {
        if (response.error) {
          settle(() => reject(classifyTokenResponseError(response)));
          return;
        }
        if (response.access_token) {
          const expiresIn = response.expires_in ? Number(response.expires_in) : 3599;
          setInMemoryGoogleToken(response.access_token, expiresIn);
          settle(() => resolve(response.access_token));
        } else {
          settle(() => reject(new GoogleAuthError('No access token returned from Google authentication prompt.', 'unknown')));
        }
      },
      // Without this, popup-blocked / SDK-level errors never reach the promise above.
      error_callback: (err: any) => {
        const type = err?.type;
        if (type === 'popup_closed') {
          settle(() => reject(new GoogleAuthError('Google authorization was cancelled.', 'user_cancelled')));
        } else if (type === 'popup_failed_to_open') {
          settle(() => reject(new GoogleAuthError(
            'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
            'popup_blocked'
          )));
        } else {
          settle(() => reject(new GoogleAuthError(
            err?.message || 'Google authorization failed.',
            'unknown'
          )));
        }
      },
    };

    if (loginHint && loginHint.trim()) {
      clientConfig.login_hint = loginHint.trim();
    }

    try {
      const client = google.accounts.oauth2.initTokenClient(clientConfig);

      const requestOptions: any = { prompt };
      if (loginHint && loginHint.trim()) {
        requestOptions.login_hint = loginHint.trim();
      }

      client.requestAccessToken(requestOptions);
    } catch (err) {
      settle(() => reject(err));
    }
  });
}

/**
 * Requests an OAuth 2.0 access token via Google Identity Services token client.
 * Requests ONLY calendar.events.readonly.
 * Sets prompt: '' to avoid Google Identity Services defaulting to 'select_account'.
 * When loginHint is supplied, Google directs authentication straight to that account,
 * eliminating repeated account chooser popups.
 *
 * Concurrent callers share the single in-flight request instead of opening a second popup.
 */
export function requestGoogleAccessToken(
  clientId: string,
  prompt: string = '',
  loginHint?: string
): Promise<string> {
  if (!clientId.trim()) {
    return Promise.reject(new GoogleAuthError('Please enter a valid Google OAuth Client ID in Settings.', 'invalid_config'));
  }

  // GIS shares popup/callback state globally, so a second request would clobber the first.
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  const request = performGoogleTokenRequest(clientId.trim(), prompt, loginHint).finally(() => {
    pendingTokenRequest = null;
  });
  pendingTokenRequest = request;
  return request;
}

/**
 * Attempts client.requestAccessToken({ prompt: '' }) silently.
 * Passes loginHint if available to prevent the account selector popup.
 * Resolves with the access token if successful, or null if silent auth fails.
 */
export async function requestSilentGoogleAccessToken(
  clientId: string,
  loginHint?: string
): Promise<string | null> {
  try {
    const token = await requestGoogleAccessToken(clientId, '', loginHint);
    return token;
  } catch (err) {
    console.debug('Silent Google token request failed or required interaction:', err);
    return null;
  }
}

/**
 * Fetches the user's primary calendar email using an active token.
 */
export async function fetchGoogleCalendarAccountEmail(
  token: string,
  calendarId: string = 'primary'
): Promise<string | null> {
  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('maxResults', '1');
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return extractPrimaryCalendarEmail(data);
  } catch {
    return null;
  }
}

/**
 * Revokes authorization on Google servers and clears in-memory and persisted tokens.
 */
export async function revokeGoogleAuthorization(): Promise<void> {
  const token = memoryAccessToken || getInMemoryGoogleToken();
  setInMemoryGoogleToken(null);

  if (token && (window as any).google?.accounts?.oauth2?.revoke) {
    await new Promise<void>((resolve) => {
      try {
        (window as any).google.accounts.oauth2.revoke(token, () => resolve());
      } catch {
        resolve();
      }
    });
  }
}

/**
 * Maps a Google Calendar API failure onto a typed error.
 *
 * Only an explicit 401 is treated as an expired credential. A 403 is never expiry: it
 * covers revoked access, a missing scope, a rate limit or a plain forbidden calendar,
 * each of which needs a different user response.
 */
function classifyGoogleApiError(status: number, errData: any): GoogleAuthError {
  const reason = String(errData?.error?.errors?.[0]?.reason || '');
  const apiMessage = errData?.error?.message || `Google Calendar API error (${status})`;

  if (status === 401) {
    setInMemoryGoogleToken(null);
    return new GoogleAuthError('Google authorization expired. Please re-authorize.', 'expired');
  }

  if (status === 429 || ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason)) {
    return new GoogleAuthError('Google Calendar rate limit reached. Try again shortly.', 'rate_limited');
  }

  if (status === 403) {
    if (['insufficientPermissions', 'insufficientScopes'].includes(reason)) {
      return new GoogleAuthError('Google Calendar access is missing the required read-only scope. Please re-authorize.', 'insufficient_scope');
    }
    if (reason === 'authError') {
      setInMemoryGoogleToken(null);
      return new GoogleAuthError('Google Calendar authorization was revoked. Please re-authorize.', 'revoked');
    }
    // Some other permission problem (e.g. calendar not shared). The token is still valid.
    return new GoogleAuthError(apiMessage, 'forbidden');
  }

  return new GoogleAuthError(apiMessage, 'unknown');
}

/**
 * Fetches events for the current day using Google Calendar v3 REST API
 * with full pagination and error handling.
 * Optionally discovers and reports the primary calendar account email.
 */
export async function fetchTodayGoogleEvents(
  token: string,
  calendarId: string = 'primary',
  onAccountEmailDiscovered?: (email: string) => void
): Promise<CalendarEventItem[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const allItems: CalendarEventItem[] = [];
  let pageToken: string | undefined = undefined;
  let hasCheckedEmail = false;

  do {
    const userTimeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', startOfDay.toISOString());
    url.searchParams.set('timeMax', endOfDay.toISOString());
    url.searchParams.set('timeZone', userTimeZone);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('conferenceDataVersion', '1');
    url.searchParams.set('_t', Date.now().toString());
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });
    } catch {
      // Offline, DNS failure, CORS abort, AbortSignal from navigation: the token is still fine.
      throw new GoogleAuthError('Network error contacting Google Calendar. Check your connection and retry.', 'network');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw classifyGoogleApiError(res.status, errData);
    }

    const data = await res.json();

    if (!hasCheckedEmail && onAccountEmailDiscovered && calendarId === 'primary') {
      hasCheckedEmail = true;
      const discovered = extractPrimaryCalendarEmail(data);
      if (discovered) {
        onAccountEmailDiscovered(discovered);
      }
    }

    const rawItems = Array.isArray(data.items) ? data.items : [];

    for (const raw of rawItems) {
      const normalized = normalizeGoogleCalendarEvent(raw);
      if (normalized) {
        allItems.push(normalized);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allItems;
}
