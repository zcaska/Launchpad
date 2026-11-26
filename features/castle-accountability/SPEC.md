# Castle accountability: working specification

Status: local implementation and verification are recorded in YEAR-LONG-3D-VERIFICATION.md. Work is uncommitted and not deployed. This specification records product requirements and provisional rates.

## Decisions
- User direction (2026-11-26): expand the castle's scale and architectural detail substantially, while preserving the contrast between the subdued unbuilt preview and the finished pieces.
- User correction (2026-11-26): store items should have different prices reflecting their relative worth. Preserve existing purchase and ledger values; the differentiated prices are provisional builder choices.
- User clarification (2026-11-26): use the existing floating mascot for castle-page motivational lines; do not add a second mascot.
- User clarification (2026-11-26): the unbuilt castle should be visibly readable as a subdued silhouette, with purchased elements clearly brighter and more detailed.
- Latest user correction (2026-11-26): when daily review is enabled, hold completion cash and growth until the daily review after all tasks are complete; when disabled, award each task on completion. Show estimated task cash in Primary Focus and Tasks. Keep the unbuilt Three.js castle as a dull, shadowed preview; make each purchased element clearly visible against it, with improved rendering and animation. Use the mascot to point toward the castle with brief, firm motivational guidance.
- User correction (2026-11-26): every completed task earns virtual cash based on its recorded actual time, including tasks without an explicit commitment. The former 30-minute earning floor and four-hour earning cap no longer apply; explicit commitments remain optional and retain their missed-task penalties. Display an estimated value from the task's estimated time and make clear that actual time determines earnings. Use separate hours and minutes clocks for actual-time entry. Reward timing follows the latest correction above.
- Latest user correction: completion is a long-term discipline journey of at least one year, built from purchased genuine3D elements. The old seven-click illustrated castle does not satisfy this. See YEAR-LONG-3D-PLAN.md for provisional implementation rates and the365 qualifying-work-day gate. Preserve all prior assets and financial history.
- Virtual dollars only; no real payments. Cash balance can become negative without a debt floor. Net worth equals cash plus owned castle asset value.
- The user sets a daily earnings goal in Settings; changes take effect next calendar day. Accountability starts only on explicit activation, without retroactive penalties.
- Explicit daily task commitments have values based on estimated duration, priority and deadline. Incomplete commitments incur task penalties based on their committed values. Daily earnings shortfall also incurs a proportional penalty; settle offline days on return and explain deductions.
- Users manually enter actual time; do not add a timer. Completed task rewards use actual time, priority and deadline. Preserve the existing reflection flow, questions and registration semantics.
- Daily goals are measured in dollars earned, not task count or a three-hour threshold. Replacements must have at least the original commitment's value: evaluate by estimate initially and verify by actual completion value; uncovered value remains outstanding.
- Three exemptions per calendar month reset at the beginning of each month. Only the current day may be exempted, at the user's discretion. Exempt days waive the day's penalties; completed work may still earn rewards. No retroactive exemptions.
- Partial genuine work can earn towards the goal; incomplete tasks still carry task penalties. Do not assume a prorated penalty formula.
- The user purchases materials and builds a golden achievement and memory castle. Built structures are permanent and are not damaged by missed days. Net worth includes castle assets plus cash.
- Offer rare, random optional meaningful missions for users in debt or surplus; rewards scale with mission complexity, with clear terms. Ordinary earnings remain a dependable path out of debt. Missions are not debt-only.

## Engineering constraints
- Keep an auditable ledger with stable IDs and idempotent settlement. Reloads, cloud sync, imports and rollover must not duplicate credits or penalties. Respect local dates and month boundaries; avoid backdating exemptions or rewriting historical goals.
- Preserve existing data, XP, heroes, reflection, import/export, offline behavior and account isolation. Existing timer data is not a substitute for manual time entry. Never impose penalties on existing users before activation.
- Exact valuation rates, proportional penalty multiplier, partial-progress accounting, mission frequency and values, asset catalog, and replacement workflow remain unspecified. Record chosen defaults as assumptions, not user-approved decisions.
- Inspect current implementation before editing. Verify ledger invariants, date boundaries, offline catch-up, exemption limits, reflection interactions and migration with meaningful tests.

## Provisional economy defaults (builder choices, not user-approved constants)
- Low-priority work is valued at $10 per hour, with medium/high/urgent multipliers of 1.5/2/3. A task due today gets a 1.25 multiplier; that multiplier decays by 20% for each day overdue. Value rounds to the nearest cent. Estimated minutes are used at commitment; manually reported actual minutes are used for completed or partial work.
- A missed task penalty equals its committed estimated dollar value. The daily goal shortfall penalty is $1 per $1 shortfall, in addition to task penalties. An exemption waives both.
- A partial progress log uses a unique identifier and pays only its own reported work; the task remains incomplete and carries its full missed-task penalty. When completing the same task, reward only newly reported work so progress is not paid twice. Reflection integration is implemented in the worktree and remains under review.

## Castle screen direction
Latest user correction (2026-11-23): give the 3D castle the full page below its toolbar. Open the construction store only from its Store button. Show each material with its thumbnail, name, and the controls needed to buy or select it. Selecting an owned material closes the store and highlights its location on the castle. Treasury, progress, commitments, and ledger are available from the toolbar.

User correction (2026-11-15): replicate the supplied visual references closely. The original small vector-castle direction is superseded by a detailed moonlit fortress illustration, charcoal/silver cards, emerald money and purple progress/actions. Incomplete state uses the wide shadow hero with adjacent three-column store and compact daily/work/reflection panels; completed state uses the large fortress, portfolio sidebar, structure counts and owned-elements row. Existing typography, economy, saved ownership and task/reflection behavior remain authoritative. See ARTWORK.md and REFERENCE-VERIFICATION.md.

The visual centerpiece is a small, personal golden castle that grows as the owner purchases specific additions. Keep the existing LaunchPAD typography and serene theme; use deep green (#1D4A3A), aged gold (#C99827), pale gold (#F5D781), light stone (#F7F6F1), and slate (#334155). On wide screens, place the castle and net worth on the left, with today’s goal and construction choices alongside; on phones, stack castle, daily progress, commitments, and construction in that order. Keep labels readable and all controls keyboard accessible; avoid default dashboard ornament. The castle changes only when a purchase succeeds, never on a missed day.

## Further provisional defaults
- A replacement must match the original estimated commitment value. At settlement, unfinished replacement tasks retain their own full penalties; if completed actual value plus the value of those unfinished replacements is still below the original obligation, charge only the remaining uncovered difference. This avoids duplicating the same missed replacement penalty. Nested replacements are presently disallowed.
- Rare mission opportunities use one draw per local day, a 10% offer probability, and a minimum 14-day spacing. The standard mission requires two completed commitments totaling $60 for $15; the harder mission requires three totaling $100 for $25. Missions are optional and bonuses apply to debt or surplus. These values are assumptions, not user-selected settings.


