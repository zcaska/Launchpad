/**
 * LaunchPad Native IndexedDB Migration Test Suite
 *
 * Runs inside Orca's embedded browser context against real window.indexedDB.
 * Verifies:
 * 1. Native Fixture Stage & Readback Verification
 * 2. Native Repeat Staging Idempotency
 * 3. Native Transaction Abort & Retry Behavior
 */

import { generateMigrationPreview } from '../../src/services/migration/preview';
import { stageMigrationCopy, DEFAULT_FIXTURE_PREFIX } from '../../src/services/migration/stagedCopy';
import { MigrationPreviewSuccess } from '../../src/services/migration/types';
import { STORES, getDatabaseName, upgradeDatabaseSchema } from '../../src/services/db/schema';
import { TaskRecord, MigrationManifestRecord } from '../../src/domain/types';

export interface NativeAssertion {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface NativeSuiteResult {
  suite: string;
  passed: boolean;
  durationMs: number;
  assertions: NativeAssertion[];
}

export interface NativeMigrationReport {
  browser: string;
  userAgent: string;
  passed: boolean;
  suites: NativeSuiteResult[];
  durationMs: number;
}

export async function runNativeMigrationTests(): Promise<NativeMigrationReport> {
  const startAll = performance.now();
  const suites: NativeSuiteResult[] = [];

  // Helper for running an assertion
  async function runAssert(
    suiteAssertions: NativeAssertion[],
    name: string,
    fn: () => Promise<void> | void
  ): Promise<void> {
    const start = performance.now();
    try {
      await fn();
      suiteAssertions.push({
        name,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      suiteAssertions.push({
        name,
        passed: false,
        error: err?.stack || String(err),
        durationMs: performance.now() - start,
      });
    }
  }

  // Suite 1: Native Fixture Stage & Readback Verification
  {
    const suiteStart = performance.now();
    const assertions: NativeAssertion[] = [];

    await runAssert(assertions, '1.1 Preview and stage into native fixture IndexedDB', async () => {
      const dbName = getDatabaseName('orca_worker_owner', DEFAULT_FIXTURE_PREFIX);
      await new Promise<void>((resolve) => {
        const delReq = window.indexedDB.deleteDatabase(dbName);
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => resolve();
        delReq.onblocked = () => resolve();
      });

      const candidate = {
        version: 3,
        quickNotes: [
          { id: 'native-t1', text: 'Native Active Task', isDone: false, priority: 'urgent', deadline: '15:00' },
          { id: 'native-t2', text: 'Native Done Task', isDone: true, priority: 'low', createdAt: 1710000000000 },
        ],
      };

      const preview = (await generateMigrationPreview(candidate, { ownerId: 'orca_worker_owner' })) as MigrationPreviewSuccess;
      if (!preview.success) throw new Error('Preview failed');

      const stageResult = await stageMigrationCopy(preview, {
        ownerId: 'orca_worker_owner',
      });

      if (stageResult.status !== 'verified') throw new Error(`Expected verified, got ${stageResult.status}`);
      if (stageResult.tasksWritten !== 2) throw new Error(`Expected 2 tasks written, got ${stageResult.tasksWritten}`);
    });

    await runAssert(assertions, '1.2 Directly read back from window.indexedDB and verify records', async () => {
      const dbName = getDatabaseName('orca_worker_owner', DEFAULT_FIXTURE_PREFIX);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = window.indexedDB.open(dbName, 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      try {
        const tasks = await new Promise<TaskRecord[]>((resolve, reject) => {
          const tx = db.transaction([STORES.TASKS], 'readonly');
          const store = tx.objectStore(STORES.TASKS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (tasks.length !== 2) throw new Error(`Expected 2 tasks in native IDB, found ${tasks.length}`);

        const activeTask = tasks.find((t) => t.id === 'native-t1');
        const doneTask = tasks.find((t) => t.id === 'native-t2');

        if (!activeTask || activeTask.lifecycle !== 'active') throw new Error('Active task missing or wrong lifecycle');
        if (!doneTask || doneTask.lifecycle !== 'archived') throw new Error('Done task missing or wrong lifecycle');
        if (doneTask.completed_at !== undefined) throw new Error('Done task must not have fabricated completed_at');

        const manifest = await new Promise<MigrationManifestRecord>((resolve, reject) => {
          const tx = db.transaction([STORES.MIGRATION_MANIFESTS], 'readonly');
          const store = tx.objectStore(STORES.MIGRATION_MANIFESTS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result[0]);
          req.onerror = () => reject(req.error);
        });

        if (!manifest || manifest.status !== 'verified') throw new Error('Manifest missing or not verified');
      } finally {
        db.close();
      }
    });

    suites.push({
      suite: 'Native Fixture Staging & Direct Readback Verification',
      passed: assertions.every((a) => a.passed),
      durationMs: performance.now() - suiteStart,
      assertions,
    });
  }

  // Suite 2: Native Repeat Staging Idempotency
  {
    const suiteStart = performance.now();
    const assertions: NativeAssertion[] = [];

    await runAssert(assertions, '2.1 Repeat staging on existing fixture database succeeds idempotently', async () => {
      const candidate = {
        version: 3,
        quickNotes: [
          { id: 'native-t1', text: 'Native Active Task', isDone: false, priority: 'urgent', deadline: '15:00' },
          { id: 'native-t2', text: 'Native Done Task', isDone: true, priority: 'low', createdAt: 1710000000000 },
        ],
      };

      const preview = (await generateMigrationPreview(candidate, { ownerId: 'orca_worker_owner' })) as MigrationPreviewSuccess;
      const repeatResult = await stageMigrationCopy(preview, {
        ownerId: 'orca_worker_owner',
      });

      if (repeatResult.status !== 'verified') throw new Error('Repeat staging failed');
      if (repeatResult.tasksWritten !== 2) throw new Error('Repeat staging altered task count');
    });

    await runAssert(assertions, '2.2 Verify task count unchanged in native IDB after repeat staging', async () => {
      const dbName = getDatabaseName('orca_worker_owner', DEFAULT_FIXTURE_PREFIX);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = window.indexedDB.open(dbName, 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      try {
        const tasks = await new Promise<TaskRecord[]>((resolve, reject) => {
          const tx = db.transaction([STORES.TASKS], 'readonly');
          const store = tx.objectStore(STORES.TASKS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (tasks.length !== 2) throw new Error(`Expected exactly 2 tasks after repeat stage, got ${tasks.length}`);
      } finally {
        db.close();
      }
    });

    suites.push({
      suite: 'Native Repeat Staging Idempotency',
      passed: assertions.every((a) => a.passed),
      durationMs: performance.now() - suiteStart,
      assertions,
    });
  }

  // Suite 3: Native Transaction Abort & Retry
  {
    const suiteStart = performance.now();
    const assertions: NativeAssertion[] = [];
    const abortOwner = 'abort_owner_' + Date.now();
    const dbName = getDatabaseName(abortOwner, DEFAULT_FIXTURE_PREFIX);

    await runAssert(assertions, '3.1 Aborted transaction in native IDB rolls back and leaves no partial records', async () => {
      // Open database with schema
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = window.indexedDB.open(dbName, 1);
        req.onupgradeneeded = (event) => {
          const idb = req.result;
          upgradeDatabaseSchema(idb, event.oldVersion, event.newVersion);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Write then abort
      let abortCaught = false;
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction([STORES.TASKS], 'readwrite');
          const store = tx.objectStore(STORES.TASKS);
          store.put({ id: 'aborted-t1', title: 'Should be rolled back', owner_id: abortOwner });
          tx.onabort = () => reject(new Error('TRANSACTION_ABORTED'));
          tx.onerror = () => reject(tx.error || new Error('TRANSACTION_ERROR'));
          tx.oncomplete = () => resolve();
          tx.abort();
        });
      } catch (err: any) {
        abortCaught = true;
      }

      if (!abortCaught) throw new Error('Transaction abort was not triggered');

      // Verify no records committed
      const remainingTasks = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction([STORES.TASKS], 'readonly');
        const store = tx.objectStore(STORES.TASKS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (remainingTasks.length !== 0) throw new Error(`Expected 0 tasks after abort, found ${remainingTasks.length}`);
      db.close();
    });

    await runAssert(assertions, '3.2 Subsequent retry writes cleanly and verifies in native IDB', async () => {
      const candidate = {
        version: 3,
        quickNotes: [{ id: 'retry-task-1', text: 'Retry Task Clean', isDone: false }],
      };
      const preview = (await generateMigrationPreview(candidate, { ownerId: abortOwner })) as MigrationPreviewSuccess;
      const retryResult = await stageMigrationCopy(preview, { ownerId: abortOwner });

      if (retryResult.status !== 'verified') throw new Error('Retry stage failed');
      if (retryResult.tasksWritten !== 1) throw new Error('Retry wrote wrong task count');
    });

    suites.push({
      suite: 'Native Transaction Abort & Clean Retry',
      passed: assertions.every((a) => a.passed),
      durationMs: performance.now() - suiteStart,
      assertions,
    });
  }

  const durationMs = performance.now() - startAll;
  return {
    browser: 'Orca Built-in Browser (Native window.indexedDB)',
    userAgent: navigator.userAgent,
    passed: suites.every((s) => s.passed),
    suites,
    durationMs,
  };
}
