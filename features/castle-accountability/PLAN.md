# Castle Accountability Implementation Plan

> For agentic workers: use the available Superpowers implementation and review workflows. The user requested native Codex workers, with Codex as orchestrator; do not use Orca CLI for execution.

**Goal:** Provide virtual-dollar commitments, uncapped debt, exemptions, missions, and a permanent user-built castle with durable local and cloud state.

**Architecture:** Store an explicitly activated accountability state inside AppData; use an append-only, deterministic ledger and date-keyed snapshots for earnings, commitments, exemptions, and settlement. Integrate user-facing actions with task completion and the existing reflection transaction, then expose the finances and castle through a dedicated screen.

**Tech Stack:** React, TypeScript, localStorage, existing owner-scoped Supabase snapshot sync, standalone tsx tests.

**Spec:** features/castle-accountability/SPEC.md

## Global constraints
- Preserve existing reflection behavior and data; no penalties before activation. Dollars are virtual; no debt floor. No new timer.
- Three exemptions per month, current day only; settle past days on return. Goals changed in Settings start next day.
- Commitments, substitutions, task rewards/penalties, partial progress, rare missions and permanent purchasable castle assets must all be usable, not just modeled.
- Use only Orca embedded browser for any browser checks, and inspect browser test scripts before execution.

## Review focus
- Reload, duplicate completion, day rollover and cloud retries must never duplicate credits or penalties.
- A user returning after multiple days, month boundaries or clock changes gets consistent local-date settlement without pre-activation debt.
- Validation/import/cloud snapshots preserve every new field without affecting existing workspaces or leaking between accounts.
- Reflection cancellation, task deletion, edits, substitution and partial completion cannot erase penalties, double-pay or silently drop work.
- Balance, purchases, owned assets and net worth remain mathematically consistent, including in debt.

## Implementation sequence

### 1. Economy model and settlement
**Files:** create `src/utils/castleEconomy.ts` and `src/utils/castleEconomy.test.ts`; add types to `src/types/index.ts`.
- [ ] Test activation, monetary valuation, manual time, goal versions, current-day exemptions, recurring offline shortfalls and idempotency with literal fixtures.
- [ ] Implement typed pure state transitions and integer-cent arithmetic, date keys and an auditable ledger. Do not automatically activate. Use stable settlement IDs and preserve historical snapshots.
- [ ] Test missed commitments, partial progress, substitution, repeated operations, full monthly reset and clock rollback. Record all policy constants and choices in the specification as implementation defaults.
- [ ] Run the standalone suite and the existing full test suite.

### 2. Durable storage and workspace integration
**Files:** `src/utils/storage.ts`, `src/services/cloudWorkspace.ts`, their tests, `src/data/seedData.ts` if needed.
- [ ] Write failing round-trip and legacy migration tests for task and economy fields, cloud projection and account-safe reset.
- [ ] Preserve and validate new durable state across load, save, backup, import, cloud snapshots and clear. Default missing state to inactive without fabricated historical penalties.
- [ ] Run storage and cloud tests and full suite.

### 3. Commitment and reflection workflow
**Files:** `src/App.tsx`, task components, focused helpers/tests.
- [ ] Test manual actual-time reporting, explicit commitment, valid substitution, partial progress and replay behavior.
- [ ] Let users commit and replace tasks, enter actual minutes, and register partial progress. Pay task earnings only through the existing reflection submission; ensure missing values are requested before submitting and preserve its questions and cancellation behavior.
- [ ] Settle overdue task and daily penalties idempotently on load/visibility/day rollover; never infer a previously uncommitted task is committed.
- [ ] Verify full suite and build.

### 4. Goal, exemptions, finances, castle and missions
**Files:** Settings screen, dedicated castle/accountability components, navigation, economy helpers/tests.
- [ ] Provide explicit activation and next-day goal edits, today's exemption and monthly remaining count, transaction history, balance and net worth.
- [ ] Provide a purposeful castle with a catalog of purchasable materials/additions, visual construction and persistent ownership; protect purchases from double spend.
- [ ] Provide rare random, transparent, optional missions with meaningful verifiable task conditions and complexity-based bonuses in debt or surplus; prevent replay.
- [ ] Test purchase invariants, mission eligibility, exemption interactions and finances. Run full suite/build.

### 5. Review and verification
- [ ] Inspect the complete diff against every spec decision, data integrity and interface contracts; independently review if an authorized Orca worker becomes available.
- [ ] Run all meaningful standalone tests, `npm test`, `npm run build`, and Orca-only isolated UI checks. Report any unavailable checks accurately.
- [ ] Document defaults, validation results and any residual limitations. Do not deploy or merge without authorization.

