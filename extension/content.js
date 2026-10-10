/**
 * LaunchPAD Companion Extension - Content Script Bridge
 * Injected on LaunchPAD web pages (localhost / github.io).
 * Bridges messages received from the extension background service worker
 * into the main web application context using window.postMessage.
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

// Notify the page that the extension bridge is active
window.postMessage(
  {
    source: 'LAUNCHPAD_EXTENSION_BRIDGE',
    type: 'EXTENSION_CONNECTED',
    version: '1.0.0',
  },
  '*'
);
