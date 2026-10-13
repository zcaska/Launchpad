document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('sync-btn');
  const openBtn = document.getElementById('open-btn');
  const feedback = document.getElementById('feedback');
  const statusText = document.getElementById('status-text');
  const focusTask = document.getElementById('focus-task');
  const focusTimerEl = document.getElementById('focus-timer');
  const focusNext = document.getElementById('focus-next');
  const timerToggleBtn = document.getElementById('timer-toggle-btn');
  const timerEndBtn = document.getElementById('timer-end-btn');
  const addInput = document.getElementById('add-input');
  const addBtn = document.getElementById('add-btn');

  let focusState = null; // mirrored { timer, nextTask } from the open LaunchPad tab

  function formatElapsed(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
  }

  function currentElapsed() {
    if (!focusState || !focusState.timer) return 0;
    const t = focusState.timer;
    if (!t.running && typeof t.elapsedSeconds === 'number') return t.elapsedSeconds;
    if (!t.running) return t.baseSeconds || 0;
    return (t.baseSeconds || 0) + Math.max(0, Math.floor((Date.now() - (t.startedAt || Date.now())) / 1000));
  }

  function renderFocus() {
    const timer = focusState && focusState.timer ? focusState.timer : null;
    if (!timer) {
      focusTask.textContent = 'No active timer';
      focusTimerEl.textContent = '0:00';
      timerToggleBtn.disabled = true;
      timerEndBtn.disabled = true;
    } else {
      focusTask.textContent = timer.taskText || 'Focus task';
      focusTimerEl.textContent = formatElapsed(currentElapsed());
      timerToggleBtn.disabled = false;
      timerEndBtn.disabled = false;
      timerToggleBtn.textContent = timer.running ? 'Pause' : 'Resume';
    }
    const next = focusState && focusState.nextTask ? focusState.nextTask : null;
    focusNext.textContent = next ? `Next: ${next.text}` : '';
  }

  // Live 1s tick, computed locally from startedAt so no tab traffic is needed.
  setInterval(renderFocus, 1000);

  function refreshFocus() {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    chrome.runtime.sendMessage({ action: 'GET_FOCUS_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      focusState = response.focus;
      renderFocus();
    });
  }

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
  openBtn.addEventListener('click', () => {    // Check if LaunchPAD tab is already open
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

  function sendTimerCommand(command) {
    feedback.textContent = '';
    chrome.runtime.sendMessage({ action: 'TIMER_COMMAND', command }, (response) => {
      if (chrome.runtime.lastError) {
        feedback.textContent = 'Error: ' + chrome.runtime.lastError.message;
        feedback.style.color = '#ef4444';
        return;
      }
      if (!response || !response.success) {
        feedback.textContent = response?.error || 'Timer command failed.';
        feedback.style.color = '#ef4444';
        return;
      }
      setTimeout(refreshFocus, 600);
    });
  }

  timerToggleBtn.addEventListener('click', () => {
    const timer = focusState && focusState.timer ? focusState.timer : null;
    if (!timer) return;
    sendTimerCommand(timer.running ? 'pause' : 'resume');
  });

  timerEndBtn.addEventListener('click', () => {
    sendTimerCommand('end');
  });

  function submitNewTask() {
    const text = addInput.value.trim();
    if (!text) return;
    addBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'ADD_TASK_REQUEST', text }, (response) => {
      addBtn.disabled = false;
      if (chrome.runtime.lastError) {
        feedback.textContent = 'Error: ' + chrome.runtime.lastError.message;
        feedback.style.color = '#ef4444';
        return;
      }
      if (response && response.success) {
        addInput.value = '';
        feedback.textContent = response.queued
          ? 'No open tab — task queued, will land on next LaunchPAD open.'
          : 'Task added to LaunchPAD!';
        feedback.style.color = '#10b981';
      } else {
        feedback.textContent = response?.error || 'Failed to add task.';
        feedback.style.color = '#ef4444';
      }
    });
  }

  addBtn.addEventListener('click', submitNewTask);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitNewTask();
  });

  refreshFocus();
});
