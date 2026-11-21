# Year-long 3D castle verification — 2026-11-16

This supersedes the illustrated reference implementation as the castle itself. The latest user request is genuine3D construction that requires at least a year of discipline; the reference-style surrounding interface remains.

## Delivered behavior

-120 separately purchased physical elements in12 phases, with geometry-based store thumbnails. Real WebGL/Three.js model: foundation slabs, masonry courses, gate, four round towers, keep, roofs, banners and crown ornaments. Drag to orbit, rotate buttons, zoom and reset.
- First piece requires one qualifying workday; final piece requires365 distinct qualifying days AND365 elapsed calendar days. Only reflected task/partial-work earnings meeting that date's historical daily goal qualify. Missions, waiting, purchases and exemptions alone do not.
- Prices total365 activation-day goals: first piece1goal, middle118 pieces3goals, final piece10goals. Counts/rates remain implementation defaults; the year minimum is the user requirement.
- Domain transition checks canonical price, current balance, prerequisites and day gates on the latest state. Double clicks cannot charge twice. Missed days delay progress without deleting construction.
- Seven legacy purchases retain their stored prices, ledger history and net worth; they do not falsely complete the new120-piece blueprint. No data rewrite, cloud migration or retroactive penalties.
- Shared/instanced geometry, lazy Three.js loading, rendering on demand and explicit renderer/geometry/material/listener/observer cleanup. WebGL failure is explained; no raster image pretends to be a3D view.

## Verified

- Full `npm test` passed, including progression, legacy persistence, reflection, UI and120-element geometry suites.
- TypeScript and final production Vite bundle passed. Three.js is a separate lazy chunk, about193KB gzip, loaded with the Castle view rather than initial dashboard.
- Orca embedded browser only, isolated origin5192. Fresh Vite optimization required filesystem access beyond the restricted sandbox; the old server's inaccessible dependency cache caused the earlier initialization failure. Fresh server serves the Three.js module successfully.
- Actual WebGL canvas rendered without initialization errors.
- Pixel checks: rotate changes canvas output, zoom changes output, reset reproduces its initial output; exactly one canvas remains.
- Zero-workday fixture with$10,000 reserve:0/120 construction, all cards locked. Money alone bypasses no gate.
- One qualifying-day fixture: rapid double click buys exactly one foundation;1/120 owned,1/365 days, no further available cards. Reload retains the purchase and renderer.
- Mobile390x844: viewport width390, document width390, one live canvas and usable controls.
- Independent review corrected blocked gate masonry, hidden crown purchases and initialization cleanup. Final model has an open stone gateway with recessed doors and exposed, proportionate crown details.

The checks use explicitly isolated synthetic history to inspect the year-end model. No live user storage was seeded. No commit, merge or deployment performed. Live two-account cloud synchronization was not re-tested; the existing snapshot shape is unchanged.
