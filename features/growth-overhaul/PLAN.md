# Launchpad — reviewed architecture and phased plan

Revision 3, 2026-11-09. Authoritative coordinator plan; replaces the worker draft.
Worktree: C:/Users/AGP/orca/workspaces/LaunchPAD/launchpad-growth-overhaul
Branch: Zenith/launchpad-growth-overhaul; starting commit 2da2ff6.
All architecture below is proposed. No application/user-data/cloud migration has been activated.

## Audit: existing, modify, create

Existing app: React 19, TypeScript, Vite, Tailwind, static dashboard deployment; App.tsx coordinates views, task actions, focus and integration effects. Persistence is whole-AppData localStorage v3 with legacy reads, sanitizer, rolling backup and JSON import/export. There is no application-owned Supabase/IndexedDB synchronization.

| Area | Existing | Required change |
|---|---|---|
| Tasks/planning | Manual title, description, estimate, priority, deadline, subtasks, URLs | Preserve; add explicit planning date/commitment membership and lifecycle |
| Distraction recovery | Focus/workload radar, timer, curated resources, adaptive recommender, Clear Runway, pet | Preserve; decouple calendar inputs |
| Growth | L1–L7, sublevels, XP/streaks, history views, backup reminder | Evidence ledger, deterministic capped awards, recalculable projections; retain old records/badges |
| Reflection | Prompt suggestions only | Six-prompt conversation, drafts/resume, permanent submissions and unique milestone |
| Storage | localStorage v3, legacy import/recovery | IndexedDB transactions, staged migration, recovery/export |
| Integrations | TickTick API/token/proxy and Google Calendar GIS/OAuth | Completely retire runtime/UI/data structures after converting imported tasks |
| Accounts/sync | No app-owned cross-device backend | Supabase Auth, RLS, outbox, revisions, conflicts/status, offline shell |

Source findings:
- src/App.tsx:204 completion handler and subtask handler call recordTaskCompletion; Undo changes task status without reversing awards. Repeated toggles can award again. There is no durable 10-minute lifecycle.
- src/utils/gamification.ts:41 uses max(15, estimated minutes), priority and streak multipliers; missing duration defaults to 30 minutes in recordTaskCompletion. This rewards splitting and permits repeated awards.
- gamification.ts:60 and sublevel logic unlock with streak OR XP. Existing heroRoster thresholds are L1 1d/0XP; L2 5d/800; L3 14d/2800; L4 30d/6800; L5 60d/16000; L6 120d/36000; L7 200d/75000. Either currently suffices.
- seedData.ts:183 seeds a one-day streak before work. Inspection did not establish daily automatic level gains just from reopening. Do not overstate that finding.
- recordDailyFocusCompletion grants 250 XP without internal deduplication; no live production caller outside the module was found. This is an unsafe helper, not a proven live UI exploit.
- storage.ts:4 uses launchpad_app_data_v3 and launchpad_app_data_backup_v3 with v2/v1 fallback. Quota recovery prunes growthHistory to 365 entries, risking older history loss.
- Whole-snapshot writes risk stale-tab overwrites and loss of unflushed edits. setItem itself is atomic with respect to failure; do not claim a partial setItem corrupts JSON.
- importDataFromJson parses/sanitizes and returns data; it does not itself atomically replace a database. Capture raw input before sanitizer discards unsupported fields.
- AppData exports may include OpenRouter credentials and Google configuration/email. Google tokens and TickTick settings are separate storage keys, not necessarily included in those exports.
No actual user browser data was inspected or backed up in this audit.

## Integration retirement

Remove Google Calendar service/schedule/task generation, calendar timeline, OAuth UI/polling/config and integration-only tests; remove TickTick service/sync manager/mappers/types/settings card/tests; remove ticktick-proxy source, Vite /api/ticktick proxy and obsolete test-script paths. Inspect shared consumers before deleting calendarFormatting or URL sanitization. Preserve SafeDescription and shared utilities.

Convert imported and legacy ID-based calendar tasks to manual tasks, preserving stable IDs, text, descriptions, subtasks, durations, deadlines, completion and URLs. Never deduplicate by title alone. Freeze old sync before conversion; retain original raw records in a recovery snapshot. No dedicated SDK dependency exists in package.json; remove dependencies only when actually unused.

