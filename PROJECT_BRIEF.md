# Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)

> Date: 2026-10-24
> Branch / Worktree: `experiment/no-bookmarks` at `.worktrees/no-bookmarks`
> Status: Requirements Resolved & Aligned

---

## 1. Executive Summary & Goals

LaunchPad began as a client-side productivity dashboard and redirect destination with bookmark management, folder hierarchies, and Chrome extension synchronization. Over time, LaunchPad has evolved into an authoritative focus station (Primary Focus hero workspace, Commitment Radar, Time Radar, Hero gamification, Serene Hearth design system, Launchpad Pet).

**Goal of this experiment**:
1. **Completely eliminate the bookmark and folder concepts**:
   - Strip out bookmark collections, folder trees, domain clustering, favicon matrices, bookmark import/export modals, and folder management dialogs.
   - Remove the companion Chrome extension (`extension/`) from the repository.
2. **Elevate Smart Suggest into an active, high-signal discovery engine**:
   - Recommend rich, curated web reading and thought-provoking resources (e.g., Hacker News, Longform.org, ArXiv preprints, Aeon essays, Farnam Street, Stanford Encyclopedia of Philosophy, MIT OCW).
   - Interleave offline / mindfulness / digital wellbeing habit ideas (e.g., "Check out mail", "Read a physical book instead", "Step away for a 10-minute walk", "Hydrate and stretch", "Review today's priorities in notebook").
   - Support both web link actions (direct open, domain, favicon) and offline/habit actions (custom action buttons, mindful acknowledgement, no empty URL breakage).
   - Display Smart Suggest both as the "Clear Runway" hero state when all tasks are complete, AND via an on-demand "Spark Idea / Smart Suggest" trigger directly accessible from the dashboard.
3. **Streamline and rebalance the Sidebar**:
   - Remove the "Folders & Hierarchy" block, link list, folder creation/management controls, and drag-and-drop complexity.
   - Retain clean primary destinations: **Overview / Dashboard**, **Tasks & Action Items** (with live pending count badge), **Growth & Mastery** (with active hero badge).
   - Integrate an elegant, live **Smart Suggestion / Focus Idea sidebar card** and streamlined scratchpad access to keep the sidebar balanced, purposeful, and free of empty voids.
4. **Isolated Worktree Experiment**:
   - All changes developed and verified inside the dedicated git worktree `.worktrees/no-bookmarks` on branch `experiment/no-bookmarks`.
   - If successful, this experiment will be merged cleanly into `main`.

---

## 2. Stack & Architecture Rationale

- **Stack**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 3.4 with `@tailwindcss/container-queries`, Lucide Icons, `motion/react`.
- **Stack Decision**: Retained existing project stack without modification. A framework rewrite (e.g. Next.js) was rejected because LaunchPad is an ultra-fast, 100% client-side, zero-backend, zero-auth static dashboard with GitHub Pages deployment and localStorage persistence. Adding a server runtime would violate the core architectural invariants.

---

## 3. Resolved Decisions (from User Consultation)

1. **Sidebar Layout & Content**:
   - The empty space left by deleting the folder tree is repurposed to host a live, compact **Smart Suggestion / Focus Idea sidebar card** alongside the primary navigation items (Overview, Tasks, Growth) and quick scratchpad access.
2. **Smart Suggest Placement**:
   - Dual-presence:
     a) Dominant hero view in `PrimaryFocusCard` when all tasks are done ("Clear Runway").
     b) An on-demand "Spark Idea" shortcut on the dashboard header allowing users to pull a mindful break or reading recommendation at any time.
3. **Candidate Pool & Recommendation Architecture**:
   - Built-in curated pool replaces bookmark-derived candidates:
     - High-signal reading (`Hacker News`, `Longform.org`, `ArXiv Preprints`, `Aeon`, `Farnam Street`, `Stanford Encyclopedia`).
     - Mindful offline habits (`Read a book instead`, `Check out mail`, `Posture & breath reset`, `Screen-free walk`, `Handwritten scratchpad dump`).
   - Self-learning Multi-Armed Bandit algorithm (approvals/rejections, time-of-day affinity, tag weights, 2h rejection suppression) preserved and applied to the curated pool.
4. **Chrome Companion Extension**:
   - Completely deleted (`extension/` removed, references cleaned).
5. **Data Model & Migrations**:
   - `folders` and `links` removed from core schema. Schema migration preserves existing notes, tasks, gamification, and settings safely.

---

## 4. Explicit Non-Goals

- **No New Accounts / Database**: Remains strictly zero-login, client-side with localStorage persistence and JSON backup.
- **No Infinite Social Feeds**: Smart Suggest serves singular, deliberate micro-recommendations (with Approve / Reject cycling), never an addictive infinite scroll.
- **No Disruption of Core Focus Mechanics**: Primary Focus timer, Commitment Radar, Time Radar, gamification Hero Ladder, and Launchpad Pet behavior remain fully functional.

---

## 5. Open Risks & Mitigation

- **Risk: Breaking localStorage schema for existing users.**
  *Mitigation*: Storage schema migration safely defaults or ignores legacy `folders` and `links` without crashing or losing tasks, gamification, or settings.
- **Risk: Offline ideas causing broken URL open clicks.**
  *Mitigation*: Differentiate candidate types (`sourceType: 'web' | 'habit'`). Only open external window if URL exists; provide "I'll do this" / "Take break" actions for habit ideas.
