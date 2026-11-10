# Graph Report - LaunchPAD  (2026-11-10)

## Corpus Check
- 106 files · ~218,758 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .css 2, .woff2 1)

## Summary
- 870 nodes · 1817 edges · 50 communities (41 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dbef1cf2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TaskManagementScreen.tsx
- App.tsx
- expressions
- types/index.ts
- LaunchpadPet.tsx
- package.json
- react
- SettingsScreen.tsx
- taskUrgency.test.ts
- CommitmentRadarWidget.test.ts
- taskUrgency.ts
- compilerOptions
- taskPeriod.test.ts
- recommender.ts
- calculateTaskUrgency
- QuickNote
- Intelligent Focus Engine Plan
- usePetMotion.ts
- compilerOptions
- AGENTS Governance Instructions
- Progressive Disclosure Favicon Grid Plan
- Build Job
- Verified Dashboard Class Link UI
- Verified Dashboard Focus Workspace UI
- generateMascotAssets.js
- cloudWorkspace.ts
- test-folder-actions.ts
- LaunchPad Web App Shell
- LaunchPad Rocket Favicon Icon
- QuickActionsCard.test.ts
- Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)
- MockLocalStorage
- pivots
- sizingGuidance
- PrimaryFocusCard.tsx
- dashboardTodayScope.test.ts
- palette
- specification
- manifest.json
- files
- parts
- LaunchPAD cloud workspaces
- storage.ts
- CloudWorkspaceSettings.tsx
- leftFin
- rightEye

