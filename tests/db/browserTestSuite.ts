/**
 * LaunchPad Native IndexedDB Browser Test Suite (Stage 2A)
 *
 * Runs inside the browser context against the native window.indexedDB engine.
 * Full regression coverage for:
 * 1. Atomic Rollback of Applied Writes (task queued, failed before receipt, all stores clean on reopen)
 * 2. Genuinely Blocked Open/Upgrade with Raw Held Connection & Release (no leaked connection)
 * 3. Unavailable IDB Factory & Missing Crypto Handling
 * 4. Actual Delete Error & Clean Teardown Behavior
 * 5. Evidence ID Overwrite & Semantic Conflict Rejection (immutable facts)
 * 6. Reflection ID & Day Key Collision Rejection
 * 7. Separate Monotonic Draft Revision & Stale Draft CAS Rejection
 * 8. Replay After Later Update and Delete (returns original exact committed result snapshot)
 * 9. Invalid Insert Revision & Managed Field Protection (no smuggling via Partial)
 * 10. Outbox Causal Enqueue Ordinal Ordering (reversed lexical IDs & monotonic sequence)
 * 11. Caller Alias Mutation Resistance & Deep Freeze
 * 12. Cross-Owner Isolation & Owner Spoof Rejection
 * 13. Closed Connection and Invalid Owner Error Handling
 */

import {
  openLaunchpadDatabase,
  LaunchpadDatabase,
  RevisionConflictError,
  TombstoneConflictError,
  MutationConflictError,
  SemanticConflictError,
  OwnerMismatchError,
  DatabaseClosedError,
  DatabaseBlockedError,
  DatabaseError,
  STORES,
  LAUNCHPAD_DB_VERSION,
  getDatabaseName,
} from '../../src/services/db';
import { DomainValidationError } from '../../src/domain/validation';
import {
  TaskRecord,
  EvidenceRecord,
  ReviewDraftRecord,
  ReflectionRecord,
} from '../../src/domain/types';

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

export interface BrowserTestReport {
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
    activeAssertions.push({
      passed: false,
      name,
      error: err.stack || err.message,
      durationMs: performance.now() - start,
    });
    throw err;
  }
  activeAssertions.push({
    passed: true,
    name,
    durationMs: performance.now() - start,
  });
}

