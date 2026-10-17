# Graph Report - LaunchPAD  (2026-10-17)

## Corpus Check
- 93 files · ~101,318 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 692 nodes · 1658 edges · 33 communities (23 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf4e4176`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- App.tsx
- TaskManagementScreen.tsx
- QuickNote
- Sidebar.tsx
- package.json
- bookmarkParser.ts
- SettingsModal.tsx
- taskUrgency.test.ts
- CommitmentRadarWidget.test.ts
- taskUrgency.ts
- compilerOptions
- background.js
- manifest.json
- PrimaryFocusCard.test.ts
- types/index.ts
- Intelligent Focus Engine Plan
- QuickActionsCard.test.ts
- compilerOptions
- generate_launchpad_icon
- AGENTS Governance Instructions
- Progressive Disclosure Favicon Grid Plan
- Build Job
- Verified Dashboard Class Link UI
- Verified Dashboard Focus Workspace UI
- Extension Popup UI
- popup.js
- Time Snatch Extension README
- LaunchPad Web App Shell
- LaunchPad Rocket Favicon Icon

## God Nodes (most connected - your core abstractions)
1. `App()` - 61 edges
2. `react` - 38 edges
3. `lucide-react` - 36 edges
4. `Folder` - 36 edges
5. `LinkItem` - 35 edges
6. `QuickNote` - 25 edges
7. `motion` - 17 edges
8. `PrimaryFocusCard()` - 16 edges
9. `compilerOptions` - 16 edges
10. `DailyGrowthRecord` - 15 edges

## Surprising Connections (you probably didn't know these)
- `SmartSuggestionCard()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/SmartSuggestionCard.tsx → .agents/rules/dashboard-ux.md
- `FocusHeroBanner()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/FocusHeroBanner.tsx → .agents/rules/dashboard-ux.md
- `TimeRadarWidget()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/TimeRadarWidget.tsx → .agents/rules/dashboard-ux.md
- `Daily Focus Intention` --conceptually_related_to--> `Contextual Intercept Focus System`  [INFERRED]
  README.md → docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md
- `QuickNotesWidgetProps` --references--> `QuickNote`  [EXTRACTED]
  src/components/QuickNotes/QuickNotesWidget.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (33 total, 10 thin omitted)

### Community 0 - "react"
Cohesion: 0.08
Nodes (56): lucide-react, motion, react, react-dom, FaviconImage(), FaviconImageProps, SmartSuggestionCard(), CategorySection() (+48 more)

### Community 1 - "App.tsx"
Cohesion: 0.07
Nodes (55): delWith, delWithout, hiddenWith, hiddenWithout, initialFolders, initialLinks, treeVisible, treeWith (+47 more)

### Community 2 - "TaskManagementScreen.tsx"
Cohesion: 0.09
Nodes (38): CalendarScheduleTimelineProps, SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent() (+30 more)

### Community 3 - "QuickNote"
Cohesion: 0.08
Nodes (42): CommitmentRadarWidgetProps, getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory, mockTasks (+34 more)

### Community 4 - "Sidebar.tsx"
Cohesion: 0.07
Nodes (45): BookmarkRow(), isValidUrl(), MenuBtn(), StarDot(), ActivePill(), FolderTreeItem(), FolderTreeItemProps, NOOP_BOOKMARK (+37 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): dependencies, clsx, lucide-react, motion, react, react-dom, tailwind-merge, devDependencies (+34 more)

### Community 6 - "bookmarkParser.ts"
Cohesion: 0.12
Nodes (24): BookmarkClassificationConfidence, BookmarkClassificationResult, ImportBookmarkResult, ParsedBookmark, classifyBookmark(), DEFAULT_DOMAIN_CATEGORY_RULES, DEFAULT_KEYWORD_CATEGORY_RULES, extractHostname() (+16 more)

### Community 7 - "SettingsModal.tsx"
Cohesion: 0.13
Nodes (29): SettingsModal(), SettingsModalProps, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, DEFAULT_SEED_DATA, classifyGoogleApiError(), classifyTokenResponseError() (+21 more)

### Community 8 - "taskUrgency.test.ts"
Cohesion: 0.05
Nodes (37): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+29 more)

