# Graph Report - LaunchPAD  (2026-10-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 288 nodes · 654 edges · 23 communities (16 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `877d078b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LinkItem
- package.json
- App.tsx
- index.ts
- compilerOptions
- SettingsModal.tsx
- TaskManagementScreen.tsx
- FocusHeroBanner.tsx
- rules.js
- manifest.json
- devDependencies
- LaunchPad Focus Dashboard & Redirect Hub
- bookmarkSyncChannel.ts
- compilerOptions
- Progressive Disclosure Favicon Grid Plan
- Build Job
- Exact Installed Model String Convention
- Extension README
- Extension Popup UI

## God Nodes (most connected - your core abstractions)
1. `App()` - 30 edges
2. `LinkItem` - 26 edges
3. `Folder` - 25 edges
4. `react` - 20 edges
5. `lucide-react` - 19 edges
6. `compilerOptions` - 16 edges
7. `extractDomain()` - 14 edges
8. `getFaviconUrl()` - 14 edges
9. `motion` - 12 edges
10. `QuickNote` - 9 edges

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

## Communities (23 total, 7 thin omitted)

### Community 0 - "LinkItem"
Cohesion: 0.14
Nodes (35): lucide-react, motion, react, SmartSuggestionCard(), CategorySectionProps, CompactIconGrid(), CompactIconGridProps, DomainClusterTile() (+27 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (31): dependencies, clsx, lucide-react, motion, react, react-dom, tailwind-merge, name (+23 more)

### Community 2 - "App.tsx"
Cohesion: 0.15
Nodes (27): App(), SmartSuggestionCardProps, Header(), HeaderProps, CategorySection(), FolderCard(), ManageFoldersModal(), DURATION_OPTIONS (+19 more)

### Community 3 - "index.ts"
Cohesion: 0.12
Nodes (23): BookmarkClassificationConfidence, BookmarkClassificationResult, BookmarkClassificationRule, DaySchedule, ImportBookmarkResult, OpenRouterConfig, ParsedBookmark, TimeOfDayBucket (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 5 - "SettingsModal.tsx"
Cohesion: 0.21
Nodes (14): SettingsModal(), SettingsModalProps, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, DEFAULT_SEED_DATA, AppData, LearnedPreferences (+6 more)

### Community 6 - "TaskManagementScreen.tsx"
Cohesion: 0.14
Nodes (15): FilterTab, TaskManagementScreenProps, Subtask, TaskPriority, TaskUrl, drawerVariants, fadeScaleVariants, MICRO_INTERACTIONS (+7 more)

### Community 7 - "FocusHeroBanner.tsx"
Cohesion: 0.32
Nodes (10): Focus Dashboard UX Heuristics, FocusHeroBanner(), FocusHeroBannerProps, TimeRadarWidget(), TimeRadarWidgetProps, DailyFocus, QuickNote, BufferSummary (+2 more)

### Community 8 - "rules.js"
Cohesion: 0.17
Nodes (11): syncAllBookmarks(), walk(), classifyBookmark(), DEFAULT_DOMAIN_CATEGORY_RULES, DEFAULT_KEYWORD_CATEGORY_RULES, extractHostname(), FOLDER_BOOKMARKS, FOLDER_CLASSES (+3 more)

### Community 9 - "manifest.json"
Cohesion: 0.14
Nodes (13): action, default_popup, default_title, background, service_worker, type, content_scripts, description (+5 more)

### Community 10 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, gh-pages, postcss, tailwindcss, @tailwindcss/container-queries, @types/node, @types/react (+4 more)

### Community 11 - "LaunchPad Focus Dashboard & Redirect Hub"
Cohesion: 0.22
Nodes (9): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, LaunchPad HTML Entrypoint, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad (+1 more)

### Community 12 - "bookmarkSyncChannel.ts"
Cohesion: 0.25
Nodes (5): BOOKMARKS_SYNC_CHANNEL_NAME, BookmarkSyncEventData, BookmarkSyncHandler, BookmarkSyncMessageType, BookmarkSyncPayload

### Community 13 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 14 - "Progressive Disclosure Favicon Grid Plan"
Cohesion: 0.67
Nodes (3): Domain Nesting & Auto-Clustering, Floating Hover Preview Cards, Progressive Disclosure Favicon Grid Plan

### Community 15 - "Build Job"
Cohesion: 1.00
Nodes (3): Build Job, Deploy Job, Deploy to GitHub Pages Workflow

## Knowledge Gaps
- **21 isolated node(s):** `autoprefixer`, `clsx`, `gh-pages`, `postcss`, `tailwind-merge` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `LinkItem` to `package.json`, `App.tsx`, `SettingsModal.tsx`, `TaskManagementScreen.tsx`, `FocusHeroBanner.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `clsx`, `gh-pages` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LinkItem` be split into smaller, more focused modules?**
  _Cohesion score 0.1360544217687075 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `LinkItem` to `package.json`, `App.tsx`, `SettingsModal.tsx`, `TaskManagementScreen.tsx`, `FocusHeroBanner.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._