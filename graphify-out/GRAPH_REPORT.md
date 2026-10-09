# Graph Report - LaunchPAD  (2026-10-09)

## Corpus Check
- Corpus is ~20,300 words - fits in a single context window. You may not need a graph.

## Summary
- 194 nodes · 446 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 1,200 input · 800 output

## Community Hubs (Navigation)
- UI Components & Suggestions
- Core Package Dependencies
- App Root & Dashboard Layout
- Focus Banner & Modals
- TypeScript App Configuration
- Folder Management & Icons
- Build Tools & Dev Dependencies
- Focus Architecture & Strategy
- Node TypeScript Configuration
- Favicon Grid & Clustering Specs
- GitHub Pages CI/CD Pipeline

## God Nodes (most connected - your core abstractions)
1. `App()` - 25 edges
2. `LinkItem` - 22 edges
3. `Folder` - 21 edges
4. `react` - 18 edges
5. `lucide-react` - 17 edges
6. `compilerOptions` - 16 edges
7. `extractDomain()` - 12 edges
8. `getFaviconUrl()` - 12 edges
9. `getFolderIcon()` - 9 edges
10. `CompactIconGrid()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Contextual Intercept Focus System` --conceptually_related_to--> `Daily Focus Intention`  [INFERRED]
  docs/superpowers/plans/2026-10-09-intelligent-focus-engine.md → README.md
- `ManageFoldersModalProps` --references--> `Folder`  [EXTRACTED]
  src/components/Modals/ManageFoldersModal.tsx → src/types/index.ts
- `App()` --calls--> `SmartSuggestionCard()`  [EXTRACTED]
  src/App.tsx → src/components/Dashboard/SmartSuggestionCard.tsx
- `App()` --calls--> `CategorySection()`  [EXTRACTED]
  src/App.tsx → src/components/LinkGrid/CategorySection.tsx
- `App()` --calls--> `CompactIconGrid()`  [EXTRACTED]
  src/App.tsx → src/components/LinkGrid/CompactIconGrid.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Intelligent Focus & Recommendation Architecture** — docs_superpowers_plans_2026_10_09_intelligent_focus_engine_time_capacity, docs_superpowers_plans_2026_10_09_intelligent_focus_engine_bandit_recommender, docs_superpowers_plans_2026_10_09_intelligent_focus_engine_contextual_intercept [EXTRACTED 0.95]

## Communities (13 total, 2 thin omitted)

### Community 0 - "UI Components & Suggestions"
Cohesion: 0.17
Nodes (27): react, SmartSuggestionCard(), SmartSuggestionCardProps, CategorySection(), CategorySectionProps, CompactIconGrid(), CompactIconGridProps, DomainClusterTile() (+19 more)

### Community 1 - "Core Package Dependencies"
Cohesion: 0.06
Nodes (30): dependencies, clsx, lucide-react, react, react-dom, tailwind-merge, name, private (+22 more)

### Community 2 - "App Root & Dashboard Layout"
Cohesion: 0.18
Nodes (24): App(), FocusHeroBanner(), TimeRadarWidget(), TimeRadarWidgetProps, Header(), ManageFoldersModal(), DURATION_OPTIONS, QuickNotesWidget() (+16 more)

### Community 3 - "Focus Banner & Modals"
Cohesion: 0.15
Nodes (19): FocusHeroBannerProps, HeaderProps, SettingsModal(), SettingsModalProps, CALM_QUOTES, DEFAULT_INITIAL_PREFERENCES, DEFAULT_MICRO_QUESTS, DEFAULT_SEED_DATA (+11 more)

### Community 4 - "TypeScript App Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 5 - "Folder Management & Icons"
Cohesion: 0.27
Nodes (10): lucide-react, FolderCard(), AVAILABLE_COLORS, AVAILABLE_ICONS, ManageFoldersModalProps, Sidebar(), FolderColor, FOLDER_COLOR_MAP (+2 more)

### Community 6 - "Build Tools & Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, gh-pages, postcss, tailwindcss, @tailwindcss/container-queries, @types/node, @types/react (+4 more)

### Community 7 - "Focus Architecture & Strategy"
Cohesion: 0.22
Nodes (9): Self-Learning Bandit Recommendation Engine, Contextual Intercept Focus System, Intelligent Focus Engine Plan, Time Capacity Engine, LaunchPad HTML Entrypoint, Daily Focus Intention, LaunchPad Focus Dashboard & Redirect Hub, Dual-Mode Quick Scratchpad (+1 more)

### Community 8 - "Node TypeScript Configuration"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 9 - "Favicon Grid & Clustering Specs"
Cohesion: 0.67
Nodes (3): Domain Nesting & Auto-Clustering, Floating Hover Preview Cards, Progressive Disclosure Favicon Grid Plan

### Community 10 - "GitHub Pages CI/CD Pipeline"
Cohesion: 1.00
Nodes (3): Build Job, Deploy Job, Deploy to GitHub Pages Workflow

## Knowledge Gaps
- **18 isolated node(s):** `clsx`, `tailwind-merge`, `@tailwindcss/container-queries`, `@types/node`, `@types/react` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 74 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UI Components & Suggestions` to `Core Package Dependencies`, `App Root & Dashboard Layout`, `Focus Banner & Modals`, `Folder Management & Icons`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **What connects `clsx`, `tailwind-merge`, `@tailwindcss/container-queries` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Folder Management & Icons` to `UI Components & Suggestions`, `Core Package Dependencies`, `App Root & Dashboard Layout`, `Focus Banner & Modals`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Should `TypeScript App Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Build Tools & Dev Dependencies` to `Core Package Dependencies`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._