### Community 9 - "CommitmentRadarWidget.test.ts"
Cohesion: 0.10
Nodes (27): CommitmentRadarWidget(), formatTaskCountdown(), RadarViewMode, countdownAi, countdownDsc, countdownEcon, countdownExcel, countdownNoDeadline (+19 more)

### Community 10 - "taskUrgency.ts"
Cohesion: 0.12
Nodes (19): Subtask, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), computeSubtaskContainerState(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "background.js"
Cohesion: 0.14
Nodes (21): badgeTextFor(), broadcastBookmark(), deliverTaskToLaunchpad(), findLaunchpadTab(), forwardTimerCommand(), getBookmarkFolderHierarchy(), isLaunchpadUrl(), persistFocusState() (+13 more)

### Community 13 - "manifest.json"
Cohesion: 0.08
Nodes (23): action, default_icon, default_popup, default_title, background, service_worker, type, content_scripts (+15 more)

### Community 14 - "PrimaryFocusCard.test.ts"
Cohesion: 0.11
Nodes (15): afterACompleted, afterAllCompleted, allCompletedQueue, collapsedState, defaultPick, expandedState, explicitPick, mockSubtasks (+7 more)

### Community 15 - "types/index.ts"
Cohesion: 0.10
Nodes (30): Focus Dashboard UX Heuristics, CONFETTI_COLORS, ConfettiOverlay(), ConfettiOverlayProps, rand(), STYLE_ICON, FocusHeroBanner(), FocusHeroBannerProps (+22 more)

### Community 16 - "Intelligent Focus Engine Plan"
Cohesion: 0.25
Nodes (8): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad, Time Snatch Extension Integration

### Community 17 - "QuickActionsCard.test.ts"
Cohesion: 0.32
Nodes (4): QuickActionsCard(), QuickActionsCardProps, expectedActions, propsTest

### Community 18 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 20 - "AGENTS Governance Instructions"
Cohesion: 0.50
Nodes (4): AGENTS Governance Instructions, Subagent Execution Policy, CLAUDE Architectural Guidelines, Cline Rules Project Context

### Community 21 - "Progressive Disclosure Favicon Grid Plan"
Cohesion: 0.67
Nodes (3): Domain Nesting & Auto-Clustering, Floating Hover Preview Cards, Progressive Disclosure Favicon Grid Plan

### Community 22 - "Build Job"
Cohesion: 1.00
Nodes (3): Build Job, Deploy Job, Deploy to GitHub Pages Workflow

### Community 28 - "popup.js"
Cohesion: 0.39
Nodes (5): currentElapsed(), formatElapsed(), refreshFocus(), renderFocus(), sendTimerCommand()

## Knowledge Gaps
- **26 isolated node(s):** `clsx`, `tailwind-merge`, `@tailwindcss/container-queries`, `@types/node`, `@types/react` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 300 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `TaskManagementScreen.tsx`, `QuickNote`, `Sidebar.tsx`, `package.json`, `SettingsModal.tsx`, `CommitmentRadarWidget.test.ts`, `types/index.ts`, `QuickActionsCard.test.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `clsx`, `tailwind-merge`, `@tailwindcss/container-queries` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08144144144144144 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `App.tsx`, `TaskManagementScreen.tsx`, `QuickNote`, `Sidebar.tsx`, `package.json`, `SettingsModal.tsx`, `CommitmentRadarWidget.test.ts`, `types/index.ts`, `QuickActionsCard.test.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `QuickNote` to `App.tsx`, `TaskManagementScreen.tsx`, `taskUrgency.test.ts`, `CommitmentRadarWidget.test.ts`, `taskUrgency.ts`, `PrimaryFocusCard.test.ts`, `types/index.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `TaskManagementScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08672699849170437 - nodes in this community are weakly interconnected._