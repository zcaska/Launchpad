/**
 * LaunchPad Staged Migration Fixture Copy & Verification (Stage 2B)
 *
 * Implements safe staging of previewed TaskRecord[] and MigrationManifestRecord
 * into an explicit, isolated IndexedDB fixture database namespace.
 *
 * Guarantees:
 * - Isolated fixture namespace: never touches production launchpad databases or live user data.
 * - Idempotent repeat staging: re-running staging with the same manifest produces identical records.
 * - Verification before activation: reads back every written entity and validates count + IDs.
 * - Atomic transaction rollback: transaction abort leaves fixture database uncorrupted and retryable.
 * - Accurate runtime disclosure: if IndexedDB factory is unavailable, explicitly discloses
 *   unimplemented copy while leaving pure preview operational.
 */

import { STORES, upgradeDatabaseSchema, getDatabaseName, LAUNCHPAD_DB_VERSION } from '../db/schema';
import { TaskRecord, MigrationManifestRecord } from '../../domain/types';
import { MigrationPreviewSuccess, MigrationStageOptions, MigrationStageResult, MigrationError } from './types';

export const DEFAULT_FIXTURE_PREFIX = 'launchpad_fixture_stage_';

/**
 * Resolves the IDBFactory instance from options or environment.
 */
function resolveIdbFactory(options: MigrationStageOptions): IDBFactory | undefined {
  if (options.idbFactory) return options.idbFactory;
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  return undefined;
}

/**
 * Opens an isolated fixture database using the explicit fixture prefix.
 */
async function openFixtureDatabase(
  ownerId: string,
  fixturePrefix: string,
  factory: IDBFactory
): Promise<IDBDatabase> {
  const dbName = getDatabaseName(ownerId, fixturePrefix);

  return new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(dbName, LAUNCHPAD_DB_VERSION);
    } catch (err) {
      return reject(new MigrationError('FIXTURE_OPEN_FAILED', `Failed to open fixture IDB "${dbName}": ${String(err)}`));
    }

    request.onupgradeneeded = (event) => {
      try {
        const db = request.result;
        upgradeDatabaseSchema(db, event.oldVersion, event.newVersion);
      } catch (upgradeErr) {
        reject(new MigrationError('SCHEMA_UPGRADE_FAILED', `Failed to upgrade fixture schema: ${String(upgradeErr)}`));
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new MigrationError('FIXTURE_OPEN_FAILED', `IDB Open error: ${request.error?.message}`));
  });
}

/**
 * Stages a validated migration preview into the isolated IndexedDB fixture database,
 * then reads back and verifies every written task before marking the manifest verified.
 */
export async function stageMigrationCopy(
  preview: MigrationPreviewSuccess,
  options: MigrationStageOptions
): Promise<MigrationStageResult> {
  const factory = resolveIdbFactory(options);
  if (!factory || typeof factory.open !== 'function') {
    throw new MigrationError(
      'IDB_UNAVAILABLE',
      'IndexedDB factory is not available in the current runtime environment. Pure preview is complete; fixture IndexedDB copy requires an IDB environment.'
    );
  }

  const ownerId = options.ownerId.trim();
  const fixturePrefix = options.fixturePrefix ?? DEFAULT_FIXTURE_PREFIX;
  const fixtureDatabaseName = getDatabaseName(ownerId, fixturePrefix);

  const db = await openFixtureDatabase(ownerId, fixturePrefix, factory);

  try {
    // 1. Check for existing manifest (idempotency check)
    const existingManifest = await new Promise<MigrationManifestRecord | null>((resolve, reject) => {
      const tx = db.transaction([STORES.MIGRATION_MANIFESTS], 'readonly');
      const store = tx.objectStore(STORES.MIGRATION_MANIFESTS);
      const req = store.get(preview.manifest.manifest_id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(new MigrationError('MANIFEST_CHECK_FAILED', `Failed to check manifest: ${req.error?.message}`));
    });

    const isAlreadyVerified = existingManifest && existingManifest.status === 'verified';

    // 2. Perform atomic staging transaction: write tasks + staged manifest
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS, STORES.MIGRATION_MANIFESTS], 'readwrite');
      const taskStore = tx.objectStore(STORES.TASKS);
      const manifestStore = tx.objectStore(STORES.MIGRATION_MANIFESTS);

      tx.onerror = () => reject(new MigrationError('TRANSACTION_ABORTED', `Staging transaction failed/aborted: ${tx.error?.message}`));
      tx.oncomplete = () => resolve();

      // Put all tasks
      for (const task of preview.taskRecords) {
        taskStore.put(task);
      }

      // Put manifest with status 'staged' (or keep verified if already verified)
      const manifestToPut: MigrationManifestRecord = {
        ...preview.manifest,
        status: isAlreadyVerified ? 'verified' : 'staged',
      };
      manifestStore.put(manifestToPut);
    });

    // 3. Post-Import Verification: Read back all tasks from fixture store
    const readBackTasks = await new Promise<TaskRecord[]>((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS], 'readonly');
      const store = tx.objectStore(STORES.TASKS);
      const ownerIndex = store.index('by_owner_id');
      const req = ownerIndex.getAll(ownerId);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(new MigrationError('VERIFICATION_READ_FAILED', `Failed to read tasks during verification: ${req.error?.message}`));
    });

    // Verify task count matches preview count
    if (readBackTasks.length !== preview.taskRecords.length) {
      throw new MigrationError(
        'VERIFICATION_MISMATCH',
        `Verification failed: Expected ${preview.taskRecords.length} tasks in fixture database, but found ${readBackTasks.length}.`
      );
    }

    // Verify every task ID from preview is present in the readback list
    const readBackMap = new Map(readBackTasks.map((t) => [t.id, t]));
    for (const previewTask of preview.taskRecords) {
      const stored = readBackMap.get(previewTask.id);
      if (!stored) {
        throw new MigrationError(
          'VERIFICATION_MISMATCH',
          `Verification failed: Task ID "${previewTask.id}" missing from fixture store.`
        );
      }
      if (stored.title !== previewTask.title || stored.lifecycle !== previewTask.lifecycle) {
        throw new MigrationError(
          'VERIFICATION_MISMATCH',
          `Verification failed: Task ID "${previewTask.id}" attributes mismatch in fixture store.`
        );
      }
    }

    // 4. Update manifest to 'verified'
    const nowIso = new Date().toISOString();
    const verifiedManifest: MigrationManifestRecord = {
      ...preview.manifest,
      status: 'verified',
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.MIGRATION_MANIFESTS], 'readwrite');
      const store = tx.objectStore(STORES.MIGRATION_MANIFESTS);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new MigrationError('MANIFEST_UPDATE_FAILED', `Failed to update manifest to verified: ${tx.error?.message}`));
      store.put(verifiedManifest);
    });

    return {
      status: 'verified',
      manifest: verifiedManifest,
      fixtureDatabaseName,
      tasksWritten: preview.taskRecords.length,
      verificationPassed: true,
      preview,
      verifiedAt: nowIso,
      disclosures: {
        separateFixtureNamespace: true,
        liveDataUntouched: true,
        noUserDataDeletion: true,
        requiresExplicitLiveApproval: true,
      },
    };
  } finally {
    db.close();
  }
}
