/**
 * Focused behavioral test suite for the local daily review service.
 * Runs inside Orca's built-in browser window (native IndexedDB), following the
 * existing tests/db harness pattern. No mocks; real repository + service code.
 *
 * Suites:
 * 1. A/B/A draft edits with unique per-attempt mutation IDs (no content-hash reuse conflicts)
 * 2. Same-save ambiguous retry replays the frozen request (fingerprint stable)
 * 3. Two independent sessions: stale edit conflicts, no silent overwrite, recovery via reload
 * 4. Reflection submit: committed / identical retry replayed from committed record / differing content conflict retained
 */

import {
  openLaunchpadDatabase,
  LaunchpadDatabase,
  RevisionConflictError,
} from '../../src/services/db';
import {
  LOCAL_REVIEW_OWNER,
  LocalReviewSession,
  getLocalDayKey,
  DraftSaveResult,
  ReviewDraft,
  ReflectionSnapshot,
  SubmitOutcome,
} from '../../src/services/reviews/localReviewService';
import type { ReviewDraftRecord, ReflectionRecord } from '../../src/domain/types';

export interface TestAssertionResult {
  passed: boolean;
  name: string;
  error?: string;
  durationMs: number;
}

export interface TestSuiteResult {
  suite: string;
  passed: boolean;
  assertions: TestAssertionResult[];
  durationMs: number;
}

export interface ReviewBehaviorTestReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  totalSuites: number;
  passedSuites: number;
  totalAssertions: number;
  passedAssertions: number;
  suites: TestSuiteResult[];
  durationMs: number;
}

let activeAssertions: TestAssertionResult[] = [];

function assert(condition: boolean, name: string): void {
  const start = performance.now();
  if (!condition) {
    const err = new Error(`Assertion failed: ${name}`);
    activeAssertions.push({ passed: false, name, error: err.stack || err.message, durationMs: performance.now() - start });
    throw err;
  }
  activeAssertions.push({ passed: true, name, durationMs: performance.now() - start });
}

