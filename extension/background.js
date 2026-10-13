/**
 * LaunchPAD Companion Extension - Background Service Worker
 * Listens for chrome.bookmarks events and broadcasts to LaunchPAD tabs.
 */

import { classifyBookmark, isGenericFolder } from './rules.js';

const SYNC_CHANNEL_NAME = 'launchpad_bookmarks_sync';

/**
 * Broadcasts a bookmark payload to open LaunchPAD tabs via:
 * 1. BroadcastChannel (supported in modern extension service workers)
 * 2. chrome.tabs.sendMessage to matching active LaunchPAD tabs
 */
async function broadcastBookmark(payload) {
  // 1. BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({
        type: 'BOOKMARK_CREATED',
        source: 'launchpad_extension',
        payload,
      });
      channel.close();
    }
  } catch (err) {
    console.warn('[LaunchPAD Extension] BroadcastChannel error:', err);
  }

  // 2. Direct message to LaunchPAD tabs via content script bridge
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (
        tab.url &&
        (tab.url.includes('localhost') ||
          tab.url.includes('127.0.0.1') ||
          tab.url.includes('zcaska.github.io/Launchpad'))
      ) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'LAUNCHPAD_BOOKMARK_CREATED',
          payload,
        }).catch(() => {
          // Ignore tabs where content script might not yet be initialized
        });
      }
    }
  } catch (err) {
    console.warn('[LaunchPAD Extension] chrome.tabs.query error:', err);
  }
}

/**
 * Retrieves the full folder path hierarchy for a given bookmark parent ID.
 */
