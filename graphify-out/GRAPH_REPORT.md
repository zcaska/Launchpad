# Graph Report - LaunchPAD  (2026-11-26)

## Corpus Check
- 203 files · ~500,031 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 4, (none) 3, .ttf 2)

## Summary
- 1527 nodes · 3375 edges · 83 communities (73 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dbae01db`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- timeBudget.ts
- App.tsx
- expressions
- GrowthMasteryScreen.tsx
- petState.ts
- package.json
- Mascot.tsx
- SettingsScreen.tsx
- taskUrgency.test.ts
- CommitmentRadarWidget.test.ts
- taskUrgency.ts
- compilerOptions
- taskPeriod.test.ts
- seedData.ts
- taskReflection.test.ts
- TaskManagementScreen.tsx
- Intelligent Focus Engine Plan
- usePetMotion.ts
- compilerOptions
- AGENTS Governance Instructions
- Progressive Disclosure Favicon Grid Plan
- Build Job
- Verified Dashboard Class Link UI
- Verified Dashboard Focus Workspace UI
- cloudWorkspace.test.ts
- generateMascotAssets.js
- cloudWorkspace.ts
- test-folder-actions.ts
- LaunchPad Web App Shell
- LaunchPad Rocket Favicon Icon
- QuickActionsCard.test.ts
- Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)
- backupReminder.test.ts
- pivots
- sizingGuidance
- PrimaryFocusCard.tsx
- dashboardTodayScope.test.ts
- palette
- specification
- manifest.json
- parts
- taskListProjection.test.ts
- ActualTimeDialog.test.tsx
- LaunchPAD cloud workspaces
- CastlePanel.tsx
- storage.ts
- CloudWorkspaceSettings.tsx
- castleModel.ts
- react
- castleEconomy.test.ts
- castlePartPreviewRenderer.ts
- castleEconomy.ts
- castleBlueprint.ts
- taskDialog.test.tsx
- CastleScene.test.tsx
- LaunchpadPet.tsx
- PrimaryFocusCard.test.ts
- sphere
- taskReflection.ts
- castleJourney.test.ts
- castlePersistence.test.ts
- taskCompletion.ts
- timeBudget.test.ts
- castleFixture.tsx
- castleModel.test.ts
- WorkspaceRecoveryNotice.tsx
- taskPeriod.ts
- MomentumCard.test.ts
- PetSprite.tsx
- gamification.ts
- types/index.ts
- ref_node_assert
- favicon.ts
- Sidebar.tsx
- petEvolution.test.ts
- Castle accountability: working specification
- Year-long 3D castle correction

## God Nodes (most connected - your core abstractions)
1. `App()` - 66 edges
2. `react` - 53 edges
3. `QuickNote` - 49 edges
4. `@phosphor-icons/react` - 28 edges
5. `box()` - 25 edges
6. `formatDateKey()` - 25 edges
7. `CastlePanel()` - 24 edges
8. `useCloudSync()` - 18 edges
9. `AppData` - 17 edges
10. `PrimaryFocusCard` - 16 edges

## Surprising Connections (you probably didn't know these)
- `SmartSuggestionCard()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/SmartSuggestionCard.tsx → .agents/rules/dashboard-ux.md
- `FocusHeroBanner()` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/FocusHeroBanner.tsx → .agents/rules/dashboard-ux.md
- `TimeRadarWidget` --references--> `Context-Scoped Overview Widgets`  [EXTRACTED]
  src/components/Dashboard/TimeRadarWidget.tsx → .agents/rules/dashboard-ux.md
- `Fixture()` --calls--> `CastlePanel()`  [EXTRACTED]
  tests/castleFixture.tsx → src/components/Growth/CastlePanel.tsx
- `client` --indirect_call--> `row()`  [INFERRED]
  src/services/cloudWorkspace.test.ts → src/components/Growth/castleModel.ts

## Import Cycles
- None detected.

## Communities (83 total, 10 thin omitted)

### Community 0 - "timeBudget.ts"
Cohesion: 0.17
Nodes (16): Focus Dashboard UX Heuristics, FocusHeroBanner(), FocusHeroBannerProps, statusText, mockBuffer, mockTaskLoad, mockTimeRemaining, testProps (+8 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (22): App(), castleGuidance, GrowthMasteryScreen, SettingsScreen, TaskManagementScreen, SmartSuggestionCard(), Header(), BackupReminderToast() (+14 more)

### Community 2 - "expressions"
Cohesion: 0.18
Nodes (11): calm, curious, determined, disappointed, excited, focused, happy, sleepy (+3 more)

### Community 3 - "GrowthMasteryScreen.tsx"
Cohesion: 0.15
Nodes (21): CastleOperation, getBadgeSrc(), GrowthMasteryScreen(), GrowthMasteryScreenProps, HorizonTab, calculateHeatmapIntensity(), HeatmapDay, IntensityLevel (+13 more)

### Community 4 - "petState.ts"
Cohesion: 0.14
Nodes (21): LaunchpadPetProps, PetSpriteProps, Continuity, PetController, PetControllerOptions, readContinuity(), usePetController(), writeContinuity() (+13 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (47): dependencies, clsx, motion, @phosphor-icons/react, react, react-dom, @supabase/supabase-js, tailwind-merge (+39 more)

### Community 6 - "Mascot.tsx"
Cohesion: 0.12
Nodes (26): Eye(), MascotComponent(), MascotProps, Mouth(), SparkleStar(), manifestObj, manifestRaw, publicAssetsDir (+18 more)

### Community 7 - "SettingsScreen.tsx"
Cohesion: 0.33
Nodes (8): COLORS, ConfettiOverlay(), SettingsScreen(), Mascot, MascotShowcaseModal(), ConfettiStyle, changeDailyGoal(), getStorageMetrics()

### Community 8 - "taskUrgency.test.ts"
Cohesion: 0.05
Nodes (37): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+29 more)

### Community 9 - "CommitmentRadarWidget.test.ts"
Cohesion: 0.08
Nodes (30): CommitmentRadarWidget, CommitmentRadarWidgetProps, RadarPeriod, RadarViewMode, countdown2d12h, countdown4mo12d, countdownAi, countdownDsc (+22 more)

### Community 10 - "taskUrgency.ts"
Cohesion: 0.11
Nodes (20): Subtask, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), computeSubtaskContainerState(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown (+12 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "taskPeriod.test.ts"
Cohesion: 0.08
Nodes (23): customRange, dec31, feb29, futureRange, inverted, invertedResult, jan15End, jan31 (+15 more)

### Community 13 - "seedData.ts"
Cohesion: 0.16
Nodes (9): CURATED_FOCUS_SUGGESTIONS, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, INITIAL_EMPTY_DATA, LearnedPreferences, TimeOfDayBucket, getRankedRecommendations() (+1 more)

### Community 14 - "taskReflection.test.ts"
Cohesion: 0.02
Nodes (112): abandoned, actions, actuallyLate, afterCancel, aheadOfClockData, alreadyCounted, alreadySettled, answers (+104 more)

### Community 15 - "TaskManagementScreen.tsx"
Cohesion: 0.13
Nodes (21): PendingTaskCompletion, DURATION_OPTIONS, QuickNotesWidget(), QuickNotesWidgetProps, TaskRow, taskTabCount(), TaskScreenFixture(), TaskManagementScreen() (+13 more)

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

### Community 26 - "cloudWorkspace.test.ts"
Cohesion: 0.03
Nodes (56): anotherEdit, cache, cleanWorkspace, client, completed, delayed, desktop, deviceLocal (+48 more)

### Community 27 - "generateMascotAssets.js"
Cohesion: 0.11
Nodes (17): buildMascotSvg(), __dirname, expressions, __filename, getDefs(), manifestJson, neutralSvg, outDir (+9 more)

### Community 28 - "cloudWorkspace.ts"
Cohesion: 0.12
Nodes (39): SettingsScreenProps, ACTIVE_CLOUD_KEY, applyRemoteData(), applyRemoteTasks, cacheKey(), clearCloudWorkspaceData(), clients, CLOUD_PROJECTS_KEY (+31 more)

### Community 29 - "test-folder-actions.ts"
Cohesion: 0.17
Nodes (9): delWith, delWithout, hiddenWith, hiddenWithout, initialFolders, initialLinks, treeVisible, treeWith (+1 more)

### Community 33 - "QuickActionsCard.test.ts"
Cohesion: 0.32
Nodes (4): QuickActionsCard(), QuickActionsCardProps, expectedActions, propsTest

### Community 34 - "Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)"
Cohesion: 0.29
Nodes (6): 1. Executive Summary & Goals, 2. Stack & Architecture Rationale, 3. Resolved Decisions (from User Consultation), 4. Explicit Non-Goals, 5. Open Risks & Mitigation, Project Brief — LaunchPad Experiment: Focus-First & Smart Suggest (No Bookmarks)

### Community 35 - "backupReminder.test.ts"
Cohesion: 0.13
Nodes (10): dismissalKey(), dismissBackupReminder(), inMemoryDismissals, isBackupReminderDismissed(), blockedCycle, firstReminderCycle, nextReminderCycle, originalWindow (+2 more)

### Community 36 - "pivots"
Cohesion: 0.11
Nodes (19): x, y, x, y, x, y, x, y (+11 more)

### Community 37 - "sizingGuidance"
Cohesion: 0.11
Nodes (19): size, usage, size, usage, size, usage, size, usage (+11 more)

### Community 38 - "PrimaryFocusCard.tsx"
Cohesion: 0.19
Nodes (22): @phosphor-icons/react, SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent() (+14 more)

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

### Community 43 - "parts"
Cohesion: 0.15
Nodes (13): files, canonicalNeutral, parts, poses, body, eyesNeutral, leftFin, mouthSmile (+5 more)

### Community 44 - "taskListProjection.test.ts"
Cohesion: 0.06
Nodes (43): classifyDeadline(), DeadlineClock, deadlineLabel(), DeadlineStatus, FilterTab, isDueSoon(), matchesQuery(), priorityFilters (+35 more)

### Community 45 - "ActualTimeDialog.test.tsx"
Cohesion: 0.11
Nodes (28): clockMarks, DurationDial(), DurationDialProps, DurationUnit, EstimatedDurationPickerProps, ActualTimeDialog(), ActualTimeDialogProps, durationError() (+20 more)

### Community 46 - "LaunchPAD cloud workspaces"
Cohesion: 0.40
Nodes (4): Add another project, Enable public registration for the shared project, LaunchPAD cloud workspaces, Sync behavior

### Community 47 - "CastlePanel.tsx"
Cohesion: 0.10
Nodes (27): CASTLE_CATALOG, CASTLE_CATALOG_IDS, CastleDialog, CastlePanel(), CastleStore(), categories, Category, District (+19 more)

### Community 48 - "storage.ts"
Cohesion: 0.10
Nodes (39): findDamagedData(), StorageRecovery(), DEFAULT_SEED_DATA, applyLocalClear(), backupListeners, BackupStatus, cancelPendingAppDataSave(), clearAllLocalData() (+31 more)

### Community 49 - "CloudWorkspaceSettings.tsx"
Cohesion: 0.44
Nodes (10): WorkspaceApp(), restore(), CloudWorkspaceSettings(), getCloudClient(), openCloudWorkspace(), readCloudProjects(), validateCloudProject(), flushAppDataSaveWithLock() (+2 more)

### Community 50 - "castleModel.ts"
Cohesion: 0.12
Nodes (29): arch(), bell(), box(), buttress(), CASTLE_ELEMENTS, elementsById, elevatedSites, elevateSite() (+21 more)

### Community 51 - "react"
Cohesion: 0.10
Nodes (22): motion, react, EstimatedDurationPicker(), PrimaryFocusCardProps, SmartSuggestionCardProps, BackupReminderToastProps, ConfirmDeleteModalProps, PRIORITY_OPTIONS (+14 more)

### Community 52 - "castleEconomy.test.ts"
Cohesion: 0.08
Nodes (27): commitTask(), substituteCommitment(), substituteWithOpenTasks(), afterClaim, castle, closedExempt, commitments, completed (+19 more)

### Community 54 - "castlePartPreviewRenderer.ts"
Cohesion: 0.11
Nodes (23): CastleShape, CastleVector, ModelPrimitive, drawCastlePartPreview(), getCastlePreview(), getPattern(), meshTriangles(), patternKeys (+15 more)

### Community 55 - "castleEconomy.ts"
Cohesion: 0.19
Nodes (24): appendEarning(), CastleMission, Commitment, dateNumber(), dayIsSettled(), describeOpenCommitment(), EconomyEntry, NewCommitment (+16 more)

### Community 56 - "castleBlueprint.ts"
Cohesion: 0.19
Nodes (16): canonicalPart(), checkDate(), getBlueprintLockReason(), getBlueprintPrice(), getBlueprintProgress(), getDisciplineDays(), getOwnedBlueprintIds(), legacyBlueprintIds (+8 more)

### Community 57 - "taskDialog.test.tsx"
Cohesion: 0.10
Nodes (12): HeaderProps, activeEstimate, create, details, documentStub, editor, editorProps, heading (+4 more)

### Community 58 - "CastleScene.test.tsx"
Cohesion: 0.15
Nodes (17): createCastleGeometry(), getCastleElementBounds(), getUnitBounds(), CASTLE_PARTS, all, boundedPan, empty, frame (+9 more)

### Community 59 - "LaunchpadPet.tsx"
Cohesion: 0.16
Nodes (14): LaunchpadPetComponent(), STATE_QUOTE_CATEGORY_MAP, getPetQuote(), QUOTE_LIBRARY, QuoteCategory, recentHistory, resetQuoteHistory(), categories (+6 more)

### Community 60 - "PrimaryFocusCard.test.ts"
Cohesion: 0.11
Nodes (15): afterACompleted, afterAllCompleted, allCompletedQueue, collapsedState, defaultPick, expandedState, explicitPick, mockSubtasks (+7 more)

### Community 61 - "sphere"
Cohesion: 0.31
Nodes (18): armillary(), brazier(), calico(), cone(), crown(), cylinder(), falcon(), head() (+10 more)

### Community 62 - "taskReflection.ts"
Cohesion: 0.30
Nodes (17): findReflectionCommitment(), partialProgressLedgerId(), tasksDueToday(), applyCompletedTaskReflection(), applyPartialTaskReflection(), canRegisterReflectionTasks(), currentDayWorkIsComplete(), getCommittedReflectionTasks() (+9 more)

### Community 63 - "castleJourney.test.ts"
Cohesion: 0.12
Nodes (16): day(), funded(), activateEconomy(), answers, completed, data, earlyReview, economy (+8 more)

### Community 64 - "castlePersistence.test.ts"
Cohesion: 0.12
Nodes (15): cloud, economy, fakeStorage, latest, memory, mixed, mixedApp, original (+7 more)

### Community 65 - "taskCompletion.ts"
Cohesion: 0.24
Nodes (11): elapsedSeconds(), FOCUS_TIMER_STORAGE_KEY, FocusTimerState, formatElapsed(), loadFocusTimer(), saveFocusTimer(), storageMap, EditorFields (+3 more)

### Community 66 - "timeBudget.test.ts"
Cohesion: 0.13
Nodes (13): refDate, taskDue1w, taskDue24h, taskDue26h, taskDue2d12h36m, taskDue30m, taskDue4mo12d, taskDue5h (+5 more)

### Community 67 - "castleFixture.tsx"
Cohesion: 0.21
Nodes (11): appendCommitment(), commitOpenTask(), completeCommitment(), recordEarning(), completedMissionTasks, Fixture(), fixtureEconomy(), fixtureTask() (+3 more)

### Community 68 - "castleModel.test.ts"
Cohesion: 0.15
Nodes (13): castleElements(), getCastleElement(), allPrimitives, archFaces, cat, catFaces, estate, estateSize (+5 more)

### Community 69 - "WorkspaceRecoveryNotice.tsx"
Cohesion: 0.27
Nodes (12): WorkspaceRecoveryNotice(), archiveCloudCopy(), cloudDraftPrefix(), readCloudConflictDrafts(), removeCloudConflictDraft(), exportDataAsJson(), readLocalConflictDrafts(), removeLocalConflictDraft() (+4 more)

### Community 70 - "taskPeriod.ts"
Cohesion: 0.25
Nodes (13): addDays(), DateRange, deadlineDate(), defaultPeriodRange(), getTaskPeriod(), localDate(), localToday(), mondayOf() (+5 more)

### Community 71 - "MomentumCard.test.ts"
Cohesion: 0.22
Nodes (9): getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory, mockTasks, propsTest (+1 more)

### Community 72 - "PetSprite.tsx"
Cohesion: 0.23
Nodes (10): MASCOT_STATE_POSES, getPetMotionClass(), PetSpriteComponent(), resolveMascotVisual(), coffee, excited, idle, props (+2 more)

### Community 73 - "gamification.ts"
Cohesion: 0.35
Nodes (9): calculateTaskXp(), computeNextStreak(), evaluateUnlockedHeroes(), formatDateKey(), getHeroVisibilityState(), getStreakMultiplier(), PRIORITY_MULTIPLIERS, recordDailyFocusCompletion() (+1 more)

### Community 74 - "types/index.ts"
Cohesion: 0.17
Nodes (11): BookmarkClassificationConfidence, BookmarkClassificationResult, BookmarkClassificationRule, DaySchedule, FolderColor, FolderTreeNode, ImportBookmarkResult, OpenRouterConfig (+3 more)

### Community 75 - "ref_node_assert"
Cohesion: 0.28
Nodes (6): react-dom, prompts, TaskClearReflection(), daily, markup, words()

### Community 76 - "favicon.ts"
Cohesion: 0.47
Nodes (7): FaviconImage(), FaviconImageProps, extractApexDomain(), extractDomain(), formatUrl(), getApexFaviconUrl(), getFaviconUrl()

### Community 77 - "Sidebar.tsx"
Cohesion: 0.43
Nodes (7): ActivePill(), Sidebar, SidebarProps, getHeroById(), Folder, LinkItem, getCurrentSubLevel()

### Community 78 - "petEvolution.test.ts"
Cohesion: 0.43
Nodes (5): HERO_ROSTER, earnedPetLevel(), petAccessories(), excited, progress

### Community 79 - "Castle accountability: working specification"
Cohesion: 0.29
Nodes (6): Castle accountability: working specification, Castle screen direction, Decisions, Engineering constraints, Further provisional defaults, Provisional economy defaults (builder choices, not user-approved constants)

### Community 80 - "Year-long 3D castle correction"
Cohesion: 0.50
Nodes (3): Implementation decisions (builder defaults), Work packages, Year-long 3D castle correction

## Knowledge Gaps
- **25 isolated node(s):** `autoprefixer`, `clsx`, `gh-pages`, `postcss`, `tailwind-merge` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 819 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `timeBudget.ts`, `App.tsx`, `GrowthMasteryScreen.tsx`, `petState.ts`, `package.json`, `Mascot.tsx`, `SettingsScreen.tsx`, `CommitmentRadarWidget.test.ts`, `TaskManagementScreen.tsx`, `usePetMotion.ts`, `cloudWorkspace.ts`, `QuickActionsCard.test.ts`, `PrimaryFocusCard.tsx`, `taskListProjection.test.ts`, `ActualTimeDialog.test.tsx`, `CastlePanel.tsx`, `storage.ts`, `CloudWorkspaceSettings.tsx`, `taskDialog.test.tsx`, `LaunchpadPet.tsx`, `castleFixture.tsx`, `castleModel.test.ts`, `WorkspaceRecoveryNotice.tsx`, `MomentumCard.test.ts`, `PetSprite.tsx`, `ref_node_assert`, `favicon.ts`, `Sidebar.tsx`, `petEvolution.test.ts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `getBackupStatus()` and `getPrimarySaveStatus()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `autoprefixer`, `clsx`, `gh-pages` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `TaskManagementScreen.tsx` to `timeBudget.ts`, `App.tsx`, `GrowthMasteryScreen.tsx`, `taskUrgency.test.ts`, `CommitmentRadarWidget.test.ts`, `taskUrgency.ts`, `taskPeriod.test.ts`, `seedData.ts`, `taskReflection.test.ts`, `PrimaryFocusCard.tsx`, `dashboardTodayScope.test.ts`, `taskListProjection.test.ts`, `ActualTimeDialog.test.tsx`, `CastlePanel.tsx`, `storage.ts`, `react`, `castleEconomy.ts`, `PrimaryFocusCard.test.ts`, `taskReflection.ts`, `castleJourney.test.ts`, `taskCompletion.ts`, `timeBudget.test.ts`, `castleFixture.tsx`, `taskPeriod.ts`, `MomentumCard.test.ts`, `gamification.ts`, `types/index.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `petState.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13768115942028986 - nodes in this community are weakly interconnected._
- **Why does `@phosphor-icons/react` connect `PrimaryFocusCard.tsx` to `timeBudget.ts`, `App.tsx`, `QuickActionsCard.test.ts`, `GrowthMasteryScreen.tsx`, `package.json`, `Mascot.tsx`, `MomentumCard.test.ts`, `SettingsScreen.tsx`, `CommitmentRadarWidget.test.ts`, `ref_node_assert`, `favicon.ts`, `Sidebar.tsx`, `CastlePanel.tsx`, `TaskManagementScreen.tsx`, `react`, `taskDialog.test.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._