# Graph Report - LaunchPAD  (2026-10-13)

## Corpus Check
- 75 files · ~93,890 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 613 nodes · 1494 edges · 33 communities (22 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 2,000 input · 700 output

## Community Hubs (Navigation)
- UI Components & Icons
- Folder Actions & Verification
- Calendar Timeline & UX Heuristics
- Momentum Metric & History
- Bookmark Tree & Sidebar Rows
- Project Dependencies & Ecosystem
- Core Domain Types & Schemas
- Settings Modal & Seed State
- Task Urgency Unit Verification
- Commitment Radar Visualization
- Task Urgency & Math Calculations
- TypeScript Configuration
- Extension Background Sync
- Chrome Extension Manifest
- Focus Card Test Suite
- Primary Focus Card Workspace
- Focus Engine & Time Capacity
- Quick Actions Card
- TypeScript Node Configuration
- Agent Architecture & Rules
- Favicon Grid Architecture
- GitHub Pages CI/CD
- Dashboard Class Link UI
- Dashboard Focus Workspace UI
- Extension Popup Interface
- Extension Documentation
- Web App Entry HTML
- LaunchPad Branding Assets

## God Nodes (most connected - your core abstractions)
1. `App()` - 46 edges
2. `react` - 37 edges
3. `Folder` - 36 edges
4. `lucide-react` - 35 edges
5. `LinkItem` - 35 edges
6. `QuickNote` - 25 edges
7. `motion` - 16 edges
8. `compilerOptions` - 16 edges
9. `DailyGrowthRecord` - 15 edges
10. `extractDomain()` - 15 edges

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

## Communities (33 total, 11 thin omitted)

### Community 0 - "UI Components & Icons"
Cohesion: 0.08
Nodes (53): lucide-react, motion, react, react-dom, FaviconImage(), FaviconImageProps, SmartSuggestionCard(), CategorySection() (+45 more)

### Community 1 - "Folder Actions & Verification"
Cohesion: 0.08
Nodes (45): delWith, delWithout, hiddenWith, hiddenWithout, initialFolders, initialLinks, treeVisible, treeWith (+37 more)

### Community 2 - "Calendar Timeline & UX Heuristics"
Cohesion: 0.09
Nodes (40): Focus Dashboard UX Heuristics, CalendarScheduleTimeline(), CalendarScheduleTimelineProps, SafeDescription(), cleanTextPiece(), SafeDescriptionProps, Segment, FocusHeroBanner() (+32 more)

### Community 3 - "Momentum Metric & History"
Cohesion: 0.09
Nodes (39): getLocalDateString(), MomentumCard(), MomentumCardProps, MomentumTimeframe, mockGamification, mockGrowthHistory, mockTasks, propsTest (+31 more)

### Community 4 - "Bookmark Tree & Sidebar Rows"
Cohesion: 0.07
Nodes (43): BookmarkRow(), isValidUrl(), MenuBtn(), StarDot(), ActivePill(), FolderTreeItem(), FolderTreeItemProps, NOOP_BOOKMARK (+35 more)

### Community 5 - "Project Dependencies & Ecosystem"
Cohesion: 0.05
Nodes (42): dependencies, clsx, lucide-react, motion, react, react-dom, tailwind-merge, devDependencies (+34 more)

### Community 6 - "Core Domain Types & Schemas"
Cohesion: 0.07
Nodes (38): SmartSuggestionCardProps, DEFAULT_MICRO_QUESTS, BookmarkClassificationConfidence, BookmarkClassificationResult, BookmarkClassificationRule, DaySchedule, FolderColor, GoogleCalendarConfig (+30 more)

### Community 7 - "Settings Modal & Seed State"
Cohesion: 0.15
Nodes (26): SettingsModal(), SettingsModalProps, DEFAULT_INITIAL_PREFERENCES, DEFAULT_SEED_DATA, classifyGoogleApiError(), classifyTokenResponseError(), extractPrimaryCalendarEmail(), fetchGoogleCalendarAccountEmail() (+18 more)

### Community 8 - "Task Urgency Unit Verification"
Cohesion: 0.06
Nodes (29): collapsedState, denseNodes, denseOverdueTasks, dueTodayInfo, dueTomorrowMorning, emptyDeadlineInfo, expandedState, highMomentumTask (+21 more)

### Community 9 - "Commitment Radar Visualization"
Cohesion: 0.11
Nodes (25): CommitmentRadarWidget(), formatTaskCountdown(), RadarViewMode, countdownAi, countdownDsc, countdownEcon, countdownExcel, countdownNoDeadline (+17 more)

### Community 10 - "Task Urgency & Math Calculations"
Cohesion: 0.12
Nodes (18): Subtask, TaskPriority, calculateSessionMomentumIndex(), calculateTaskOpportunityScore(), DEFAULT_VISIBLE_SUBTASKS, getTopOpportunity(), OpportunityRankingOptions, OpportunityScoreBreakdown (+10 more)

### Community 11 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "Extension Background Sync"
Cohesion: 0.20
Nodes (13): getBookmarkFolderHierarchy(), syncAllBookmarks(), walk(), classifyBookmark(), DEFAULT_DOMAIN_CATEGORY_RULES, DEFAULT_KEYWORD_CATEGORY_RULES, extractHostname(), FOLDER_BOOKMARKS (+5 more)

### Community 13 - "Chrome Extension Manifest"
Cohesion: 0.14
Nodes (13): action, default_popup, default_title, background, service_worker, type, content_scripts, description (+5 more)

### Community 14 - "Focus Card Test Suite"
Cohesion: 0.15
Nodes (11): CommitmentRadarWidgetProps, PrimaryFocusCardProps, collapsedState, expandedState, mockSubtasks, mockTask, propsTest, urgencyInfo (+3 more)

### Community 15 - "Primary Focus Card Workspace"
Cohesion: 0.26
Nodes (10): deriveDeadlineMetrics(), formatDeadlineDateLabel(), parseSubtaskContent(), PrimaryFocusCard(), ProcedureSort, formatEventDuration(), formatEventTime(), parseTimeComponents() (+2 more)

### Community 16 - "Focus Engine & Time Capacity"
Cohesion: 0.25
Nodes (8): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad, Time Snatch Extension Integration

### Community 17 - "Quick Actions Card"
Cohesion: 0.32
Nodes (4): QuickActionsCard(), QuickActionsCardProps, expectedActions, propsTest

### Community 18 - "TypeScript Node Configuration"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 20 - "Agent Architecture & Rules"
Cohesion: 0.50
Nodes (4): AGENTS Governance Instructions, Subagent Execution Policy, CLAUDE Architectural Guidelines, Cline Rules Project Context

### Community 21 - "Favicon Grid Architecture"
Cohesion: 0.67
Nodes (3): Domain Nesting & Auto-Clustering, Floating Hover Preview Cards, Progressive Disclosure Favicon Grid Plan

### Community 22 - "GitHub Pages CI/CD"
Cohesion: 1.00
Nodes (3): Build Job, Deploy Job, Deploy to GitHub Pages Workflow

## Knowledge Gaps
- **26 isolated node(s):** `autoprefixer`, `clsx`, `gh-pages`, `postcss`, `tailwind-merge` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 262 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UI Components & Icons` to `Folder Actions & Verification`, `Calendar Timeline & UX Heuristics`, `Momentum Metric & History`, `Bookmark Tree & Sidebar Rows`, `Project Dependencies & Ecosystem`, `Settings Modal & Seed State`, `Commitment Radar Visualization`, `Primary Focus Card Workspace`, `Quick Actions Card`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `clsx`, `gh-pages` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components & Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.0848982785602504 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `UI Components & Icons` to `Folder Actions & Verification`, `Calendar Timeline & UX Heuristics`, `Momentum Metric & History`, `Bookmark Tree & Sidebar Rows`, `Project Dependencies & Ecosystem`, `Settings Modal & Seed State`, `Commitment Radar Visualization`, `Primary Focus Card Workspace`, `Quick Actions Card`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `Folder Actions & Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.08051948051948052 - nodes in this community are weakly interconnected._
- **Why does `QuickNote` connect `Focus Card Test Suite` to `Folder Actions & Verification`, `Calendar Timeline & UX Heuristics`, `Momentum Metric & History`, `Core Domain Types & Schemas`, `Task Urgency Unit Verification`, `Commitment Radar Visualization`, `Task Urgency & Math Calculations`, `Primary Focus Card Workspace`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Calendar Timeline & UX Heuristics` be split into smaller, more focused modules?**
  _Cohesion score 0.09158249158249158 - nodes in this community are weakly interconnected._