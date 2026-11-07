# Graph Report - LaunchPAD  (2026-11-07)

## Corpus Check
- 101 files · ~233,676 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 832 nodes · 1794 edges · 48 communities (40 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e87964c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- App.tsx
- expressions
- types/index.ts
- LaunchpadPet.tsx
- package.json
- MascotShowcaseModal.tsx
- SettingsModal.tsx
- taskUrgency.test.ts
- CommitmentRadarWidget.test.ts
- taskUrgency.ts
- compilerOptions
- ticktickSyncManager.ts
- CommitmentRadarWidget.tsx
- PrimaryFocusCard.tsx
- timeBudget.ts
- Intelligent Focus Engine Plan
- usePetMotion.ts
- compilerOptions
- AGENTS Governance Instructions
- Progressive Disclosure Favicon Grid Plan
- Build Job
- Verified Dashboard Class Link UI
- Verified Dashboard Focus Workspace UI
- PetSprite.test.ts
- generateMascotAssets.js
- timeBudget.test.ts
- test-folder-actions.ts
- LaunchPad Web App Shell
- LaunchPad Rocket Favicon Icon
- QuickNote
- Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)
- MockLocalStorage
- pivots
- sizingGuidance
- MascotMotion.test.ts
- Mascot.tsx
- palette
- specification
- manifest.json
- PetSprite.tsx
- hero
- leftFin
- rightFin
- widget

## God Nodes (most connected - your core abstractions)
1. `App()` - 44 edges
2. `react` - 36 edges
3. `QuickNote` - 35 edges
4. `@phosphor-icons/react` - 28 edges
5. `PrimaryFocusCard` - 16 edges
6. `compilerOptions` - 16 edges
7. `DailyGrowthRecord` - 15 edges
8. `SettingsModal()` - 14 edges
9. `calculateTaskUrgency()` - 14 edges
10. `motion` - 13 edges

## Surprising Connections (you probably didn't know these)
- `SmartSuggestionCard()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/SmartSuggestionCard.tsx → .agents/rules/dashboard-ux.md
- `FocusHeroBanner()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/FocusHeroBanner.tsx → .agents/rules/dashboard-ux.md
- `TimeRadarWidget` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/TimeRadarWidget.tsx → .agents/rules/dashboard-ux.md
- `Daily Focus Intention` --conceptually_related_to--> `Contextual Intercept Focus System`  [INFERRED]
  README.md → docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md
- `resolveActiveTask()` --calls--> `calculateTaskUrgency()`  [EXTRACTED]
  src/components/Dashboard/PrimaryFocusCard.test.ts → src/utils/taskUrgency.ts

## Import Cycles
- None detected.

## Communities (48 total, 8 thin omitted)

### Community 0 - "react"
Cohesion: 0.07
Nodes (41): motion, @phosphor-icons/react, react, react-dom, CalendarScheduleTimeline(), CalendarScheduleTimelineProps, FaviconImage(), FaviconImageProps (+33 more)

### Community 1 - "App.tsx"
Cohesion: 0.07
Nodes (47): App(), ConfettiOverlay, GrowthMasteryScreen, SettingsModal, TaskManagementScreen, Header(), HeaderProps, BackupReminderToast() (+39 more)

### Community 2 - "expressions"
Cohesion: 0.08
Nodes (24): calm, curious, determined, disappointed, excited, focused, happy, sleepy (+16 more)

### Community 3 - "types/index.ts"
Cohesion: 0.06
Nodes (60): getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory, mockTasks, propsTest (+52 more)