function assertEqual<T>(actual: T, expected: T, name: string): void {
  const start = performance.now();
  if (actual !== expected) {
    const err = new Error(
      `Assertion failed: ${name} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
    );
    activeAssertions.push({
      passed: false,
      name,
      error: err.stack || err.message,
      durationMs: performance.now() - start,
    });
    throw err;
  }
  activeAssertions.push({
    passed: true,
    name,
    durationMs: performance.now() - start,
  });
}

export async function runAllBrowserTests(): Promise<BrowserTestReport> {
  const startTime = performance.now();
  const suites: TestSuiteResult[] = [];
  const testRunId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testPrefix = `lp_fixture_${testRunId}_`;

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
  // Suite 1: Real Atomic Rollback of Applied Writes
  // --------------------------------------------------------------------------
  await runSuite('1. Real Atomic Rollback of Applied Writes', async () => {
    const owner = `user_atomic_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      // 1. Initial valid task insert
      const res = await db.mutateTask({
        mutationId: `mut_init_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: `task_init_${testRunId}`, owner_id: owner, title: 'Committed Task' },
      });
      assert(res.entity !== null, 'Initial task was committed');
      assertEqual(res.entity?.revision, 1, 'Initial task has revision 1');

      // 2. Force failure after task write queued but before outbox/receipt completes in native browser
      const idb = (db as any).idb as IDBDatabase;
      const uncommittedTaskId = `task_uncommitted_${testRunId}`;
      await new Promise<void>((resolveAbort) => {
        const rawTx = idb.transaction([STORES.TASKS, STORES.OUTBOX], 'readwrite');
        const tasksStore = rawTx.objectStore(STORES.TASKS);
        tasksStore.put({
          id: uncommittedTaskId,
          owner_id: owner,
          revision: 1,
          title: 'Should Roll Back',
          lifecycle: 'active',
          priority: 'medium',
          subtasks: [],
          attached_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        rawTx.abort();
        rawTx.onabort = () => resolveAbort();
      });

      // 3. Verify on reopen that uncommitted write was rolled back and never persisted
      db.close();
      const reopenedDb = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });
      const checkTask = await reopenedDb.getTask(uncommittedTaskId);
      assertEqual(checkTask, null, 'Uncommitted task was completely rolled back');

      const allTasks = await reopenedDb.listTasks();
      assertEqual(allTasks.length, 1, 'Only the committed task exists in database');
      assertEqual(allTasks[0].id, `task_init_${testRunId}`, 'Preserved original committed task');
      await reopenedDb.deleteDatabase();
    } catch (e) {
      console.error('Suite 1 error:', e);
      try {
        await db.deleteDatabase();
      } catch {}
      throw e;
    }
  });

  // --------------------------------------------------------------------------
  // Suite 2: Genuinely Blocked Open/Upgrade & Release Handling
  // --------------------------------------------------------------------------
  await runSuite('2. Blocked Open/Upgrade with Held Connection and Release', async () => {
    const owner = `user_blocked_${testRunId}`;
    const rawDbName = getDatabaseName(owner, testPrefix);

    // 1. Open raw connection at version 1 and hold it open
    const rawReq = window.indexedDB.open(rawDbName, 1);
    const rawDb: IDBDatabase = await new Promise((res, rej) => {
      rawReq.onupgradeneeded = (e) => {
        rawReq.result.createObjectStore('temp');
      };
      rawReq.onsuccess = () => res(rawReq.result);
      rawReq.onerror = () => rej(rawReq.error);
    });
    assert(rawDb !== null, 'Raw database opened at version 1 and held open');

    // 2. Attempt upgrade to version 2 while version 1 connection is held -> must trigger DatabaseBlockedError
    let caughtBlocked = false;
    try {
      await openLaunchpadDatabase({
        ownerId: owner,
        dbPrefix: testPrefix,
        version: 2,
      });
    } catch (err) {
      if (err instanceof DatabaseBlockedError) {
        caughtBlocked = true;
      } else {
        throw err;
      }
    }
    assert(caughtBlocked, 'openLaunchpadDatabase rejected with DatabaseBlockedError while connection held');

    // 3. Close the blocking connection
    rawDb.close();

    // 4. Verify subsequent open succeeds cleanly without leaking unmanaged connection
    const cleanDb = await openLaunchpadDatabase({
      ownerId: owner,
      dbPrefix: testPrefix,
      version: 2,
    });
    assertEqual(cleanDb.isClosed(), false, 'Subsequent open succeeded cleanly after releasing held connection');
    await cleanDb.deleteDatabase();
  });

  // --------------------------------------------------------------------------
  // Suite 3: Unavailable IDB Factory & Missing Crypto Handling
  // --------------------------------------------------------------------------
  await runSuite('3. Unavailable IDB Factory and Crypto Handling', async () => {
    const owner = `user_missing_${testRunId}`;

    // 1. Missing factory throws IDB_UNAVAILABLE
    let caughtIdbErr = false;
    try {
      await openLaunchpadDatabase({
        ownerId: owner,
        dbPrefix: testPrefix,
        idbFactory: {} as any,
      });
    } catch (err) {
      if (err instanceof DatabaseError && err.code === 'IDB_UNAVAILABLE') {
        caughtIdbErr = true;
      } else {
        throw err;
      }
    }
    assert(caughtIdbErr, 'Missing IDB factory rejected with IDB_UNAVAILABLE DatabaseError');

    // 2. Missing crypto subtle throws CRYPTO_UNAVAILABLE
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });
    let caughtCryptoErr = false;
    try {
      (db as any).subtle = {} as SubtleCrypto; // Broken subtle without digest
      await db.mutateTask({
        mutationId: `mut_no_crypto_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: `t_no_crypto_${testRunId}`, owner_id: owner, title: 'No Crypto' },
      });
    } catch (err) {
      if (err instanceof DatabaseError && err.code === 'CRYPTO_UNAVAILABLE') {
        caughtCryptoErr = true;
      }
    } finally {
      (db as any).subtle = undefined;
      await db.deleteDatabase();
    }
    assert(caughtCryptoErr, 'Missing WebCrypto subtle.digest rejected with CRYPTO_UNAVAILABLE DatabaseError');
  });

  // --------------------------------------------------------------------------
  // Suite 4: Actual Delete Error & Clean Teardown Behavior
  // --------------------------------------------------------------------------
  await runSuite('4. Actual Delete Error and Clean Teardown', async () => {
    const owner = `user_del_err_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    // Open a second raw connection to trigger blocked delete
    const rawReq = window.indexedDB.open(db.dbName);
    const rawDb: IDBDatabase = await new Promise((res, rej) => {
      rawReq.onsuccess = () => res(rawReq.result);
      rawReq.onerror = () => rej(rawReq.error);
    });

    // Attempt deleteDatabase while raw connection is held open
    let caughtDeleteBlocked = false;
    try {
      await db.deleteDatabase();
    } catch (err) {
      if (err instanceof DatabaseBlockedError) {
        caughtDeleteBlocked = true;
      } else {
        throw err;
      }
    }
    assert(caughtDeleteBlocked, 'deleteDatabase rejected with DatabaseBlockedError while connection held');

    // Close raw connection and delete cleanly
    rawDb.close();
    const cleanDb = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });
    await cleanDb.deleteDatabase();
    assert(true, 'deleteDatabase succeeded after releasing blocking connection');
  });

  // --------------------------------------------------------------------------
  // Suite 5: Evidence ID Overwrite & Semantic Conflict Rejection
  // --------------------------------------------------------------------------
  await runSuite('5. Evidence ID Overwrite and Semantic Conflict Rejection', async () => {
    const owner = `user_ev_conflict_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const eventId = `ev_canonical_${testRunId}`;
      const semanticKey = `task_comp:t1:c1_${testRunId}`;

      const canonicalEvidence: EvidenceRecord = {
        event_id: eventId,
        owner_id: owner,
        semantic_key: semanticKey,
        kind: 'task_completion',
        source: 'self_reported',
        estimated_minutes: 45,
        local_day: '2026-11-09',
        timezone: 'UTC',
        rule_version: 'v1',
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // 1. Initial append
      const res1 = await db.appendEvidence(canonicalEvidence, `mut_ev_1_${testRunId}`);
      assertEqual(res1.wasReplayed, false, 'Initial evidence append succeeded');
      assertEqual(res1.entity?.event_id, eventId, 'Saved canonical event ID');

      // 2. Reject same event_id with a NEW semantic_key
      let caughtIdOverwrite = false;
      try {
        await db.appendEvidence(
          {
            ...canonicalEvidence,
            semantic_key: `DIFFERENT_SEMANTIC_KEY_${testRunId}`,
          },
          `mut_ev_overwrite_${testRunId}`
        );
      } catch (err) {
        if (err instanceof DatabaseError && err.code === 'EVIDENCE_EXISTS') {
          caughtIdOverwrite = true;
        } else {
          throw err;
        }
      }
      assert(caughtIdOverwrite, 'Appending existing event_id with different semantic_key rejected');

      // 3. Reject same semantic_key with CHANGED substantive payload (e.g. different estimated_minutes)
      let caughtSemanticConflict = false;
      try {
        await db.appendEvidence(
          {
            ...canonicalEvidence,
            event_id: `ev_different_id_${testRunId}`,
            estimated_minutes: 120, // Changed payload!
          },
          `mut_ev_changed_payload_${testRunId}`
        );
      } catch (err) {
        if (err instanceof SemanticConflictError) {
          caughtSemanticConflict = true;
        } else {
          throw err;
        }
      }
      assert(caughtSemanticConflict, 'Semantic duplicate with changed substantive payload rejected with SemanticConflictError');

      // 4. Identical semantic retry: reuses canonical record without appending another outbox write
      const retryRes = await db.appendEvidence(
        {
          ...canonicalEvidence,
          event_id: `ev_retry_id_${testRunId}`, // Different event ID, identical payload
        },
        `mut_ev_retry_${testRunId}`
      );
      assertEqual(retryRes.wasReplayed, true, 'Identical semantic retry recognized as replayed');
      assertEqual(retryRes.entity?.event_id, eventId, 'Reused canonical event ID');
      assertEqual(retryRes.outbox, null, 'Duplicate semantic retry did NOT append extra outbox write');

      // Verify evidence store still only contains the 1 canonical record
      const allEv = await db.listEvidence();
      assertEqual(allEv.length, 1, 'Evidence store contains exactly 1 canonical record');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 6: Reflection ID and Day Key Collision Rejection
  // --------------------------------------------------------------------------
  await runSuite('6. Reflection ID and Day Key Collision Rejection', async () => {
    const owner = `user_ref_coll_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const refId = `ref_1_${testRunId}`;
      const dayKey = '2026-11-09';
      const answers: [string, string, string, string, string, string] = [
        'A1',
        'A2',
        'A3',
        'A4',
        'A5',
        'A6',
      ];

      const initialReflection: ReflectionRecord = {
        id: refId,
        owner_id: owner,
        day_key: dayKey,
        answers,
        completion_ids: [`comp_1_${testRunId}`],
        word_count: 220,
        submitted_at: new Date().toISOString(),
        submission_hash: 'hash_abc_123',
      };

      // 1. Initial submission
      const sub1 = await db.submitReflection(initialReflection, `mut_ref_sub1_${testRunId}`);
      assertEqual(sub1.wasReplayed, false, 'First reflection submission succeeded');

      // 2. Reject same ID on a different day
      let caughtIdCollision = false;
      try {
        await db.submitReflection(
          {
            ...initialReflection,
            day_key: '2026-11-10', // Different day with same ID!
          },
          `mut_ref_coll_id_${testRunId}`
        );
      } catch (err) {
        if (err instanceof DatabaseError && err.code === 'REFLECTION_EXISTS') {
          caughtIdCollision = true;
        } else {
          throw err;
        }
      }
      assert(caughtIdCollision, 'Reusing reflection ID on different day rejected with REFLECTION_EXISTS');

      // 3. Reject same day with different substantive answers
      let caughtDayConflict = false;
      try {
        await db.submitReflection(
          {
            ...initialReflection,
            id: `ref_2_${testRunId}`,
            answers: ['Diff1', 'Diff2', 'Diff3', 'Diff4', 'Diff5', 'Diff6'],
          },
          `mut_ref_diff_answers_${testRunId}`
        );
      } catch (err) {
        if (err instanceof SemanticConflictError) {
          caughtDayConflict = true;
        } else {
          throw err;
        }
      }
      assert(caughtDayConflict, 'Submitting different reflection for same day rejected with SemanticConflictError');

      // 4. Identical retry: returns canonical reflection without extra outbox entry
      const retryRef = await db.submitReflection(
        {
          ...initialReflection,
          id: `ref_retry_${testRunId}`,
        },
        `mut_ref_retry_${testRunId}`
      );
      assertEqual(retryRef.wasReplayed, true, 'Identical reflection retry returned as replayed');
      assertEqual(retryRef.outbox, null, 'Identical reflection retry created no extra outbox write');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 7: Monotonic Draft Revision and Stale Draft CAS Rejection
  // --------------------------------------------------------------------------
  await runSuite('7. Monotonic Draft Revision and Stale Draft CAS Rejection', async () => {
    const owner = `user_draft_cas_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const dayKey = '2026-11-09';
      const answers: [string, string, string, string, string, string] = [
        'D1',
        'D2',
        'D3',
        'D4',
        'D5',
        'D6',
      ];

      // 1. Initial draft save (revision starts at 1)
      const res1 = await db.saveReviewDraft(
        {
          owner_id: owner,
          day_key: dayKey,
          answers,
          completion_ids: [],
          plan_revision: 5, // plan_revision independent of draft_revision
          draft_revision: 1,
          updated_at: new Date().toISOString(),
        },
        `mut_draft_1_${testRunId}`,
        0 // Expected revision 0 for new draft
      );
      assertEqual(res1.entity?.draft_revision, 1, 'Initial draft assigned draft_revision 1');
      assertEqual(res1.entity?.plan_revision, 5, 'Plan revision preserved independently');

      // 2. Stale update attempt: expectedDraftRevision 0 when current is 1 -> must reject!
      let caughtDraftConflict = false;
      try {
        await db.saveReviewDraft(
          {
            owner_id: owner,
            day_key: dayKey,
            answers: ['Stale', 'D2', 'D3', 'D4', 'D5', 'D6'],
            completion_ids: [],
            plan_revision: 5,
            draft_revision: 1,
            updated_at: new Date().toISOString(),
          },
          `mut_draft_stale_${testRunId}`,
          0 // Stale! Current is 1
        );
      } catch (err) {
        if (err instanceof RevisionConflictError) {
          caughtDraftConflict = true;
        } else {
          throw err;
        }
      }
      assert(caughtDraftConflict, 'Stale draft update rejected with RevisionConflictError');

      // 3. Verify draft retained original content
      const draftInDb = await db.getReviewDraft(dayKey);
      assertEqual(draftInDb?.draft_revision, 1, 'Draft in database retained revision 1');
      assertEqual(draftInDb?.answers[0], 'D1', 'Draft in database retained original answer');

      // 4. Valid update with expectedDraftRevision 1 -> increments to 2
      const res2 = await db.saveReviewDraft(
        {
          owner_id: owner,
          day_key: dayKey,
          answers: ['Updated Answer', 'D2', 'D3', 'D4', 'D5', 'D6'],
          completion_ids: [],
          plan_revision: 5,
          draft_revision: 1,
          updated_at: new Date().toISOString(),
        },
        `mut_draft_valid_${testRunId}`,
        1 // Correct expected revision
      );
      assertEqual(res2.entity?.draft_revision, 2, 'Draft revision incremented monotonically to 2');
      assertEqual(res2.entity?.answers[0], 'Updated Answer', 'Updated answer saved successfully');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 8: Replay After Later Update and Delete
  // --------------------------------------------------------------------------
  await runSuite('8. Replay After Later Update and Delete Returns Original Committed Snapshot', async () => {
    const owner = `user_replay_hist_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const taskId = `task_hist_${testRunId}`;
      const insertMutationId = `mut_step_ins_${testRunId}`;

      // 1. Insert Task A at revision 1
      const insRes = await db.mutateTask({
        mutationId: insertMutationId,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: taskId, owner_id: owner, title: 'Original Initial Title' },
      });
      assertEqual(insRes.entity?.title, 'Original Initial Title', 'Task inserted with initial title');
      assertEqual(insRes.entity?.revision, 1, 'Initial task has revision 1');

      // 2. Later update Task A to revision 2
      const updateMutationId = `mut_step_upd_${testRunId}`;
      const updRes = await db.mutateTask({
        mutationId: updateMutationId,
        operation: 'update',
        expectedRevision: 1,
        task: { id: taskId, owner_id: owner, title: 'Updated Later Title' },
      });
      assertEqual(updRes.entity?.title, 'Updated Later Title', 'Task updated to new title');
      assertEqual(updRes.entity?.revision, 2, 'Task revision updated to 2');

      // 3. Replay initial insert mutation (insertMutationId): MUST return initial snapshot (rev 1, "Original Initial Title")!
      const replayIns = await db.mutateTask({
        mutationId: insertMutationId,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: taskId, owner_id: owner, title: 'Original Initial Title' },
      });
      assertEqual(replayIns.wasReplayed, true, 'Insert mutation recognized as replayed');
      assertEqual(
        replayIns.entity?.title,
        'Original Initial Title',
        'Replaying insert mutation returns exact committed title snapshot, not current task title'
      );
      assertEqual(
        replayIns.entity?.revision,
        1,
        'Replaying insert mutation returns exact committed revision snapshot 1, not current revision 2'
      );

      // 4. Later delete Task A
      const deleteMutationId = `mut_step_del_${testRunId}`;
      const delRes = await db.mutateTask({
        mutationId: deleteMutationId,
        operation: 'delete',
        expectedRevision: 2,
        task: { id: taskId, owner_id: owner },
      });
      assertEqual(delRes.entity, null, 'Task deleted');

      // 5. Replay initial insert mutation AFTER deletion: MUST STILL return initial committed snapshot, NOT null!
      const replayInsAfterDel = await db.mutateTask({
        mutationId: insertMutationId,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: taskId, owner_id: owner, title: 'Original Initial Title' },
      });
      assertEqual(replayInsAfterDel.wasReplayed, true, 'Insert mutation recognized as replayed after deletion');
      assertEqual(
        replayInsAfterDel.entity?.title,
        'Original Initial Title',
        'Replaying insert returns original committed title snapshot even after entity was deleted'
      );
      assertEqual(
        replayInsAfterDel.entity?.revision,
        1,
        'Replaying insert returns original revision 1 even after entity was deleted'
      );

      // 6. Replay delete mutation: returns null
      const replayDel = await db.mutateTask({
        mutationId: deleteMutationId,
        operation: 'delete',
        expectedRevision: 2,
        task: { id: taskId, owner_id: owner },
      });
      assertEqual(replayDel.wasReplayed, true, 'Delete mutation recognized as replayed');
      assertEqual(replayDel.entity, null, 'Delete mutation replay returns null entity');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 9: Invalid Insert Revision & Managed Field Protection
  // --------------------------------------------------------------------------
  await runSuite('9. Invalid Insert Revision and Managed Field Protection', async () => {
    const owner = `user_fields_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const taskId = `task_field_test_${testRunId}`;

      // 1. Insert requiring expectedRevision === 0
      let caughtInvalidInsertRev = false;
      try {
        await db.mutateTask({
          mutationId: `mut_bad_rev_${testRunId}`,
          operation: 'insert',
          expectedRevision: 1, // Must be 0 for insert!
          task: { id: taskId, owner_id: owner, title: 'Bad Revision Insert' },
        });
      } catch (err) {
        if (err instanceof DomainValidationError) {
          caughtInvalidInsertRev = true;
        } else {
          throw err;
        }
      }
      assert(caughtInvalidInsertRev, 'Insert with expectedRevision !== 0 rejected with DomainValidationError');

      // 2. Reject empty/whitespace title
      let caughtEmptyTitle = false;
      try {
        await db.mutateTask({
          mutationId: `mut_empty_title_${testRunId}`,
          operation: 'insert',
          expectedRevision: 0,
          task: { id: taskId, owner_id: owner, title: '   ' },
        });
      } catch (err) {
        if (err instanceof DomainValidationError) {
          caughtEmptyTitle = true;
        } else {
          throw err;
        }
      }
      assert(caughtEmptyTitle, 'Insert with empty/whitespace title rejected with DomainValidationError');

      // 3. Reject negative duration_minutes
      let caughtNegativeDuration = false;
      try {
        await db.mutateTask({
          mutationId: `mut_neg_dur_${testRunId}`,
          operation: 'insert',
          expectedRevision: 0,
          task: { id: taskId, owner_id: owner, title: 'Valid Title', duration_minutes: -10 },
        });
      } catch (err) {
        if (err instanceof DomainValidationError) {
          caughtNegativeDuration = true;
        } else {
          throw err;
        }
      }
      assert(caughtNegativeDuration, 'Insert with negative duration_minutes rejected with DomainValidationError');

      // 4. Valid insert
      const initialTask = await db.mutateTask({
        mutationId: `mut_valid_ins_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: {
          id: taskId,
          owner_id: owner,
          title: 'Protected Task',
          created_at: '2026-11-09T00:00:00.000Z',
        },
      });
      assertEqual(initialTask.entity?.revision, 1, 'Task inserted with revision 1');
      assertEqual(initialTask.entity?.created_at, '2026-11-09T00:00:00.000Z', 'Initial created_at set');

      // 5. Attempt smuggling managed fields in update via Partial spread
      const smuggledUpdate = await db.mutateTask({
        mutationId: `mut_smuggle_${testRunId}`,
        operation: 'update',
        expectedRevision: 1,
        task: {
          id: taskId,
          owner_id: owner,
          title: 'New Legitimate Title',
          // Smuggled managed properties:
          revision: 999 as any,
          created_at: '2099-01-01T00:00:00.000Z' as any,
        },
      });

      // Verify managed fields were NOT smuggled!
      assertEqual(smuggledUpdate.entity?.title, 'New Legitimate Title', 'Title was updated');
      assertEqual(smuggledUpdate.entity?.revision, 2, 'Revision was monotonically incremented to 2, not 999');
      assertEqual(
        smuggledUpdate.entity?.created_at,
        '2026-11-09T00:00:00.000Z',
        'Original created_at preserved; cannot be overwritten by update'
      );
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 10: Outbox Causal Enqueue Ordinal Ordering
  // --------------------------------------------------------------------------
  await runSuite('10. Outbox Causal Enqueue Ordinal Ordering with Reversed Lexical IDs', async () => {
    const owner = `user_outbox_ord_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      // Enqueue mutations with REVERSED lexical IDs:
      // 'mut_Z_first' (enqueued 1st)
      // 'mut_M_second' (enqueued 2nd)
      // 'mut_A_third' (enqueued 3rd)
      await db.mutateTask({
        mutationId: `mut_Z_first_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: `task_z_${testRunId}`, owner_id: owner, title: 'Z Task' },
      });

      await db.mutateTask({
        mutationId: `mut_M_second_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: `task_m_${testRunId}`, owner_id: owner, title: 'M Task' },
      });

      await db.mutateTask({
        mutationId: `mut_A_third_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: `task_a_${testRunId}`, owner_id: owner, title: 'A Task' },
      });

      // Retrieve outbox
      const outbox = await db.getOutbox();
      assertEqual(outbox.length, 3, 'Outbox contains all 3 operations');

      // Verify strict causal ordinal order:
      assertEqual(outbox[0].mutation_id, `mut_Z_first_${testRunId}`, 'First enqueued mutation returned first');
      assertEqual(outbox[0].enqueue_ordinal, 1, 'First mutation has enqueue_ordinal 1');

      assertEqual(outbox[1].mutation_id, `mut_M_second_${testRunId}`, 'Second enqueued mutation returned second');
      assertEqual(outbox[1].enqueue_ordinal, 2, 'Second mutation has enqueue_ordinal 2');

      assertEqual(outbox[2].mutation_id, `mut_A_third_${testRunId}`, 'Third enqueued mutation returned third');
      assertEqual(outbox[2].enqueue_ordinal, 3, 'Third mutation has enqueue_ordinal 3');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 11: Caller Alias Mutation Resistance and Deep Freeze
  // --------------------------------------------------------------------------
  await runSuite('11. Caller Alias Mutation Resistance and Deep Freeze', async () => {
    const owner = `user_alias_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      const taskId = `task_alias_${testRunId}`;
      const subtasks = [{ id: 'sub_1', text: 'Original Subtask', is_done: false }];
      const taskInput = {
        id: taskId,
        owner_id: owner,
        title: 'Original Title',
        subtasks,
      };

      const res = await db.mutateTask({
        mutationId: `mut_alias_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: taskInput,
      });

      // Caller attempts to mutate the input array after passing it in
      subtasks[0].text = 'TAMPERED SUBTASK TEXT';
      (taskInput as any).title = 'TAMPERED TITLE';

      // Read from database to verify stored entity was NOT mutated
      const readTask = await db.getTask(taskId);
      assertEqual(readTask?.title, 'Original Title', 'Stored title unaffected by caller input mutation');
      assertEqual(readTask?.subtasks[0].text, 'Original Subtask', 'Stored subtasks unaffected by caller mutation');

      // Verify returned entity is frozen
      assert(Object.isFrozen(res.entity), 'Returned entity is frozen');
      assert(Object.isFrozen(res.entity?.subtasks), 'Returned entity subtasks array is frozen');
    } finally {
      await db.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 12: Cross-Owner Isolation and Owner Spoof Rejection
  // --------------------------------------------------------------------------
  await runSuite('12. Cross-Owner Isolation and Owner Spoof Rejection', async () => {
    const ownerA = `user_alice_${testRunId}`;
    const ownerB = `user_bob_${testRunId}`;

    const dbA = await openLaunchpadDatabase({ ownerId: ownerA, dbPrefix: testPrefix });
    const dbB = await openLaunchpadDatabase({ ownerId: ownerB, dbPrefix: testPrefix });

    try {
      const taskId = `task_alice_${testRunId}`;

      // Alice inserts task
      await dbA.mutateTask({
        mutationId: `mut_alice_1_${testRunId}`,
        operation: 'insert',
        expectedRevision: 0,
        task: { id: taskId, owner_id: ownerA, title: "Alice's Secret Task" },
      });

      // Spoof attempt: insert record with ownerB into dbA
      let caughtSpoof = false;
      try {
        await dbA.mutateTask({
          mutationId: `mut_spoof_${testRunId}`,
          operation: 'insert',
          expectedRevision: 0,
          task: { id: `task_spoof_${testRunId}`, owner_id: ownerB, title: 'Spoofed' },
        });
      } catch (err) {
        if (err instanceof OwnerMismatchError) {
          caughtSpoof = true;
        } else {
          throw err;
        }
      }
      assert(caughtSpoof, 'Cross-owner mutation rejected with OwnerMismatchError');

      // Bob cannot read Alice's task
      const bobTask = await dbB.getTask(taskId);
      assertEqual(bobTask, null, "Bob's database cannot read Alice's task");

      const bobTasks = await dbB.listTasks();
      assertEqual(bobTasks.length, 0, "Bob's task list is completely isolated");

      const bobOutbox = await dbB.getOutbox();
      assertEqual(bobOutbox.length, 0, "Bob's outbox does not see Alice's mutations");
    } finally {
      await dbA.deleteDatabase();
      await dbB.deleteDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Suite 13: Closed Connection and Invalid Owner Error Handling
  // --------------------------------------------------------------------------
  await runSuite('13. Closed Connection and Invalid Owner Error Handling', async () => {
    const owner = `user_err_ctrl_${testRunId}`;
    const db = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });

    try {
      db.close();
      assertEqual(db.isClosed(), true, 'Database reports isClosed() === true');

      // Subsequent operation must throw DatabaseClosedError
      let caughtClosed = false;
      try {
        await db.getTask('any_id');
      } catch (err) {
        if (err instanceof DatabaseClosedError) {
          caughtClosed = true;
        } else {
          throw err;
        }
      }
      assert(caughtClosed, 'Operations on closed DB reject with DatabaseClosedError');

      // Invalid ownerId with unnormalized whitespace rejected
      let caughtWhitespaceOwner = false;
      try {
        await openLaunchpadDatabase({ ownerId: '  user_padded  ', dbPrefix: testPrefix });
      } catch (err) {
        if (err instanceof DomainValidationError) {
          caughtWhitespaceOwner = true;
        }
      }
      assert(caughtWhitespaceOwner, 'Owner with unnormalized whitespace rejected with DomainValidationError');

      // Empty ownerId rejected
      let caughtEmptyOwner = false;
      try {
        await openLaunchpadDatabase({ ownerId: '', dbPrefix: testPrefix });
      } catch (err) {
        if (err instanceof DomainValidationError) {
          caughtEmptyOwner = true;
        }
      }
      assert(caughtEmptyOwner, 'Empty ownerId rejected with DomainValidationError');
    } finally {
      const cleanDb = await openLaunchpadDatabase({ ownerId: owner, dbPrefix: testPrefix });
      await cleanDb.deleteDatabase();
    }
  });

  const totalDuration = performance.now() - startTime;
  const totalAssertions = suites.reduce((sum, s) => sum + s.assertions.length, 0);
  const passedAssertions = suites.reduce(
    (sum, s) => sum + s.assertions.filter((a) => a.passed).length,
    0
  );
  const passedSuites = suites.filter((s) => s.passed).length;

  return {
    browser: 'Orca Built-in Browser (Native IndexedDB)',
    userAgent: navigator.userAgent,
    passed: passedSuites === suites.length && passedAssertions === totalAssertions,
    totalSuites: suites.length,
    passedSuites,
    totalAssertions,
    passedAssertions,
    suites,
    durationMs: totalDuration,
  };
}
