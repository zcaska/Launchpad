import { CalendarEventItem } from '../types';
import { normalizeGoogleCalendarEvent } from '../utils/calendarSchedule';

// Strictly in-memory token holder (NEVER stored in localStorage)
let memoryAccessToken: string | null = null;
let memoryTokenExpiresAt: number = 0;

export function getInMemoryGoogleToken(): string | null {
  if (!memoryAccessToken || Date.now() >= memoryTokenExpiresAt - 30000) {
    return null; // Expired or missing
  }
  return memoryAccessToken;
}

export function setInMemoryGoogleToken(token: string | null, expiresInSeconds: number = 3599): void {
  memoryAccessToken = token;
  memoryTokenExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;
}

export function isGoogleTokenExpired(): boolean {
  if (!memoryAccessToken) return true;
  return Date.now() >= memoryTokenExpiresAt - 30000;
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
 * Requests an in-memory OAuth 2.0 access token via Google Identity Services token client.
 * Requests ONLY calendar.events.readonly.
 */
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
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

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
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
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Revokes authorization on Google servers and clears in-memory token.
 */
export async function revokeGoogleAuthorization(): Promise<void> {
  const token = memoryAccessToken;
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
 */
export async function fetchTodayGoogleEvents(
  token: string,
  calendarId: string = 'primary'
): Promise<CalendarEventItem[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const allItems: CalendarEventItem[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', startOfDay.toISOString());
    url.searchParams.set('timeMax', endOfDay.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
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