### Community 4 - "LaunchpadPet.tsx"
Cohesion: 0.08
Nodes (31): LaunchpadPetComponent(), LaunchpadPetProps, STATE_QUOTE_CATEGORY_MAP, getPetQuote(), QUOTE_LIBRARY, QuoteCategory, recentHistory, resetQuoteHistory() (+23 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (45): dependencies, clsx, motion, @phosphor-icons/react, react, react-dom, tailwind-merge, devDependencies (+37 more)

### Community 6 - "MascotShowcaseModal.tsx"
Cohesion: 0.13
Nodes (17): manifestObj, manifestRaw, publicAssetsDir, requiredExpressions, requiredFiles, requiredPoses, MASCOT_ANIMATION_CONTRACT, MASCOT_EXPRESSIONS (+9 more)

### Community 7 - "SettingsModal.tsx"
Cohesion: 0.17
Nodes (22): SettingsModal(), classifyGoogleApiError(), classifyTokenResponseError(), extractPrimaryCalendarEmail(), fetchGoogleCalendarAccountEmail(), fetchTodayGoogleEvents(), fetchUserCalendarList(), getInMemoryGoogleToken() (+14 more)

### Community 8 - "taskUrgency.test.ts"
Cohesion: 0.05
Nodes (37): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+29 more)

### Community 9 - "CommitmentRadarWidget.test.ts"
Cohesion: 0.12
Nodes (13): countdownAi, countdownDsc, countdownEcon, countdownExcel, countdownNoDeadline, countdownSpanish, mockCalendarSummary, mockTasksImage1 (+5 more)

### Community 10 - "taskUrgency.ts"
Cohesion: 0.12
Nodes (18): Subtask, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown, OpportunityTag (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "ticktickSyncManager.ts"
Cohesion: 0.12
Nodes (40): SettingsModalProps, TickTickSettingsCard(), TickTickSettingsCardProps, TaskManagementScreenProps, buildUrl(), completeTask(), createTask(), DEFAULT_TICKTICK_PROXY (+32 more)

### Community 13 - "CommitmentRadarWidget.tsx"
Cohesion: 0.20
Nodes (15): CommitmentRadarWidget, formatTaskCountdown(), RadarViewMode, TIER_PRESENTATION_MAP, TierPresentation, truncateText(), TaskPreviewPopUp(), calculateTaskUrgency() (+7 more)

### Community 14 - "PrimaryFocusCard.tsx"
Cohesion: 0.06
Nodes (50): SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent(), PrimaryFocusCard (+42 more)

### Community 15 - "timeBudget.ts"
Cohesion: 0.18
Nodes (16): Focus Dashboard UX Heuristics, FocusHeroBanner(), FocusHeroBannerProps, mockBuffer, mockCalendarSummary, mockTaskLoad, mockTimeRemaining, testProps (+8 more)

### Community 16 - "Intelligent Focus Engine Plan"
Cohesion: 0.25
Nodes (8): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad, Time Snatch Extension Integration

### Community 17 - "usePetMotion.ts"
Cohesion: 0.21
Nodes (17): calculatePlacement(), calculateRoamTarget(), clampCoordinate(), DEFAULT_ROAM_RADIUS_PX, getDefaultPosition(), getScreenBounds(), loadSavedPosition(), MASCOT_BOUNDS (+9 more)

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

### Community 26 - "PetSprite.test.ts"
Cohesion: 0.14
Nodes (9): coffeeBreakVisual, __dirname, __filename, focusedVisual, petSpriteSource, sippingCoffeeVisual, __dirname, __filename (+1 more)

### Community 27 - "generateMascotAssets.js"
Cohesion: 0.17
Nodes (14): buildMascotSvg(), __dirname, expressions, __filename, getDefs(), manifestJson, neutralSvg, outDir (+6 more)

### Community 28 - "timeBudget.test.ts"
Cohesion: 0.17
Nodes (10): refDate, taskDue24h, taskDue26h, taskDue30m, taskDue5h, taskDue5h35m, taskOverdue26h, taskOverdue45m (+2 more)

### Community 29 - "test-folder-actions.ts"
Cohesion: 0.17
Nodes (9): delWith, delWithout, hiddenWith, hiddenWithout, initialFolders, initialLinks, treeVisible, treeWith (+1 more)

### Community 33 - "QuickNote"
Cohesion: 0.33
Nodes (6): CommitmentRadarWidgetProps, QuickNotesWidgetProps, TaskPreviewPopUpProps, QuickNote, RadarProjectedNode, RankedTaskOpportunity

### Community 34 - "Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)"
Cohesion: 0.29
Nodes (6): 1. Executive Summary & Goals, 2. Stack & Architecture Rationale, 3. Resolved Decisions (from User Consultation), 4. Explicit Non-Goals, 5. Open Risks & Mitigation, Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)

