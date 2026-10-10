# LaunchPAD Companion Browser Extension

Companion browser extension for **LaunchPAD** built with Manifest V3.

This extension automatically listens for browser bookmark creation events (`chrome.bookmarks.onCreated`), classifies new bookmarks deterministically using domain and keyword heuristics (without AI or external network calls), and broadcasts them in real time to open LaunchPAD tabs.

---

## Features

- **Real-Time Bookmark Sync**: Bookmarks saved via browser address bar or shortcuts (`Ctrl+D` / `Cmd+D`) instantly sync into LaunchPAD.
- **Rule-Based Categorization**: Uses identical categorization heuristics as LaunchPAD:
  - 🎓 **Classes & Studies** (`canvas`, `blackboard`, `.edu`, `coursera`, course keywords)
  - 💼 **Work & Projects** (`github`, `figma`, `linear`, `jira`, dev tools, localhost)
  - 📚 **Reading List** (`arxiv`, `substack`, `medium`, articles, research papers)
  - ⚡ **Daily Tools & Bookmarks** (AI assistants, mail, calendar, music, utilities)
- **Batch Sync**: One-click "Sync All Bookmarks to LaunchPAD" button in the popup to import all existing browser bookmarks at once.
- **Zero Cloud / AI Dependencies**: All processing runs locally in your browser with zero latency and complete privacy.

---

## Installation & Setup Instructions

The companion extension is distributed as an unpacked Manifest V3 extension.

### Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `extension/` folder inside this repository:
   ```text
   C:\Users\AGP\Documents\Projects\LaunchPAD\extension
   ```
5. The extension icon **LP** will appear in your Chrome toolbar. Click the puzzle icon to pin it.

### Microsoft Edge
1. Open Microsoft Edge and navigate to `edge://extensions/`.
2. Toggle on **Developer mode** in the left sidebar.
3. Click **Load unpacked**.
4. Select the `extension/` directory.

### Brave Browser
1. Open Brave and navigate to `brave://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/` directory.

---

## How It Works

1. **Background Service Worker (`background.js`)**:
   - Registers a listener for `chrome.bookmarks.onCreated`.
   - When a bookmark is saved, extracts URL, title, and parent folder.
   - Evaluates rules via `rules.js` to determine `folderId` and `tags`.
   - Broadcasts the new bookmark via native `BroadcastChannel('launchpad_bookmarks_sync')` and `chrome.tabs.sendMessage`.

2. **Content Script Bridge (`content.js`)**:
   - Injected into LaunchPAD tabs (`localhost` or `github.io`).
   - Forwards background extension messages into the page context using `window.postMessage`.

3. **LaunchPAD Web App (`bookmarkSyncChannel.ts`)**:
   - Listens to incoming broadcast and window messages, automatically creating the link item in LaunchPAD and displaying a brief toast confirmation.
