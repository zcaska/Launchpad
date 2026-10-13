/**
 * LaunchPAD Companion Extension - Content Script Bridge
 * Injected on LaunchPAD web pages (localhost / github.io).
 * Two-way bridge:
 *  - background -> page: bookmark sync payloads, queued tasks, timer commands
 *    (forwarded via window.postMessage, source LAUNCHPAD_EXTENSION_BRIDGE)
 *  - page -> background: focus timer state + next task
 *    (posted via window.postMessage, source LAUNCHPAD_APP)
 */

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type) {
    // Forward message to page window context
    window.postMessage(
      {
        source: 'LAUNCHPAD_EXTENSION_BRIDGE',
        type: message.type,
        payload: message.payload,
      },
      '*'
    );
    sendResponse({ received: true });
  }
});

// Forward app state (focus timer, next task) up to the background worker,
// which mirrors it into chrome.storage.local for the popup + toolbar badge.
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.source !== 'LAUNCHPAD_APP' || typeof data.type !== 'string') return;
  try {
    chrome.runtime.sendMessage({ action: 'APP_STATE', type: data.type, payload: data.payload });
  } catch {
    // Extension context invalidated (e.g. worker restarted): the next
    // broadcast from the app will simply retry.
  }
});

// Notify the page that the extension bridge is active
window.postMessage(
  {
    source: 'LAUNCHPAD_EXTENSION_BRIDGE',
    type: 'EXTENSION_CONNECTED',
    version: '1.1.0',
  },
  '*'
);