### Community 36 - "pivots"
Cohesion: 0.15
Nodes (13): x, y, x, y, x, y, pivots, bodyCenter (+5 more)

### Community 37 - "sizingGuidance"
Cohesion: 0.15
Nodes (13): size, usage, size, usage, size, usage, sizingGuidance, compact (+5 more)

### Community 38 - "MascotMotion.test.ts"
Cohesion: 0.17
Nodes (8): __dirname, __filename, longReturnDecision, majorDecision, mascotSource, petSpriteSource, routineDecision, shortReturnDecision

### Community 39 - "Mascot.tsx"
Cohesion: 0.36
Nodes (9): Eye(), MascotComponent(), MascotProps, Mouth(), SparkleStar(), EyeShape, MascotExpressionId, MascotPoseId (+1 more)

### Community 40 - "palette"
Cohesion: 0.22
Nodes (9): palette, ambientGlow, baseOrange, eyeDark, eyeHighlight, finOrange, highlight, shadow (+1 more)

### Community 41 - "specification"
Cohesion: 0.29
Nodes (7): specification, body, character, face, fins, limbs, purity

### Community 42 - "manifest.json"
Cohesion: 0.33
Nodes (5): aspectRatio, description, name, version, viewBox

### Community 43 - "PetSprite.tsx"
Cohesion: 0.53
Nodes (5): Mascot, MASCOT_PALETTE, getPetMotionClass(), PetSpriteComponent(), resolveMascotVisual()

### Community 44 - "hero"
Cohesion: 0.67
Nodes (3): size, usage, hero

### Community 45 - "leftFin"
Cohesion: 0.67
Nodes (3): x, y, leftFin

### Community 46 - "rightFin"
Cohesion: 0.67
Nodes (3): rightFin, x, y

### Community 47 - "widget"
Cohesion: 0.67
Nodes (3): widget, size, usage

## Knowledge Gaps
- **25 isolated node(s):** `clsx`, `tailwind-merge`, `@tailwindcss/container-queries`, `@types/node`, `@types/react` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 409 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `types/index.ts`, `LaunchpadPet.tsx`, `package.json`, `MascotShowcaseModal.tsx`, `SettingsModal.tsx`, `Mascot.tsx`, `PetSprite.tsx`, `ticktickSyncManager.ts`, `CommitmentRadarWidget.tsx`, `PrimaryFocusCard.tsx`, `timeBudget.ts`, `usePetMotion.ts`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `clsx`, `tailwind-merge`, `@tailwindcss/container-queries` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.06715063520871144 - nodes in this community are weakly interconnected._
- **Why does `@phosphor-icons/react` connect `react` to `App.tsx`, `types/index.ts`, `package.json`, `MascotShowcaseModal.tsx`, `SettingsModal.tsx`, `ticktickSyncManager.ts`, `CommitmentRadarWidget.tsx`, `PrimaryFocusCard.tsx`, `timeBudget.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `QuickNote` to `react`, `App.tsx`, `types/index.ts`, `taskUrgency.test.ts`, `CommitmentRadarWidget.test.ts`, `taskUrgency.ts`, `ticktickSyncManager.ts`, `CommitmentRadarWidget.tsx`, `PrimaryFocusCard.tsx`, `timeBudget.ts`, `timeBudget.test.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `expressions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._