Credential/config names include launchpad_gcal_token_v1, launchpad_ticktick_settings_v1, settings.googleCalendar, clientId, accessToken, selectedProjectId and proxyUrl. Never log values. Default portable backups omit credentials. Source removal is reversible in this branch; actual token deletion/provider revocation, live-data migration activation and deployed proxy retirement require explicit approval after backup/preview. Deleting proxy source does not undeploy its remote service. Local operation must not depend on successful network revocation.

## Durable lifecycle

Task fields: stable id/revision, planned_day, completion_id, completed_at, undo_until, archived_at, review_day, deleted_at and payload_cleaned_at.
1. Complete immediately in an atomic IndexedDB transaction with completion snapshot and outbox entry. Exclude from actionable workload; show in Completed for 10 minutes.
2. Undo eligibility is now < undo_until. Persist reversal and cancel/retract its provisional award. Recompletion cannot farm another task award.
3. At expiry archive minimal completion information and settle permanent self-reported task evidence independently of review. Closing/reopening cannot lose task credit.
4. Review uses stable completion snapshots. Early submission must leave still-undoable completions pending; it cannot shorten Undo.
5. After review finalization and durable evidence, transactionally remove redundant staging/rich completed-task payload. Keep evidence, reflection, legacy backup and small deletion/award fences. Unfinished review retains minimal completion context.
6. Task deletion never cascades into evidence deletion. A genuine retraction is an appended correction event.

Evaluate at startup, focus/visibility resume, rendering/filtering, before mutations, sync, and periodically while visible. Timers are optional wake-ups; persisted timestamps determine state. Closed-browser cleanup occurs at next execution, not magically while closed.

Capture UTC plus local date/timezone. Use server-offset estimates and monotonic session elapsed time; detect major clock jumps. Offline clocks cannot be independently trusted. Keep occurrence and receipt timestamps separately; never reject a valid days-old queued edit solely for its timestamp. Concurrent offline Undo/review intents require causal revision checks and recoverable conflicts.

## Evidence, XP and levels

Completion is SELF-REPORTED unless a separately identified source supports it. Hashes, timers, URLs and reflection word counts do not prove real-world work. Never label all evidence Verified.
Store immutable facts/corrections separately from projected points: event/source IDs, semantic uniqueness key, estimated minutes snapshot, local day/timezone, evidence kind and rule version. No rewards for task creation, app opening or elapsed days.
Proposed task XP = min(120, sum of eligible settled estimated minutes for the day), aggregated before rounding. No per-task floor/bonus, priority multiplier, subtask bonus or streak multiplier. Missing estimates retain completion credit but no duration points. A task's award identity prevents repeated toggles earning again. Splitting the same workload must yield the same sum. Self-report gaming cannot be eliminated by arithmetic.
Proposed review milestone = 50 XP once per local day after a substantive 200-word review. Skipping reflection never removes task credit. Achievements remain separately evidenced records, not another automatic XP stream.
Preserve all legacy XP/history/unlocks in an immutable snapshot, visibly distinguish legacy totals from new-system projection, retain earned badge visibility, and never fabricate historical completion evidence.
Retain L1–L7 names/assets/identifiers. Proposed requirements use cumulative qualifying days AND new XP AND submitted review days; no consecutive streak gate:

| Level | Activity days | New XP | Review days |
|---|---:|---:|---:|
| L1 | 0 | 0 | 0 |
| L2 | 7 | 500 | 3 |
| L3 | 21 | 1800 | 10 |
| L4 | 45 | 4000 | 20 |
| L5 | 90 | 8500 | 40 |
| L6 | 180 | 17000 | 80 |
| L7 | 365 | 35000 | 160 |

An activity day has a settled completion attached to its plan; low-workload days count. Rest days cause no reset, debt, decay or demotion. Thresholds are proposed calibration, not measures of ability.

## Daily Growth Review

A provider-independent ReviewCoach interface with deterministic local conversation is sufficient; no paid AI dependency.
Ask: genuine completion; exact accomplishments; supporting evidence; difficulties; learning; tomorrow's improvement.
Offer automatically when a nonempty plan's commitments complete, persisting offered plan revision to avoid repeated prompts. Manual review works for incomplete/rest days too. Reference task snapshots without requiring a false claim of completion.
Autosave answers using a short debounce plus blur/step-change flush and visible saved/error status. Persist before dismissing and support resumed/cross-device draft conflicts. A 5-second timer alone cannot guarantee draft safety.
Full milestone requires 200 substantive words across six responses. Exclude copied prompts and obvious duplicated sentences/repeated-token filler. Avoid rigid lexical-density/word-length gates that reject legitimate writing. Save shorter reflections without the milestone; no heuristic claims truth.
Atomically submit immutable reflection, completion references and unique milestone event. Corrections are appended amendments. Clear drafts only after durable submission. Review retries cannot duplicate awards.

