# Intelligent Focus & Self-Learning Recommendation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform LaunchPad into an intelligent, intentional focus guardian with real-time day time budgeting, task duration tracking, and a client-side self-learning recommendation engine that suggests productive alternatives when free or finished with an interactive Approve/Reject learning loop and optional OpenRouter API fallback.

**Architecture:** 
- **Time Capacity Engine**: Calculates remaining active day hours vs sum of pending task duration estimates to determine buffer/deficit time.
- **Contextual Intercept**: Shows urgent pending work when tasks remain; smoothly switches to smart suggestions when tasks are complete.
- **Self-Learning Bandit Engine**: Client-side Multi-Armed Bandit with tag-weight matrix and time-of-day affinity that updates upon every approval (+1.0) and rejection (-0.35).
- **Optional OpenRouter Fallback**: Rate-limited and cached web discovery when local library items are exhausted and API key is provided.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, LocalStorage, Vite.

**Spec:** [Brainstorming Design Plan](file:///C:/Users/AGP/.gemini/antigravity-cli/brain/3b7b371e-900d-4951-bc47-e26c07b9834b/implementation_plan_smart_focus_engine.md)

## Global Constraints

- 100% offline & zero-API by default; external API calls are strictly optional and rate-limited.
- Zero extra heavy dependencies; use pure TypeScript math and heuristics for the preference matrix.
- All state persisted automatically in `localStorage` with JSON export/import compatibility.

---

### Task 1: Type Definitions & Time Budget Math Utility

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/timeBudget.ts`

**Interfaces:**
- Consumes: `QuickNote`, `DaySchedule`
- Produces: `calculateDayTimeRemaining()`, `calculateTaskLoad()`, `calculateBuffer()`, `getTimeOfDayBucket()`

- [ ] **Step 1: Update type definitions in `src/types/index.ts`**
Add `durationMinutes?: number` and `deadline?: string` to `QuickNote`. Add `DaySchedule`, `LearnedPreferences`, `RecommendationCandidate`, and `OpenRouterConfig` interfaces.

- [ ] **Step 2: Implement `src/utils/timeBudget.ts`**
Implement pure functions for:
- `getTimeOfDayBucket(date: Date): 'morning' | 'afternoon' | 'evening' | 'night'`
- `calculateDayTimeRemaining(now: Date, endHour: number, endMinute: number): { totalMinutes: number; formatted: string }`
- `calculateTaskLoad(notes: QuickNote[]): { pendingMinutes: number; completedMinutes: number; formattedPending: string }`
- `calculateBuffer(availableMinutes: number, pendingMinutes: number): { bufferMinutes: number; status: 'surplus' | 'tight' | 'overloaded'; formatted: string }`

- [ ] **Step 3: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 2: Client-Side Multi-Armed Bandit Recommendation Engine

**Files:**
- Create: `src/utils/recommender.ts`
- Modify: `src/data/seedData.ts`

**Interfaces:**
- Consumes: `LinkItem`, `LearnedPreferences`, `Folder`, `TimeOfDayBucket`
- Produces: `scoreCandidate()`, `getTopRecommendation()`, `recordApproval()`, `recordRejection()`, `DEFAULT_MICRO_QUESTS`

- [ ] **Step 1: Define Default Micro-Quests in `src/data/seedData.ts`**
Add a rich set of 12 built-in high-value productive micro-quests (e.g. *"15m System Design deep-dive"*, *"Read 1 ArXiv CS paper"*, *"20m LeetCode practice"*, *"10m Mindfulness reflection & posture check"*, *"Explore MIT OpenCourseWare lecture"*).

- [ ] **Step 2: Implement Multi-Armed Bandit Scoring in `src/utils/recommender.ts`**
- Compute base item score + category weight + tag affinity + time-of-day affinity.
- Add exploration noise $\epsilon \cdot \text{random}$ to prevent local optima.
- Implement `recordApproval(prefs, candidate, timeBucket)` boosting category (+1.0) and tags (+0.5).
- Implement `recordRejection(prefs, candidate, timeBucket)` applying temporary suppression (-0.35) and recording rejection timestamp.
- Implement optional `fetchOpenRouterIdeas(apiKey, model, currentGoal)` with caching and daily quota check.

- [ ] **Step 3: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 3: Duration-Aware QuickNotes & Task System

**Files:**
- Modify: `src/components/QuickNotes/QuickNotesWidget.tsx`
- Modify: `src/components/Dashboard/FocusHeroBanner.tsx`

**Interfaces:**
- Consumes: `QuickNote`, `onUpdateNotes`
- Produces: Interactive duration selector (`15m`, `30m`, `45m`, `1h`, `2h`), duration badges on tasks, and remaining work time summary.

- [ ] **Step 1: Add Duration Selector to QuickNotesWidget**
Allow user to select or toggle task duration when adding a task. Display clean duration pills on each task card.

- [ ] **Step 2: Update FocusHeroBanner to display remaining work load**
Show estimated time for primary daily focus and total pending backlog time.

- [ ] **Step 3: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 4: Time Capacity & Workload Radar Widget

**Files:**
- Create: `src/components/Dashboard/TimeRadarWidget.tsx`

**Interfaces:**
- Consumes: `availableMinutes`, `pendingMinutes`, `bufferMinutes`, `status`, `onOpenTasks`
- Produces: Visual capacity gauge, progress bars, deficit/surplus alerts.

- [ ] **Step 1: Implement `src/components/Dashboard/TimeRadarWidget.tsx`**
- Show 3 key metrics: **Available Day Time**, **Pending Work Load**, and **Buffer/Deficit Balance**.
- Color-coded visual status bar (Emerald for surplus, Amber for tight, Rose for overloaded).
- Direct call-to-action button: *"Start Next Task"* when overloaded, or *"Explore Productive Suggestions"* when ahead.

- [ ] **Step 2: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 5: Interactive Smart Recommendation Card with Approve/Reject Loop

**Files:**
- Create: `src/components/Dashboard/SmartSuggestionCard.tsx`

**Interfaces:**
- Consumes: `candidate: RecommendationCandidate`, `onApprove`, `onReject`, `onOpenSettings`
- Produces: Recommendation card with rationale badge (*"Recommended: High afternoon reading affinity"*), duration estimate, Approve (Enter) and Reject / Show Another (R) triggers.

- [ ] **Step 1: Implement `src/components/Dashboard/SmartSuggestionCard.tsx`**
- Display candidate title, domain, estimated duration, category tag, and explanation badge.
- Interactive **Approve Button** (`Enter` / click): launches link, plays rewarding feedback, records positive reward.
- Interactive **Reject Button** (`R` / `Show Another`): applies penalty, smoothly animates to the next best candidate.
- Fallback prompt if local library exhausted with optional OpenRouter trigger.

- [ ] **Step 2: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 6: Settings Modal Configuration & Algorithm Insights

**Files:**
- Modify: `src/components/Modals/SettingsModal.tsx`

**Interfaces:**
- Consumes: `appData`, `onUpdateAppData`
- Produces: Day Schedule inputs (`Day Start`, `Day End`), OpenRouter API settings (`API Key`, `Model`, `Daily Limit`), Algorithm Insights panel (view learned top tags/categories & reset weights button).

- [ ] **Step 1: Add Day Schedule Settings**
Inputs for bedtime/cutoff hour (e.g. `22:00` / 10 PM) and wake hour.

- [ ] **Step 2: Add OpenRouter API Settings**
Input for optional OpenRouter API key, model choice, daily request limit, and toggle.

- [ ] **Step 3: Add Algorithm Learning Insights Panel**
Display what the local engine has learned about user preferences (top approved categories, top tags) with a one-click *"Reset Learning Weights"* button.

- [ ] **Step 4: Verify with build**
Run: `npm run build`
Expected: PASS with 0 errors.

---

### Task 7: Master App Coordination & Context-Aware Intercept Integration

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: All widgets, storage, and recommender engines
- Produces: Full coordinated reactive dashboard

- [ ] **Step 1: Connect Time Radar and Smart Suggestion Engine in `src/App.tsx`**
- Auto-calculate live time budget every 60 seconds.
- If pending tasks > 0: Display **Work Intercept & Time Radar** to keep user focused.
- If pending tasks == 0 or user is in free time: Display **Smart Suggestion Engine**.
- Hook up Approve and Reject handlers to update learned preferences in `localStorage`.

- [ ] **Step 2: Run build and preview verification**
Run: `npm run build`
Run Playwright end-to-end tests to verify Time Radar, Task durations, and Approve/Reject suggestions loop.

- [ ] **Step 3: Commit and generate Walkthrough**

---

## Execution Options

Plan complete and saved to [`docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md`](file:///C:/Users/AGP/Documents/Projects/LaunchPAD/docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md).

Two execution options:
1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like to take?
