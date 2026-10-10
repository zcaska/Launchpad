document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('sync-btn');
  const openBtn = document.getElementById('open-btn');
  const feedback = document.getElementById('feedback');
  const statusText = document.getElementById('status-text');

  // Verify connection to service worker
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusText.textContent = 'Standby';
        statusText.style.color = '#94a3b8';
      } else {
        statusText.textContent = 'Active & Ready';
      }
    });
  }

  // Handle Manual "Sync All Bookmarks"
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    feedback.textContent = 'Syncing bookmarks to LaunchPAD...';
    feedback.style.color = '#94a3b8';

    try {
      chrome.runtime.sendMessage({ action: 'SYNC_ALL_BOOKMARKS' }, (response) => {
        syncBtn.disabled = false;
        if (chrome.runtime.lastError) {
          feedback.textContent = 'Error: ' + chrome.runtime.lastError.message;
          feedback.style.color = '#ef4444';
          return;
        }

        if (response && response.success) {
          feedback.textContent = `Successfully synced ${response.count} bookmarks!`;
          feedback.style.color = '#10b981';
        } else {
          feedback.textContent = response?.error || 'Failed to sync bookmarks.';
          feedback.style.color = '#ef4444';
        }
      });
    } catch (err) {
      syncBtn.disabled = false;
      feedback.textContent = 'Error initiating sync.';
      feedback.style.color = '#ef4444';
    }
  });

  // Handle "Open LaunchPAD"
  openBtn.addEventListener('click', () => {
    // Check if LaunchPAD tab is already open
    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find(
        (tab) =>
          tab.url &&
          (tab.url.includes('localhost:5173') ||
            tab.url.includes('localhost:3000') ||
            tab.url.includes('zcaska.github.io/Launchpad'))
      );

      if (existingTab && existingTab.id) {
        chrome.tabs.update(existingTab.id, { active: true });
        if (existingTab.windowId) {
          chrome.windows.update(existingTab.windowId, { focused: true });
        }
      } else {
        // Open default local dev or production URL
        chrome.tabs.create({ url: 'http://localhost:5173' });
      }
    });
  });
});