## Proposed database and authorization

One shared Supabase project/Auth; dedicated launchpad schema, future apps in separate schemas. Internal sync tables in unexposed launchpad_internal. Schemas isolate names, not same-user bearer tokens. Another app holding the same project-wide user token may invoke Launchpad APIs. Strict isolation between untrusted apps needs separate projects or a trusted gateway with enforceable scoped capabilities; client-selected app_id is not authorization.

All owned rows use user_id; composite foreign keys include owner identity.
| Table | Essential keys/columns |
|---|---|
| launchpad.settings | user_id PK; schedule/timezone/preferences/revision |
| launchpad.tasks | (user_id,id) PK; task fields/lifecycle/revision/deleted_at |
| launchpad.daily_plans | (user_id,day_key) PK; commitment IDs, plan_revision, offered revision/rest flag |
| launchpad.review_drafts | (user_id,day_key) PK; six answers, completion IDs/revision |
| launchpad.reflections | (user_id,id) PK; UNIQUE(user_id,day_key); immutable answers/snapshots/word count/submission |
| launchpad.evidence | (user_id,event_id) PK; UNIQUE(user_id,semantic_key); raw facts/kind/source/rule/date/correction link; no cascading task FK |
| launchpad.achievements | (user_id,achievement_key) PK; evidence/criteria version/earned_at/legacy |
| launchpad.legacy_snapshots | (user_id,migration_id) PK; full old growth/history/achievements/reflections if present/checksum |
| internal.owner_sync_state | user_id PK; transactional sequence counter/protocol version |
| internal.mutation_receipts | (user_id,mutation_id) PK; request hash/result/revisions/sequence |
| internal.changes | (user_id,sequence) PK; entity/revision/operation; commit-ordered under owner lock |
| internal.deletion_fences | (user_id,kind,id) PK; deleted_at/revision; retain minimal fences indefinitely initially |

RLS: enable on every exposed owned table. SELECT TO authenticated USING (user_id = (select auth.uid())). Where INSERT is granted, WITH CHECK same owner. UPDATE requires both USING and WITH CHECK. Deny anonymous access and direct client writes to evidence/lifecycle/revisions/internal tables; use reviewed mutation RPCs. Owner policies do not validate business rules.
RPCs: apply_mutation, pull_changes, finalize_review, get_snapshot. Revoke EXECUTE from PUBLIC/anon; grant narrowly to authenticated; derive identity from auth.uid(), validate all references/transition rules, use fixed search_path and qualified tables. Prefer invoker when grants permit; a narrowly privileged definer is justified only to mediate writes denied to clients and requires explicit security review. Do not expose internal helpers. Frontend gets publishable key/project URL only; never service_role/database credentials.
Final DDL/grants/RPC bodies and authorization tests must be reviewed before cloud migration approval. This is a reviewable schema proposal, not a deployed or execution-ready migration.

## IndexedDB and synchronization

Local stores mirror domains plus completion staging, outbox, conflicts, checkpoints and migration/export manifests. Namespace by user; explicit local-only identity before login. Associating local data with an account is deliberate, not automatic. Logout stops that account's queue/cache without discarding its unsent data. Namespacing does not encrypt against same-origin scripts.
1. Local entity mutation + outbox append commit atomically; show Saved locally/Pending/Syncing/Synced/Conflict/Error. Failed save cannot show success.
2. Queue mutation ID, entity ID, predecessor, expected server revision, operation/facts, occurrence timestamp and rule version. Rebase dependent expected revisions after predecessor acknowledgement. Lease/Web Lock serializes local senders; server dedup remains authoritative.
3. Server locks owner_sync_state until commit; verifies mutation hash/receipt, deletion fence, revision and domain rules; writes entities/evidence/receipt/ordered changes atomically. Counter allocation must serialize commit visibility; a bare identity column is insufficient.
4. Pull per-owner sequences with fixed high-water mark/pagination; apply batch and checkpoint in one local transaction. Timestamp > lastTimestamp is unsafe for ties/late commits. Realtime only wakes durable pull.
5. Preserve concurrent edit versions for recovery. Deletion wins stale edits; create/upsert cannot bypass its fence. Resolve Undo/review races with causal operations and appended corrections, never duplicate rewards.
6. Retain minimal deletion fences/receipts indefinitely initially. Any later compaction needs an epoch/minimum cursor/full snapshot handshake preserving unsent operations/conflicts before reseeding. Never erase offline work.
7. Bounded backoff/jitter, reconnect/focus/resume triggers, auth-error pause, visible recovery. No client-clock last-write-wins.
8. Add a small offline PWA shell so installed Android/Windows apps reopen offline after initial load. Cache versioned static assets coherently; avoid caching authenticated API responses indiscriminately. No promise of closed-app background sync.

