import { LinkItem } from '../types';

export const BOOKMARKS_SYNC_CHANNEL_NAME = 'launchpad_bookmarks_sync';

export type BookmarkSyncMessageType = 
  | 'BOOKMARK_CREATED'
  | 'REQUEST_SYNC'
  | 'SYNC_BOOKMARKS_BATCH';

export interface BookmarkSyncPayload {
  url: string;
  title?: string;
  sourceFolder?: string;
  tags?: string[];
  folderId?: string;
  addDate?: number;
}

export interface BookmarkSyncEventData {
  type: BookmarkSyncMessageType;
  source?: string;
  payload: BookmarkSyncPayload | BookmarkSyncPayload[];
}

export type BookmarkSyncHandler = (payload: BookmarkSyncPayload) => void;

let activeBroadcastChannel: BroadcastChannel | null = null;

/**
 * Broadcast an added bookmark link across tabs via BroadcastChannel.
 */
export function broadcastBookmarkAdded(link: LinkItem): void {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!activeBroadcastChannel) {
        activeBroadcastChannel = new BroadcastChannel(BOOKMARKS_SYNC_CHANNEL_NAME);
      }
      activeBroadcastChannel.postMessage({
        type: 'BOOKMARK_CREATED',
        source: 'launchpad_app',
        payload: {
          url: link.url,
          title: link.title,
          folderId: link.folderId,
          tags: link.tags,
          addDate: link.createdAt,
        },
      } as BookmarkSyncEventData);
    }
  } catch (err) {
    console.warn('[BookmarkSync] Failed to broadcast bookmark added:', err);
  }
}

/**
 * Request sync from companion extension or connected tabs.
 */
export function broadcastRequestSync(): void {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!activeBroadcastChannel) {
        activeBroadcastChannel = new BroadcastChannel(BOOKMARKS_SYNC_CHANNEL_NAME);
      }
      activeBroadcastChannel.postMessage({
        type: 'REQUEST_SYNC',
        source: 'launchpad_app',
        payload: { url: '' },
      } as BookmarkSyncEventData);
    }
  } catch (err) {
    console.warn('[BookmarkSync] Failed to broadcast request sync:', err);
  }
}

/**
 * Initializes listeners for bookmark synchronization:
 * 1. BroadcastChannel('launchpad_bookmarks_sync') for cross-tab and extension background worker messages.
 * 2. window.addEventListener('message') for extension content scripts injecting via window.postMessage.
 *
 * @param onNewBookmark Callback invoked when a new bookmark or batch of bookmarks is received.
 * @returns Cleanup function to unsubscribe and close channels.
 */
export function initBookmarkSyncChannel(
  onNewBookmark: BookmarkSyncHandler
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // 1. Setup BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  const handleBcMessage = (event: MessageEvent<any>) => {
    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'BOOKMARK_CREATED' && data.payload) {
        if (Array.isArray(data.payload)) {
          data.payload.forEach((item: BookmarkSyncPayload) => {
            if (item && item.url) onNewBookmark(item);
          });
        } else if (data.payload.url) {
          onNewBookmark(data.payload as BookmarkSyncPayload);
        }
      } else if (data.type === 'SYNC_BOOKMARKS_BATCH' && Array.isArray(data.payload)) {
        data.payload.forEach((item: BookmarkSyncPayload) => {
          if (item && item.url) onNewBookmark(item);
        });
      }
    } catch (err) {
      console.warn('[BookmarkSync] Error handling BroadcastChannel message:', err);
    }
  };

  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(BOOKMARKS_SYNC_CHANNEL_NAME);
      bc.addEventListener('message', handleBcMessage);
      activeBroadcastChannel = bc;
    }
  } catch (err) {
    console.warn('[BookmarkSync] BroadcastChannel not supported or failed to initialize:', err);
  }

  // 2. Setup window.addEventListener('message') for Companion extension content scripts
  const handleWindowMessage = (event: MessageEvent<any>) => {
    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Validate message structure from extension bridge or window.postMessage
      if (
        data.type === 'LAUNCHPAD_BOOKMARK_CREATED' ||
        data.type === 'BOOKMARK_CREATED' ||
        data.action === 'BOOKMARK_CREATED'
      ) {
        const payload = data.payload || data.bookmark || data.data;
        if (payload) {
          if (Array.isArray(payload)) {
            payload.forEach((item: BookmarkSyncPayload) => {
              if (item && item.url) onNewBookmark(item);
            });
          } else if (payload.url) {
            onNewBookmark(payload as BookmarkSyncPayload);
          }
        }
      } else if (
        (data.type === 'LAUNCHPAD_SYNC_BOOKMARKS_BATCH' || data.type === 'SYNC_BOOKMARKS_BATCH') &&
        (data.payload || data.bookmarks)
      ) {
        const batch = data.payload || data.bookmarks;
        if (Array.isArray(batch)) {
          batch.forEach((item: BookmarkSyncPayload) => {
            if (item && item.url) onNewBookmark(item);
          });
        }
      }
    } catch (err) {
      console.warn('[BookmarkSync] Error handling window message event:', err);
    }
  };

  window.addEventListener('message', handleWindowMessage);

  // Return teardown callback
  return () => {
    if (bc) {
      bc.removeEventListener('message', handleBcMessage);
      bc.close();
      if (activeBroadcastChannel === bc) {
        activeBroadcastChannel = null;
      }
    }
    window.removeEventListener('message', handleWindowMessage);
  };
}
