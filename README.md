# 🚀 LaunchPad — Focus Dashboard & Redirect Hub

A minimalist, high-productivity personal dashboard designed as the intentional landing destination when redirected by site-blocking extensions like **Time Snatch**.

---

## 🎯 Purpose

When you get blocked from opening distracting websites (YouTube, Reddit, Twitter, Instagram), Time Snatch redirects you here instead of a blank screen or a single website.

**LaunchPad** surfaces all your active classes, work repositories, reading list articles, daily tools, and quick notes in one calm, beautifully organized command center.

---

## ✨ Features

- 📂 **Grouped Folder System**: Clean collapsible category sections with custom Lucide icons, color badges, and resource counters.
- ⚡ **One-Click Launch**: Instant navigation in new tabs with automatic high-res favicons and clean domain tags.
- 🧠 **Daily Focus Intention**: Live top-level priority prompt (*"What is your primary focus right now?"*) persisted for the day with a completion toggle.
- 📝 **Dual-Mode Quick Scratchpad**: Built-in action items checklist and freeform note pad with auto-save to browser storage.
- 🔍 **Instant Search & Filter (`Ctrl+K` / `Cmd+K`)**: Rapid keyword filtering across resource titles, domains, descriptions, tags, and folders.
- ⭐ **Favorites Filter**: Pin high-priority daily links to access them with a single click.
- 🛠️ **Full In-App Resource & Folder Management**:
  - Add, edit, delete, star, and move links between folders.
  - Create and customize folders with colors and icons.
- 💾 **Safe LocalStorage + JSON Backup/Restore**:
  - Zero-config client persistence.
  - One-click `.json` Export and Import in Settings to easily migrate across devices.
- 🌙 **Serene Hearth & Evening Flow Themes**: Hand-crafted light mode and dark mode with system theme detection and manual toggle.
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl + K` / `Cmd + K`: Focus search box
  - `N`: Quick Add Link modal
  - `Q`: Toggle Quick Scratchpad & Tasks drawer
  - `Esc`: Close open modals

---

## 🛠️ How to Configure with Time Snatch Extension

1. **Start LaunchPad** (locally via `npm run dev` or deployed on GitHub Pages / Vercel).
2. Copy your LaunchPad URL (e.g. `http://localhost:5173` or `https://your-username.github.io/launchpad/`).
3. Open your browser's **Time Snatch** extension settings:
   - For every blocked domain (e.g. `*://*.youtube.com/*`, `*://*.reddit.com/*`, `*://*.twitter.com/*`), set the **Redirect Target URL** to your LaunchPad URL.
4. Whenever you reflexively try to visit a distracting website, you will land directly on LaunchPad!

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 🚀 Deployment

### GitHub Pages
1. Push this repository to GitHub.
2. Under **Repository Settings** > **Pages**, set the source branch to `gh-pages` or configure GitHub Actions with Vite static build (`dist/`).

### Vercel / Netlify
1. Connect your GitHub repository to Vercel or Netlify.
2. Build command: `npm run build`
3. Output directory: `dist`