## Migration, export and recovery

Use isolated browser profiles/origins and fixture storage: a worktree alone does not isolate localhost browser data. No development operation may access actual user storage.
Capture raw Launchpad-owned data/legacy keys before sanitizer; never dump every key on an origin. Exact recovery capture may retain embedded OpenRouter credentials, so label it sensitive, keep explicit/local-only, never log it or silently export it as portable data. Separate credential keys are excluded. Default portable backup strips credentials. Hashes detect accidental damage, not truth/authorship.
Verify backup before activation; a rolling same-quota localStorage copy is insufficient. Stage migration in separate IndexedDB namespace; retain stable IDs or deterministic legacy ID maps. Compare IDs/content hashes/history totals/relationships as well as counts. Manifest makes migration resumable/idempotent.
Retain legacy store and rollback route; switch only after validation. Preserve/replay post-cutover writes on rollback. Source retirement is reversible in branch; real user-data activation/cleanup/token deletion and cloud changes require explicit approval.
Export domain/evidence/reflection/history and integrity manifest. Distinguish portable backup from device recovery containing outbox/conflicts. Stage/validate/preview merge or replace with pre-import backup; never blindly replay outbox onto another account. Preserve semantic event IDs to prevent duplicate XP.

## Implementation stages and acceptance

1. Reproducible baseline and additive backup/recovery helpers: fixture raw fidelity, checksums, tamper/quota/error handling, no UI/storage activation.
2. Domain contracts + IndexedDB repository + staged migration preview/copy: atomic rollback/retry, raw/history fidelity, idempotency, account isolation, rollback with new writes.
3. Integration retirement and fixture conversion: remove runtime/UI/proxy source, preserve contents/shared utilities, radar/recommender regression checks.
4. Lifecycle/evidence/XP: completion, Undo at 0/599 seconds, expiry at 600, reload/closure/resume, parent/subtask dedup, credit without review and permanent history.
5. Review/growth: six prompts, automatic/manual trigger, saved/error/resume, 199/200 words/filler, shorter permanent reflection, unique milestones, rest neutrality and legacy retention.
6. Local two-client sync simulation/PWA: offline dependent edits/reconnect, CAS, duplicate requests, delete-wins, cursor ties/late commits, reseed preserving unsent work, safe offline reload.
7. Final SQL/policies/RPC/migration bundle for explicit cloud approval: cross-user/owner reassignment/direct XP/anonymous denials, definer/grants review and restore rehearsal.
8. Approved cloud setup and real Android/Windows tests: login, offline/reconnect, simultaneous edits/deletion/Undo/review conflicts, export/recovery. Report limitations honestly.

Use Flash 3.8 Low for bounded checks/mechanical tasks; Medium for storage/lifecycle cross-file work; escalate only for identified failure/ambiguity. Coordinator handles planning/review. One implementation writer at a time, no duplicate assignments. No paid service approved; do not claim measured monetary savings without usage evidence.

## Verification

Baseline worker reports npm ci, npm test and npm run build exit 0; all 25 standalone suites executed, 23 passed. Existing failures: runtime TickTick completion reconciliation assertion in src/tests/ticktickVerification.test.ts; static SVG string checks in PetSprite.test.ts. No lint script exists. npm ci reports two moderate dependency advisories; no upgrade was performed. Log: docs/audit-evidence/baseline-verified.log (worker summary, not full raw transcript). Preserve these as baseline failures, not new regressions. Proposed lifecycle/review/IndexedDB/RLS/two-device behavior is untested until implemented.

Official documentation consulted: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/api/using-custom-schemas. These document RLS/schema mechanics; sync protocol is our design. Changelog markdown fetch failed with unsupported content type; fetch via compatible tooling and recheck before Supabase implementation.
