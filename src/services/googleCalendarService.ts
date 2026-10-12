import { CalendarEventItem } from '../types';
import { normalizeGoogleCalendarEvent } from '../utils/calendarSchedule';

const GCAL_TOKEN_STORAGE_KEY = 'launchpad_gcal_token_v1';

// In-memory token cache backed by localStorage
let memoryAccessToken: string | null = null;
let memoryTokenExpiresAt: number = 0;

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

/**
 * Requests an OAuth 2.0 access token via Google Identity Services token client.
 * Requests ONLY calendar.events.readonly.
 * Sets prompt: '' to avoid Google Identity Services defaulting to 'select_account'.
 * When loginHint is supplied, Google directs authentication straight to that account,
 * eliminating repeated account chooser popups.
 */
export async function requestGoogleAccessToken(
  clientId: string,
  prompt: string = '',
  loginHint?: string
): Promise<string> {
  if (!clientId.trim()) {
    throw new Error('Please enter a valid Google OAuth Client ID in Settings.');
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        throw new Error('Google Identity Services SDK is unavailable in this environment.');
      }

      const clientConfig: any = {
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
        // Crucial: Passing prompt (default '') prevents GIS from defaulting to 'select_account'
        prompt: prompt,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            const expiresIn = response.expires_in ? Number(response.expires_in) : 3599;
            setInMemoryGoogleToken(response.access_token, expiresIn);
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned from Google authentication prompt.'));
          }
        },
      };

      if (loginHint && loginHint.trim()) {
        clientConfig.login_hint = loginHint.trim();
      }

      const client = google.accounts.oauth2.initTokenClient(clientConfig);

      const requestOptions: any = { prompt };
      if (loginHint && loginHint.trim()) {
        requestOptions.login_hint = loginHint.trim();
      }

      client.requestAccessToken(requestOptions);
    } catch (err) {
      reject(err);
    }
  });
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

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401) {
        setInMemoryGoogleToken(null);
        throw new Error('Google authorization expired (401). Please re-authorize.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Google Calendar API error (${res.status})`);
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
