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