function assertEqual<T>(actual: T, expected: T, name: string): void {
  const start = performance.now();
  if (actual !== expected) {
    const err = new Error(
      `Assertion failed: ${name} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
    );
    activeAssertions.push({ passed: false, name, error: err.stack || err.message, durationMs: performance.now() - start });
    throw err;
  }
  activeAssertions.push({ passed: true, name, durationMs: performance.now() - start });
}

type Six = [string, string, string, string, string, string];

const answersOf = (a: string, b: string, c: string, d: string, e: string, f: string): Six => [a, b, c, d, e, f];

function snapshot(dayKey: string, answers: Six, completed: string[] = []): ReflectionSnapshot {
  return {
    dayKey,
    answers,
    wordCount: 42,
    eligible: false,
    issues: [],
    submittedAt: new Date().toISOString(),
    completedTaskIds: completed,
  };
}

function draftOf(dayKey: string, answers: Six): ReviewDraft {
  return { dayKey, answers };
}

async function openFixtureDb(prefix: string): Promise<LaunchpadDatabase> {
  return openLaunchpadDatabase({ ownerId: LOCAL_REVIEW_OWNER, dbPrefix: prefix });
}

export async function runAllReviewBehaviorTests(): Promise<ReviewBehaviorTestReport> {
  const startTime = performance.now();
  const suites: TestSuiteResult[] = [];
  const testRunId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testPrefix = `lp_review_${testRunId}_`;
  const dayKey = getLocalDayKey();

  async function runSuite(name: string, fn: () => Promise<void>): Promise<void> {
    console.log(`Starting: ${name}`);
    const suiteStart = performance.now();
    activeAssertions = [];
    let suitePassed = true;

    try {
      await fn();
      console.log(`Finished: ${name}`);
    } catch (err) {
      console.error(`Failed: ${name} -> ${err}`);
      suitePassed = false;
      if (activeAssertions.length === 0 || activeAssertions[activeAssertions.length - 1].passed) {
        activeAssertions.push({
          passed: false,
          name: `Suite execution failed: ${name}`,
          error: err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err),
          durationMs: performance.now() - suiteStart,
        });
      }
    }

    suites.push({
      suite: name,
      passed: suitePassed && activeAssertions.every((a) => a.passed),
      assertions: [...activeAssertions],
      durationMs: performance.now() - suiteStart,
    });
  }

  // --------------------------------------------------------------------------
  // Suite 1: A/B/A with unique per-attempt mutation IDs
  // --------------------------------------------------------------------------
  await runSuite('1. A/B/A draft edits use unique mutation IDs and converge on latest content', async () => {
    const db = await openFixtureDb(testPrefix + 's1-');
    try {
      const session = new LocalReviewSession(db);
      await session.loadReviewState(dayKey); // seeds expected revision 0 (no draft yet)

      const a: Six = answersOf('draft A1', '', '', '', '', '');
      const b: Six = answersOf('draft B differs', '', '', '', '', '');

      const saveA1: DraftSaveResult = await session.saveReviewDraft(draftOf(dayKey, a));
      assertEqual(saveA1.wasReplay, false, 'first save is a fresh commit');
      assertEqual(saveA1.draft.draft_revision, 1, 'first save creates revision 1');
      assert(
        !saveA1.attempt.mutationId.includes('A1') && !saveA1.attempt.mutationId.includes('different'),
        'mutation ID is not derived from answer content (no content hashing)'
      );
      assert(
        /:\d+$/.test(saveA1.attempt.mutationId),
        'mutation ID ends in a per-attempt sequence number'
      );
      const firstSeq = Number(saveA1.attempt.mutationId.split(':').pop());

      const saveB: DraftSaveResult = await session.saveReviewDraft(draftOf(dayKey, b));
      assertEqual(saveB.wasReplay, false, 'content change is a fresh commit, not a replay');
      assertEqual(saveB.draft.draft_revision, 2, 'content change advances revision to 2');
      assert(
        saveB.attempt.mutationId !== saveA1.attempt.mutationId &&
          Number(saveB.attempt.mutationId.split(':').pop()) > firstSeq,
        'content change gets a NEW higher-sequence mutation ID'
      );

      const backToA: DraftSaveResult = await session.saveReviewDraft(draftOf(dayKey, a));
      assertEqual(backToA.wasReplay, false, 'return to previous wording is a fresh commit, NOT a replay of the old mutation');
      assertEqual(backToA.draft.draft_revision, 3, 'A-again creates revision 3');
      assert(backToA.attempt.mutationId !== saveA1.attempt.mutationId, 'A-again does NOT reuse the first A mutation ID');

      const stored = await session.loadReviewState(dayKey);
      assertEqual(stored.draft?.answers[0], a[0], 'stored draft converges on latest content (A again)');
      assertEqual(stored.draft?.draft_revision, 3, 'stored draft revision is 3');
    } finally {
      db.close();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 2: Same-save ambiguous retry replays the frozen request
  // --------------------------------------------------------------------------
  await runSuite('2. Identical-content retry replays frozen immutable request with exact committed result', async () => {
    const db = await openFixtureDb(testPrefix + 's2-');
    try {
      const session = new LocalReviewSession(db);
      await session.loadReviewState(dayKey);

      const s1: Six = answersOf('ambiguous retry save', '', '', '', '', '');
      const committed: DraftSaveResult = await session.saveReviewDraft(draftOf(dayKey, s1));
      assertEqual(committed.wasReplay, false, 'initial save commits');

      // Ambiguous-failure retry at the repository level with the EXACT frozen
      // request values (same mutation ID, same frozen timestamp, same frozen
      // expected revision 0 from before the first commit) — precisely what
      // LocalReviewSession reuses on identical-content retry.
      const frozenRecord = {
        owner_id: LOCAL_REVIEW_OWNER,
        day_key: committed.draft.day_key,
        answers: committed.attempt.answers,
        completion_ids: [],
        plan_revision: 0,
        draft_revision: 1,
        updated_at: committed.attempt.updatedAt,
      };
      const replay = await db.saveReviewDraft(
        frozenRecord as ReviewDraftRecord,
        committed.attempt.mutationId,
        0 // frozen expected revision of the original attempt — must match its fingerprint
      );

      assertEqual(replay.wasReplayed, true, 'identical retry is a receipt replay (fingerprint stable)');
      assertEqual(replay.entity?.draft_revision, committed.draft.draft_revision, 'replay returns the exact committed revision');
      assertEqual(replay.entity?.updated_at, committed.draft.updated_at, 'replay returns the frozen committed timestamp');
      assertEqual(replay.entity?.answers[0], s1[0], 'replay returns the exact committed answers');
    } finally {
      db.close();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 3: Two independent sessions — stale edit conflicts, no overwrite
  // --------------------------------------------------------------------------
  await runSuite('3. Stale session save conflicts without re-reading; committed draft preserved', async () => {
    const db = await openFixtureDb(testPrefix + 's3-');
    try {
      const sessionA = new LocalReviewSession(db);
      const sessionStale = new LocalReviewSession(db);

      await sessionA.loadReviewState(dayKey);
      await sessionStale.loadReviewState(dayKey); // both seed revision 0

      const contentA: Six = answersOf('session A newer content', '', '', '', '', '');
      const committed = await sessionA.saveReviewDraft(draftOf(dayKey, contentA));
      assertEqual(committed.draft.draft_revision, 1, 'session A commits revision 1');

      const staleContent: Six = answersOf('stale editor overwrite attempt', '', '', '', '', '');
      let conflictError: unknown = null;
      try {
        // Stale session still holds expected revision 0; must conflict WITHOUT
        // re-reading the latest revision to retry over it.
        await sessionStale.saveReviewDraft(draftOf(dayKey, staleContent));
      } catch (err) {
        conflictError = err;
      }
      assert(conflictError instanceof RevisionConflictError, 'stale save conflicts with RevisionConflictError');

      const afterConflict = await sessionA.loadReviewState(dayKey);
      assertEqual(afterConflict.draft?.answers[0], contentA[0], 'committed draft NOT overwritten by stale editor');
      assertEqual(afterConflict.draft?.draft_revision, 1, 'draft revision unchanged after conflict');

      // Recovery: stale session reloads (re-seeds held revision) then saves cleanly.
      await sessionStale.loadReviewState(dayKey);
      const reloadedSave = await sessionStale.saveReviewDraft(draftOf(dayKey, staleContent));
      assertEqual(reloadedSave.wasReplay, false, 'reloaded stale session saves cleanly');
      assertEqual(reloadedSave.draft.draft_revision, 2, 'reloaded save advances revision to 2');
      const finalState = await sessionA.loadReviewState(dayKey);
      assertEqual(finalState.draft?.answers[0], staleContent[0], 'final content is the reloaded session save');
    } finally {
      db.close();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 4: Reflection submit — committed / replayed / conflict
  // --------------------------------------------------------------------------
  await runSuite('4. Differing submission conflicts with both contents retained; identical retry replays', async () => {
    const db = await openFixtureDb(testPrefix + 's4-');
    try {
      const session1 = new LocalReviewSession(db);
      const session2 = new LocalReviewSession(db);

      const contentX: Six = answersOf('submitted content X1', 'X2', 'X3', 'X4', 'X5', 'X6');
      const snapX = snapshot(dayKey, contentX, ['task-1', 'task-2']);

      const commitX: SubmitOutcome = await session1.submitReviewReflection(snapX);
      assertEqual(commitX.status, 'committed', 'first submit commits');
      const committedX: ReflectionRecord =
        commitX.status === 'committed' ? commitX.reflection : (null as never);
      assertEqual(committedX.answers[0], contentX[0], 'committed record serves exact content');
      assertEqual(committedX.id, `reflection:${dayKey}`, 'reflection record has day-scoped immutable ID');
      assertEqual(committedX.completion_ids.length, 2, 'committed record captures completion IDs');
      assert(committedX.submission_hash.length >= 32, 'submission hash is not a weak 32-bit value');

      // Identical-content retry (ambiguous-failure simulation) from a fresh session.
      const snapXRetry: ReflectionSnapshot = snapshot(dayKey, contentX, ['task-1', 'task-2']);
      const replayX: SubmitOutcome = await session2.submitReviewReflection(snapXRetry);
      assertEqual(replayX.status, 'replayed', 'identical-content submit replays');
      const replayedX: ReflectionRecord = (replayX as { status: 'replayed' }).reflection;
      // Map is compared field-wise: ALL UI fields must come from the committed record.
      assertEqual(replayedX.id, committedX.id, 'replay record id matches committed');
      assertEqual(replayedX.day_key, committedX.day_key, 'replay record day_key matches committed');
      assertEqual(JSON.stringify(replayedX.answers), JSON.stringify(committedX.answers), 'replay record answers match committed');
      assertEqual(JSON.stringify(replayedX.completion_ids), JSON.stringify(committedX.completion_ids), 'replay record completion_ids match committed');
      assertEqual(replayedX.word_count, committedX.word_count, 'replay record word_count matches committed');
      assertEqual(replayedX.submitted_at, committedX.submitted_at, 'replay record submitted_at matches committed');
      assertEqual(replayedX.submission_hash, committedX.submission_hash, 'replay record submission_hash matches committed');

      // Different content → conflict, everything preserved, nothing overwritten.
      const contentY: Six = answersOf('attempted different Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6');
      const snapY = snapshot(dayKey, contentY, ['task-1', 'task-2']);
      const conflictY: SubmitOutcome = await session2.submitReviewReflection(snapY);
      assertEqual(conflictY.status, 'conflict', 'differing content returns conflict, NOT fake success');
      const conflicted = conflictY as { status: 'conflict'; committed: ReflectionRecord; attempted: ReflectionSnapshot };
      assertEqual(JSON.stringify(conflicted.committed), JSON.stringify(committedX), 'conflict carries the exact committed record (kept text)');
      assertEqual(conflicted.attempted.answers[0], contentY[0], 'conflict carries the attempted content (both texts retained)');

      const afterConflict = await db.getReflection(dayKey);
      assertEqual(afterConflict?.answers[0], contentX[0], 'stored reflection still the first committed content (no overwrite)');

      // Same-day repeat of identical X from its own session stays replay-safe.
      const repeatX: SubmitOutcome = await session1.submitReviewReflection(snapshot(dayKey, contentX, ['task-1', 'task-2']));
      assertEqual(repeatX.status, 'replayed', 'repeat identical submit from owning session remains replay');
      const repeatedX: ReflectionRecord = (repeatX as { status: 'replayed' }).reflection;
      assertEqual(repeatedX.submitted_at, committedX.submitted_at, 'repeat replay serves the committed timestamp');
    } finally {
      db.close();
    }
  });

  return {
    browser: 'Orca Built-in Browser (window.indexedDB)',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    passed: suites.every((s) => s.passed),
    totalSuites: suites.length,
    passedSuites: suites.filter((s) => s.passed).length,
    totalAssertions: suites.reduce((acc, s) => acc + s.assertions.length, 0),
    passedAssertions: suites.reduce((acc, s) => acc + s.assertions.filter((a) => a.passed).length, 0),
    suites,
    durationMs: performance.now() - startTime,
  };
}
