# Graph Report - LaunchPAD  (2026-11-09)

## Corpus Check
- 112 files · ~238,472 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 886 nodes · 1936 edges · 51 communities (41 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d11f0342`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- motion.ts
- App.tsx
- expressions
- types/index.ts
- LaunchpadPet.tsx
- package.json
- Mascot.tsx
- SettingsModal.tsx
- taskUrgency.test.ts
- CommitmentRadarWidget.test.ts
- taskUrgency.ts
- compilerOptions
- ticktickSyncManager.ts
- TaskPreviewPopUp.tsx
- PrimaryFocusCard.test.ts
- QuickNote
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
- cloudWorkspace.ts
- test-folder-actions.ts
- LaunchPad Web App Shell
- LaunchPad Rocket Favicon Icon
- QuickActionsCard.test.ts
- Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)
- MockLocalStorage
- pivots
- sizingGuidance
- MascotMotion.test.ts
- Mascot.test.ts
- palette
- specification
- manifest.json
- files
- hero
- parts
- LaunchPAD cloud workspaces
- ticktick-proxy/package.json
- compact
- ticktick.js
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `App()` - 50 edges
2. `react` - 39 edges
3. `QuickNote` - 35 edges
4. `@phosphor-icons/react` - 28 edges
5. `compilerOptions` - 16 edges
6. `SettingsModal()` - 15 edges
7. `DailyGrowthRecord` - 15 edges
8. `PrimaryFocusCard` - 14 edges
9. `calculateTaskUrgency()` - 14 edges
10. `runVerification()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `SmartSuggestionCard()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/SmartSuggestionCard.tsx → .agents/rules/dashboard-ux.md
- `TimeRadarWidget` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/TimeRadarWidget.tsx → .agents/rules/dashboard-ux.md
- `FocusHeroBanner()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/FocusHeroBanner.tsx → .agents/rules/dashboard-ux.md
- `Daily Focus Intention` --conceptually_related_to--> `Contextual Intercept Focus System`  [INFERRED]
  README.md → docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md
- `TaskPreviewPopUpProps` --references--> `QuickNote`  [EXTRACTED]
  src/components/Tasks/TaskPreviewPopUp.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (51 total, 10 thin omitted)

### Community 0 - "motion.ts"
Cohesion: 0.10
Nodes (26): motion, react-dom, FaviconImage(), FaviconImageProps, SmartSuggestionCard(), SmartSuggestionCardProps, ConfirmDeleteModalProps, DURATION_PRESETS (+18 more)

### Community 1 - "App.tsx"
Cohesion: 0.07
Nodes (38): App(), GrowthMasteryScreen, SettingsModal, TaskManagementScreen, COLORS, ConfettiOverlay(), prompts, TaskClearReflection() (+30 more)

### Community 2 - "expressions"
Cohesion: 0.18
Nodes (11): calm, curious, determined, disappointed, excited, focused, happy, sleepy (+3 more)

### Community 3 - "types/index.ts"
Cohesion: 0.06
Nodes (63): @phosphor-icons/react, react, getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory (+55 more)

### Community 4 - "LaunchpadPet.tsx"
Cohesion: 0.08
Nodes (34): LaunchpadPetComponent(), LaunchpadPetProps, STATE_QUOTE_CATEGORY_MAP, getPetQuote(), QUOTE_LIBRARY, QuoteCategory, recentHistory, resetQuoteHistory() (+26 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (46): dependencies, clsx, motion, @phosphor-icons/react, react, react-dom, @supabase/supabase-js, tailwind-merge (+38 more)

### Community 6 - "Mascot.tsx"
Cohesion: 0.17
Nodes (20): Eye(), MascotComponent(), MascotProps, Mouth(), SparkleStar(), EyeShape, MASCOT_ANIMATION_CONTRACT, MASCOT_EXPRESSIONS (+12 more)

### Community 7 - "SettingsModal.tsx"
Cohesion: 0.16
Nodes (24): SettingsModal(), Mascot, MascotShowcaseModal(), classifyGoogleApiError(), classifyTokenResponseError(), extractPrimaryCalendarEmail(), fetchGoogleCalendarAccountEmail(), fetchTodayGoogleEvents() (+16 more)

### Community 8 - "taskUrgency.test.ts"
Cohesion: 0.05
Nodes (37): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+29 more)

### Community 9 - "CommitmentRadarWidget.test.ts"
Cohesion: 0.10
Nodes (22): CommitmentRadarWidgetProps, RadarViewMode, countdownAi, countdownDsc, countdownEcon, countdownExcel, countdownNoDeadline, countdownSpanish (+14 more)

### Community 10 - "taskUrgency.ts"
Cohesion: 0.12
Nodes (18): Subtask, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown, OpportunityTag (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "ticktickSyncManager.ts"
Cohesion: 0.13
Nodes (38): TickTickSettingsCard(), buildUrl(), completeTask(), createTask(), DEFAULT_TICKTICK_PROXY, deleteTask(), getDefaultTickTickProxy(), getProjects() (+30 more)

### Community 13 - "TaskPreviewPopUp.tsx"
Cohesion: 0.25
Nodes (10): CommitmentRadarWidget, formatTaskCountdown(), truncateText(), resolveActiveTask(), TaskPreviewPopUp(), TaskPreviewPopUpProps, calculateTaskUrgency(), formatTaskCountdown() (+2 more)

### Community 14 - "PrimaryFocusCard.test.ts"
Cohesion: 0.07
Nodes (43): SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent(), PrimaryFocusCard (+35 more)

### Community 15 - "QuickNote"
Cohesion: 0.08
Nodes (40): Focus Dashboard UX Heuristics, CalendarScheduleTimeline(), CalendarScheduleTimelineProps, FocusHeroBanner(), FocusHeroBannerProps, mockBuffer, mockCalendarSummary, mockTaskLoad (+32 more)

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

### Community 28 - "cloudWorkspace.ts"
Cohesion: 0.09
Nodes (45): @supabase/supabase-js, WorkspaceApp(), restore(), CloudWorkspaceSettings(), SettingsModalProps, DEFAULT_SEED_DATA, ACTIVE_CLOUD_KEY, cacheKey() (+37 more)

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
Cohesion: 0.11
Nodes (19): x, y, x, y, x, y, x, y (+11 more)

### Community 37 - "sizingGuidance"
Cohesion: 0.15
Nodes (13): size, usage, size, usage, sizingGuidance, expanded, micro, standard (+5 more)

### Community 38 - "MascotMotion.test.ts"
Cohesion: 0.17
Nodes (8): __dirname, __filename, longReturnDecision, majorDecision, mascotSource, petSpriteSource, routineDecision, shortReturnDecision

### Community 39 - "Mascot.test.ts"
Cohesion: 0.25
Nodes (6): manifestObj, manifestRaw, publicAssetsDir, requiredExpressions, requiredFiles, requiredPoses

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

### Community 44 - "hero"
Cohesion: 0.67
Nodes (3): size, usage, hero

### Community 45 - "parts"
Cohesion: 0.33
Nodes (6): parts, body, eyesNeutral, leftFin, mouthSmile, rightFin

### Community 46 - "LaunchPAD cloud workspaces"
Cohesion: 0.50
Nodes (3): Add another project, LaunchPAD cloud workspaces, Sync behavior

### Community 47 - "ticktick-proxy/package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 48 - "compact"
Cohesion: 0.67
Nodes (3): size, usage, compact

## Knowledge Gaps
- **25 isolated node(s):** `clsx`, `tailwind-merge`, `@tailwindcss/container-queries`, `@types/node`, `@types/react` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 431 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `types/index.ts` to `motion.ts`, `App.tsx`, `QuickActionsCard.test.ts`, `LaunchpadPet.tsx`, `package.json`, `Mascot.tsx`, `SettingsModal.tsx`, `CommitmentRadarWidget.test.ts`, `ticktickSyncManager.ts`, `TaskPreviewPopUp.tsx`, `PrimaryFocusCard.test.ts`, `QuickNote`, `usePetMotion.ts`, `cloudWorkspace.ts`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `clsx`, `tailwind-merge`, `@tailwindcss/container-queries` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `motion.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0957983193277311 - nodes in this community are weakly interconnected._
- **Why does `@phosphor-icons/react` connect `types/index.ts` to `motion.ts`, `App.tsx`, `QuickActionsCard.test.ts`, `package.json`, `Mascot.tsx`, `SettingsModal.tsx`, `CommitmentRadarWidget.test.ts`, `ticktickSyncManager.ts`, `TaskPreviewPopUp.tsx`, `PrimaryFocusCard.test.ts`, `QuickNote`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07330827067669173 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `QuickNote` to `App.tsx`, `types/index.ts`, `taskUrgency.test.ts`, `CommitmentRadarWidget.test.ts`, `taskUrgency.ts`, `ticktickSyncManager.ts`, `TaskPreviewPopUp.tsx`, `PrimaryFocusCard.test.ts`, `cloudWorkspace.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06234177215189873 - nodes in this community are weakly interconnected._