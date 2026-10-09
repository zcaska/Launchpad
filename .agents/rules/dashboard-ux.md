# Focus Dashboard UX Heuristics

1. **Context-Scoped Overview Widgets**:
   - High-level overview banners (`TimeRadarWidget`, `FocusHeroBanner`, `SmartSuggestionCard`) must only render on the top-level "All Resources" view (`selectedFolderId === null && !searchQuery`).
   - Folder views, tag filters, and search results must display target resources directly without top overview banners to prevent distraction.

2. **Visual Harmony & Clean Iconography**:
   - Folder cards must align icon, title, count, and actions using structured CSS Grid (e.g. `grid-cols-[auto_1fr_auto]`).
   - Folder icons should not have heavy, saturated background squircle containers; preserve clean colored icon strokes with transparent/neutral backgrounds.
