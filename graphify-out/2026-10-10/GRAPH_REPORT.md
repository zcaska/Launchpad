# Graph Report - LaunchPAD  (2026-10-10)

## Corpus Check
- 20 files · ~27,535 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 220 nodes · 500 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Dependencies & Ecosystem
- Link Grid & UI Components
- Core App & Focus Dashboard View
- Header & Settings Configuration
- Overview Widgets & Time Radar
- Task Management & Modal Workflows
- TypeScript Client Config
- Focus Engine & Product Specs
- TypeScript Node & Build Config
- Domain Nesting & Favicon Grid
- GitHub Pages CI/CD Pipeline
- Subagent Execution Rules

## God Nodes (most connected - your core abstractions)
1. `LinkItem` - 22 edges
2. `Folder` - 21 edges
3. `react` - 19 edges
4. `lucide-react` - 18 edges
5. `compilerOptions` - 16 edges
6. `App()` - 15 edges
7. `motion` - 11 edges
8. `extractDomain()` - 9 edges
9. `getFaviconUrl()` - 9 edges
10. `QuickNote` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Context-Scoped Overview Widgets` --references--> `FocusHeroBanner()`  [EXTRACTED]
  .agents/rules/dashboard-ux.md → src/components/Dashboard/FocusHeroBanner.tsx
- `Context-Scoped Overview Widgets` --references--> `SmartSuggestionCard()`  [EXTRACTED]
  .agents/rules/dashboard-ux.md → src/components/Dashboard/SmartSuggestionCard.tsx
- `Context-Scoped Overview Widgets` --references--> `TimeRadarWidget()`  [EXTRACTED]
  .agents/rules/dashboard-ux.md → src/components/Dashboard/TimeRadarWidget.tsx
- `Contextual Intercept Focus System` --conceptually_related_to--> `Daily Focus Intention`  [INFERRED]
  docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md → README.md
- `ClusteredFolderContent` --references--> `LinkItem`  [EXTRACTED]
  src/utils/domainCluster.ts → src/types/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Intelligent Focus & Recommendation Architecture** — docs_superpowers_plans_2026_10_09_intelligent_focus_engine_time_capacity, docs_superpowers_plans_2026_10_09_intelligent_focus_engine_bandit_recommender, docs_superpowers_plans_2026_10_09_intelligent_focus_engine_contextual_intercept [EXTRACTED 0.95]

## Communities (14 total, 3 thin omitted)

### Community 0 - "Project Dependencies & Ecosystem"
Cohesion: 0.05
Nodes (42): dependencies, clsx, lucide-react, motion, react, react-dom, tailwind-merge, devDependencies (+34 more)

### Community 1 - "Link Grid & UI Components"
Cohesion: 0.15
Nodes (30): lucide-react, motion, react, CategorySection(), CategorySectionProps, CompactIconGrid(), CompactIconGridProps, DomainClusterTile() (+22 more)

### Community 2 - "Core App & Focus Dashboard View"
Cohesion: 0.12
Nodes (24): Focus Dashboard UX Heuristics, react-dom, App(), FocusHeroBanner(), SmartSuggestionCard(), SmartSuggestionCardProps, TimeRadarWidget(), Header() (+16 more)

### Community 3 - "Header & Settings Configuration"
Cohesion: 0.18
Nodes (16): HeaderProps, SettingsModal(), SettingsModalProps, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, DEFAULT_SEED_DATA, AppData (+8 more)

### Community 4 - "Overview Widgets & Time Radar"
Cohesion: 0.23
Nodes (14): FocusHeroBannerProps, TimeRadarWidgetProps, DURATION_OPTIONS, QuickNotesWidgetProps, TaskManagementScreenProps, DailyFocus, QuickNote, BufferSummary (+6 more)

### Community 5 - "Task Management & Modal Workflows"
Cohesion: 0.15
Nodes (15): AddEditLinkModalProps, FilterTab, Subtask, TaskPriority, TaskUrl, drawerVariants, MICRO_INTERACTIONS, modalBackdropVariants (+7 more)

### Community 6 - "TypeScript Client Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 7 - "Focus Engine & Product Specs"
Cohesion: 0.22
Nodes (9): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, LaunchPad HTML Entrypoint, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad (+1 more)

### Community 8 - "TypeScript Node & Build Config"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 9 - "Domain Nesting & Favicon Grid"
Cohesion: 0.67
Nodes (3): Domain Nesting & Auto-Clustering, Floating Hover Preview Cards, Progressive Disclosure Favicon Grid Plan

### Community 10 - "GitHub Pages CI/CD Pipeline"
Cohesion: 1.00
Nodes (3): Build Job, Deploy Job, Deploy to GitHub Pages Workflow

## Knowledge Gaps
- **19 isolated node(s):** `Self-Learning Bandit Recommendation Engine`, `Time Capacity Engine`, `Dual-Mode Quick Scratchpad`, `Time Snatch Extension Integration`, `LaunchPad HTML Entrypoint` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 85 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Link Grid & UI Components` to `Project Dependencies & Ecosystem`, `Core App & Focus Dashboard View`, `Header & Settings Configuration`, `Overview Widgets & Time Radar`, `Task Management & Modal Workflows`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `Self-Learning Bandit Recommendation Engine`, `Time Capacity Engine`, `Dual-Mode Quick Scratchpad` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Dependencies & Ecosystem` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Link Grid & UI Components` to `Project Dependencies & Ecosystem`, `Core App & Focus Dashboard View`, `Header & Settings Configuration`, `Overview Widgets & Time Radar`, `Task Management & Modal Workflows`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `Link Grid & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.14518002322880372 - nodes in this community are weakly interconnected._
- **Should `Core App & Focus Dashboard View` be split into smaller, more focused modules?**
  _Cohesion score 0.11827956989247312 - nodes in this community are weakly interconnected._
- **Should `TypeScript Client Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._