async function getBookmarkFolderHierarchy(parentId) {
  const hierarchy = [];
  let currentId = parentId;
  while (currentId) {
    try {
      const nodes = await chrome.bookmarks.get(currentId);
      if (nodes && nodes.length > 0) {
        const title = nodes[0].title || '';
        if (title && !isGenericFolder(title)) {
          hierarchy.unshift(title);
        }
        currentId = nodes[0].parentId;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return hierarchy;
}

// Listen for newly created bookmarks in Chrome / Edge / Brave
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (!bookmark.url) {
    // It's a folder, skip
    return;
  }

  const folderHierarchy = await getBookmarkFolderHierarchy(bookmark.parentId);
  const sourceFolder = folderHierarchy.length > 0 ? folderHierarchy[folderHierarchy.length - 1] : '';
  const classification = classifyBookmark(bookmark.url, bookmark.title, sourceFolder);

  const payload = {
    url: bookmark.url,
    title: bookmark.title || '',
    sourceFolder,
    folderHierarchy,
    folderId: classification.folderId,
    tags: classification.tags,
    addDate: bookmark.dateAdded || Date.now(),
    matchedRule: classification.matchedRule,
  };

  console.log('[LaunchPAD Extension] Detected bookmark onCreated:', payload);
  await broadcastBookmark(payload);
});

// Handle requests from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_STATUS') {
    sendResponse({ active: true, version: chrome.runtime.getManifest().version });
    return true;
  }

  if (message.action === 'APP_STATE' && message.type === 'FOCUS_TIMER_STATE') {
    persistFocusState(message.payload)
      .then(() => sendResponse({ received: true }))
      .catch((err) => sendResponse({ received: false, error: err.message }));
    return true; // async sendResponse
  }

  if (message.action === 'GET_FOCUS_STATE') {
    chrome.storage.local.get(['launchpad_focus'])
      .then((res) => sendResponse({ success: true, focus: res.launchpad_focus || null }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }

  if (message.action === 'ADD_TASK_REQUEST') {
    const text = typeof message.text === 'string' ? message.text.trim().slice(0, 200) : '';
    if (!text) {
      sendResponse({ success: false, error: 'Task text is empty.' });
      return true;
    }
    deliverTaskToLaunchpad(text)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }

  if (message.action === 'TIMER_COMMAND') {
    forwardTimerCommand(message.command)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }

  if (message.action === 'SYNC_ALL_BOOKMARKS') {
    syncAllBookmarks()
      .then((count) => sendResponse({ success: true, count }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }
});

/**
 * Traverses bookmark tree and batch-syncs all bookmarks to LaunchPAD tabs.
 */

const FOCUS_STORAGE_KEY = 'launchpad_focus';
const TASK_QUEUE_KEY = 'launchpad_task_queue';

function isLaunchpadUrl(url) {
  return Boolean(
    url &&
      (url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('zcaska.github.io/Launchpad'))
  );
}

async function findLaunchpadTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find((tab) => isLaunchpadUrl(tab.url)) || null;
}

function badgeTextFor(timer) {
  if (!timer) return '';
  const elapsed =
    timer.elapsedSeconds || (timer.baseSeconds || 0);
  if (!timer.running) return '❚❚';
  if (elapsed >= 3600) {
    return `${Math.floor(elapsed / 3600)}h${Math.floor((elapsed % 3600) / 60)}`;
  }
  return `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
}

async function persistFocusState(payload) {
  const timer = payload && payload.timer ? payload.timer : null;
  const record = {
    timer,
    nextTask: (payload && payload.nextTask) || null,
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [FOCUS_STORAGE_KEY]: record });
  await chrome.action.setBadgeText({ text: badgeTextFor(timer) });
  await chrome.action.setBadgeBackgroundColor({ color: '#0f4c4c' });
}

// Refresh the badge from the stored startedAt so it keeps counting between
// app broadcasts (content scripts in background tabs are heavily throttled).
async function refreshBadgeFromStorage() {
  try {
    const res = await chrome.storage.local.get([FOCUS_STORAGE_KEY]);
    const record = res[FOCUS_STORAGE_KEY];
    if (!record || !record.timer) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }
    const timer = { ...record.timer };
    if (timer.running && typeof timer.startedAt === 'number') {
      timer.elapsedSeconds =
        (timer.baseSeconds || 0) + Math.max(0, Math.floor((Date.now() - timer.startedAt) / 1000));
    }
    await chrome.action.setBadgeText({ text: badgeTextFor(timer) });
  } catch {
    // Storage transiently unavailable: keep the last badge text.
  }
}

try {
  chrome.alarms?.create('launchpad-badge-refresh', { periodInMinutes: 1 });
} catch {
  // alarms permission missing in older installs: badge still updates on broadcasts.
}
try {
  chrome.alarms?.onAlarm.addListener((alarm) => {
    if (alarm.name === 'launchpad-badge-refresh') refreshBadgeFromStorage();
  });
} catch {
  // ignore
}

// Deliver a task to the open LaunchPad tab, or queue it in extension storage
// when no tab is open. The queue flushes on the next LaunchPad page load.
async function deliverTaskToLaunchpad(text) {
  const tab = await findLaunchpadTab();
  if (tab && tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'LAUNCHPAD_ADD_TASK',
        payload: { text },
      });
      return { success: true, queued: false };
    } catch {
      // Content script not ready yet (page still loading): fall through to queue.
    }
  }
  const res = await chrome.storage.local.get([TASK_QUEUE_KEY]);
  const queue = Array.isArray(res[TASK_QUEUE_KEY]) ? res[TASK_QUEUE_KEY] : [];
  queue.push({ text, queuedAt: Date.now() });
  await chrome.storage.local.set({ [TASK_QUEUE_KEY]: queue });
  return { success: true, queued: true };
}

async function flushTaskQueue(tabId) {
  const res = await chrome.storage.local.get([TASK_QUEUE_KEY]);
  const queue = Array.isArray(res[TASK_QUEUE_KEY]) ? res[TASK_QUEUE_KEY] : [];
  if (queue.length === 0) return;
  // Clear first so a mid-flush failure does not duplicate tasks on retry.
  await chrome.storage.local.set({ [TASK_QUEUE_KEY]: [] });
  for (const item of queue) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'LAUNCHPAD_ADD_TASK',
        payload: { text: item.text },
      });
    } catch {
      // Tab closed mid-flush: re-queue the remainder.
      const remaining = queue.slice(queue.indexOf(item));
      await chrome.storage.local.set({ [TASK_QUEUE_KEY]: remaining });
      return;
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isLaunchpadUrl(tab.url)) {
    // Small delay so the content script bridge is listening.
    setTimeout(() => flushTaskQueue(tabId), 1500);
  }
});

// pause | resume | end — forwarded to the open LaunchPad tab for the app to apply.
async function forwardTimerCommand(command) {
  if (!['pause', 'resume', 'end'].includes(command)) {
    return { success: false, error: `Unknown timer command: ${command}` };
  }
  const tab = await findLaunchpadTab();
  if (!tab || !tab.id) {
    return { success: false, error: 'No open LaunchPad tab to control.' };
  }
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'LAUNCHPAD_TIMER_COMMAND',
      payload: { command },
    });
    // Refresh popup state right after the app applies the command.
    setTimeout(refreshBadgeFromStorage, 800);
    return { success: true };
  } catch {
    return { success: false, error: 'LaunchPad tab is not ready yet.' };
  }
}
async function syncAllBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const allBookmarks = [];

  function walk(nodes, folderPath = []) {
    for (const node of nodes) {
      if (node.url) {
        const sourceFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : '';
        const classification = classifyBookmark(node.url, node.title, sourceFolder);
        allBookmarks.push({
          url: node.url,
          title: node.title || '',
          sourceFolder,
          folderHierarchy: [...folderPath],
          folderId: classification.folderId,
          tags: classification.tags,
          addDate: node.dateAdded || Date.now(),
        });
      }
      if (node.children && node.children.length > 0) {
        const nextPath = node.title && !isGenericFolder(node.title)
          ? [...folderPath, node.title]
          : folderPath;
        walk(node.children, nextPath);
      }
    }
  }

  walk(tree);

  if (allBookmarks.length > 0) {
    // Send batch to LaunchPAD tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.postMessage({
          type: 'SYNC_BOOKMARKS_BATCH',
          source: 'launchpad_extension',
          payload: allBookmarks,
        });
        channel.close();
      }
    } catch (err) {
      console.warn('[LaunchPAD Extension] BroadcastChannel batch error:', err);
    }

    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (
          tab.url &&
          (tab.url.includes('localhost') ||
            tab.url.includes('127.0.0.1') ||
            tab.url.includes('zcaska.github.io/Launchpad'))
        ) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'LAUNCHPAD_SYNC_BOOKMARKS_BATCH',
            payload: allBookmarks,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[LaunchPAD Extension] tabs message error:', err);
    }
  }

  return allBookmarks.length;
}