## God Nodes (most connected - your core abstractions)
1. `App()` - 49 edges
2. `react` - 41 edges
3. `QuickNote` - 35 edges
4. `@phosphor-icons/react` - 27 edges
5. `compilerOptions` - 16 edges
6. `calculateTaskUrgency()` - 15 edges
7. `DailyGrowthRecord` - 15 edges
8. `PrimaryFocusCard` - 14 edges
9. `formatApproximateDuration()` - 12 edges
10. `formatMinutesToHours()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `TimeRadarWidget` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/TimeRadarWidget.tsx → .agents/rules/dashboard-ux.md
- `SmartSuggestionCard()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/SmartSuggestionCard.tsx → .agents/rules/dashboard-ux.md
- `FocusHeroBanner()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/FocusHeroBanner.tsx → .agents/rules/dashboard-ux.md
- `Daily Focus Intention` --conceptually_related_to--> `Contextual Intercept Focus System`  [INFERRED]
  README.md → docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md
- `QuickNotesWidgetProps` --references--> `QuickNote`  [EXTRACTED]
  src/components/QuickNotes/QuickNotesWidget.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (50 total, 9 thin omitted)

### Community 0 - "TaskManagementScreen.tsx"
Cohesion: 0.06
Nodes (55): Focus Dashboard UX Heuristics, motion, @phosphor-icons/react, FaviconImage(), FaviconImageProps, FocusHeroBanner(), FocusHeroBannerProps, SmartSuggestionCard() (+47 more)

### Community 1 - "App.tsx"
Cohesion: 0.12
Nodes (26): App(), GrowthMasteryScreen, SettingsScreen, TaskManagementScreen, prompts, TaskClearReflection(), words(), Header() (+18 more)

### Community 2 - "expressions"
Cohesion: 0.18
Nodes (11): calm, curious, determined, disappointed, excited, focused, happy, sleepy (+3 more)

### Community 3 - "types/index.ts"
Cohesion: 0.06
Nodes (61): getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory, mockTasks, propsTest (+53 more)

### Community 4 - "LaunchpadPet.tsx"
Cohesion: 0.08
Nodes (35): LaunchpadPetComponent(), LaunchpadPetProps, STATE_QUOTE_CATEGORY_MAP, getPetQuote(), QUOTE_LIBRARY, QuoteCategory, recentHistory, resetQuoteHistory() (+27 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (46): dependencies, clsx, motion, @phosphor-icons/react, react, react-dom, @supabase/supabase-js, tailwind-merge (+38 more)

### Community 6 - "react"
Cohesion: 0.08
Nodes (40): react, react-dom, Eye(), Mascot, MascotComponent(), MascotProps, Mouth(), SparkleStar() (+32 more)

### Community 7 - "SettingsScreen.tsx"
Cohesion: 0.33
Nodes (7): COLORS, ConfettiOverlay(), SettingsScreen(), ConfettiStyle, exportDataAsJson(), getStorageMetrics(), importDataFromJson()

### Community 8 - "taskUrgency.test.ts"
Cohesion: 0.05
Nodes (37): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+29 more)

### Community 9 - "CommitmentRadarWidget.test.ts"
Cohesion: 0.11
Nodes (14): countdown2d12h, countdown4mo12d, countdownAi, countdownDsc, countdownEcon, countdownExcel, countdownNoDeadline, countdownSpanish (+6 more)

### Community 10 - "taskUrgency.ts"
Cohesion: 0.12
Nodes (19): Subtask, TaskPriority, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "taskPeriod.test.ts"
Cohesion: 0.06
Nodes (48): useTaskView(), addDays(), DateRange, deadlineDate(), defaultPeriodRange(), getTaskPeriod(), isValidLocalDate(), localDate() (+40 more)

### Community 13 - "recommender.ts"
Cohesion: 0.15
Nodes (12): CURATED_FOCUS_SUGGESTIONS, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, INITIAL_EMPTY_DATA, LearnedPreferences, TimeOfDayBucket, generateCandidatePool() (+4 more)

### Community 14 - "calculateTaskUrgency"
Cohesion: 0.36
Nodes (8): CommitmentRadarWidget, truncateText(), resolveActiveTask(), TaskPreviewPopUp(), calculateTaskUrgency(), formatTaskCountdown(), parseTaskDeadline(), projectTasksToRadarCoordinates()

### Community 15 - "QuickNote"
Cohesion: 0.18
Nodes (13): CommitmentRadarWidgetProps, RadarPeriod, RadarViewMode, TIER_PRESENTATION_MAP, TierPresentation, TaskPreviewPopUpProps, QuickNote, RADAR_RINGS (+5 more)

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

### Community 27 - "generateMascotAssets.js"
Cohesion: 0.11
Nodes (17): buildMascotSvg(), __dirname, expressions, __filename, getDefs(), manifestJson, neutralSvg, outDir (+9 more)

### Community 28 - "cloudWorkspace.ts"
Cohesion: 0.19
Nodes (20): @supabase/supabase-js, SettingsScreenProps, cacheKey(), clearCloudWorkspaceData(), clients, cloudData(), CloudProject, CloudRecord (+12 more)

### Community 29 - "test-folder-actions.ts"
Cohesion: 0.17
Nodes (9): delWith, delWithout, hiddenWith, hiddenWithout, initialFolders, initialLinks, treeVisible, treeWith (+1 more)

### Community 33 - "QuickActionsCard.test.ts"
Cohesion: 0.32
Nodes (4): QuickActionsCard(), QuickActionsCardProps, expectedActions, propsTest

### Community 34 - "Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)"
Cohesion: 0.29
Nodes (6): 1. Executive Summary & Goals, 2. Stack & Architecture Rationale, 3. Resolved Decisions (from User Consultation), 4. Explicit Non-Goals, 5. Open Risks & Mitigation, Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)

### Community 36 - "pivots"
Cohesion: 0.15
Nodes (13): x, y, x, y, x, y, pivots, bodyCenter (+5 more)

### Community 37 - "sizingGuidance"
Cohesion: 0.11
Nodes (19): size, usage, size, usage, size, usage, size, usage (+11 more)

### Community 38 - "PrimaryFocusCard.tsx"
Cohesion: 0.05
Nodes (50): SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent(), PrimaryFocusCard (+42 more)

### Community 39 - "dashboardTodayScope.test.ts"
Cohesion: 0.10
Nodes (18): allNotes, dueToday, dueTodayIds, emptyActive, emptyNotes, emptyToday, futureTask, futureUrgency (+10 more)

### Community 40 - "palette"
Cohesion: 0.22
Nodes (9): palette, ambientGlow, baseOrange, eyeDark, eyeHighlight, finOrange, highlight, shadow (+1 more)

### Community 41 - "specification"
Cohesion: 0.29
Nodes (7): specification, body, character, face, fins, limbs, purity

### Community 42 - "manifest.json"
Cohesion: 0.33
Nodes (5): aspectRatio, description, name, version, viewBox

### Community 43 - "files"
Cohesion: 0.29
Nodes (7): files, canonicalNeutral, poses, focus, lowEnergy, returnAfterAway, taskCompletion

### Community 45 - "parts"
Cohesion: 0.33
Nodes (6): parts, body, eyesNeutral, leftFin, mouthSmile, rightFin

### Community 46 - "LaunchPAD cloud workspaces"
Cohesion: 0.50
Nodes (3): Add another project, LaunchPAD cloud workspaces, Sync behavior

### Community 48 - "storage.ts"
Cohesion: 0.20
Nodes (14): DEFAULT_SEED_DATA, clearAllLocalData(), isQuotaExceededError(), LEGACY_STORAGE_KEYS, loadAppData(), pruneExpendableData(), removeRetiredIntegrationCredentials(), sanitizeAppData() (+6 more)

### Community 49 - "CloudWorkspaceSettings.tsx"
Cohesion: 0.44
Nodes (9): WorkspaceApp(), restore(), CloudWorkspaceSettings(), CLOUD_PROJECTS_KEY, getCloudClient(), openCloudWorkspace(), readCloudProjects(), validateCloudProject() (+1 more)

### Community 51 - "leftFin"
Cohesion: 0.67
Nodes (3): x, y, leftFin

### Community 52 - "rightEye"
Cohesion: 0.67
Nodes (3): rightEye, x, y

## Knowledge Gaps
- **25 isolated node(s):** `clsx`, `tailwind-merge`, `@tailwindcss/container-queries`, `@types/node`, `@types/react` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 459 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `TaskManagementScreen.tsx`, `App.tsx`, `QuickActionsCard.test.ts`, `types/index.ts`, `LaunchpadPet.tsx`, `package.json`, `PrimaryFocusCard.tsx`, `SettingsScreen.tsx`, `taskPeriod.test.ts`, `QuickNote`, `CloudWorkspaceSettings.tsx`, `usePetMotion.ts`, `cloudWorkspace.ts`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **What connects `clsx`, `tailwind-merge`, `@tailwindcss/container-queries` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TaskManagementScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0578386605783866 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `QuickNote` to `TaskManagementScreen.tsx`, `App.tsx`, `types/index.ts`, `PrimaryFocusCard.tsx`, `dashboardTodayScope.test.ts`, `taskUrgency.test.ts`, `CommitmentRadarWidget.test.ts`, `taskUrgency.ts`, `taskPeriod.test.ts`, `recommender.ts`, `storage.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Why does `@phosphor-icons/react` connect `TaskManagementScreen.tsx` to `App.tsx`, `QuickActionsCard.test.ts`, `types/index.ts`, `package.json`, `PrimaryFocusCard.tsx`, `SettingsScreen.tsx`, `react`, `QuickNote`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06296656929568321 - nodes in this community are weakly interconnected._