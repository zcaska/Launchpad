/**
 * LaunchPad Native IndexedDB Repository Implementation (Stage 2A)
 *
 * Implements an owner-isolated, transactional IndexedDB repository with:
 * - Deterministic request fingerprinting computed BEFORE IDB transaction entry.
 * - Single-transaction atomic local entity mutation + outbox + mutation receipt.
 * - Persistent monotonic per-DB enqueue ordinal allocated within same write transaction.
 * - Optimistic revision conflict rejection with explicit expectedRevision checks.
 * - Persistent deletion tombstone fences blocking recreation/stale upsert.
 * - Exact committed result snapshots in receipts for idempotent replay.
 * - Append-only evidence with semantic uniqueness and substantive conflict rejection.
 * - Separate monotonic draft revision with CAS checks independent of plan_revision.
 * - Append-only reflections with day uniqueness and ID collision rejection.
 * - Deep detachment and freezing of inputs and outputs to prevent alias mutations.
 * - Settled tracking on database open to prevent unmanaged IDB connection leaks.
 * - Safe close handling and active transaction abort on shutdown.
 * - Purely synchronous IDB request chaining to prevent transaction auto-commit / inactivity errors.
 */

import {
  TaskRecord,
  EvidenceRecord,
  ReviewDraftRecord,
  ReflectionRecord,
  OutboxRecord,
  MutationReceipt,
  DeletionFence,
  EntityType,
  MutationOperation,
  OwnerSyncStateRecord,
} from '../../domain/types';
import {
  validateOwnerId,
  validateEntityId,
  validateRevision,
  validateTaskTitle,
  validateTaskPriority,
  validateTaskLifecycle,
  validateDurationMinutes,
  validateSubtasks,
  validateAttachedUrls,
  validateEvidenceRecord,
  validateReviewDraftRecord,
  validateReflectionRecord,
  deepCloneAndFreeze,
  DomainValidationError,
} from '../../domain/validation';
import {
  STORES,
  LAUNCHPAD_DB_VERSION,
  DEFAULT_DB_PREFIX,
  getDatabaseName,
  upgradeDatabaseSchema,
} from './schema';
import { computeMutationFingerprint } from './fingerprint';
import {
  DatabaseError,
  DatabaseClosedError,
  DatabaseBlockedError,
  OwnerMismatchError,
  RevisionConflictError,
  TombstoneConflictError,
  MutationConflictError,
  SemanticConflictError,
  EntityNotFoundError,
} from './errors';

export interface OpenDatabaseOptions {
  ownerId: string;
  idbFactory?: IDBFactory;
  dbPrefix?: string;
  version?: number;
  subtle?: SubtleCrypto;
}

export interface TaskMutationParams {
  mutationId: string;
  operation: MutationOperation;
  expectedRevision: number;
  task: Partial<TaskRecord> & { id: string; owner_id: string };
}

export interface MutationResult<T> {
  readonly entity: T | null;
  readonly outbox: OutboxRecord | null;
  readonly receipt: MutationReceipt;
  readonly wasReplayed: boolean;
}

export interface TaskFilter {
  lifecycle?: TaskRecord['lifecycle'];
  plannedDay?: string;
}

export interface EvidenceFilter {
  kind?: EvidenceRecord['kind'];
  localDay?: string;
}

export interface LaunchpadDatabase {
  readonly ownerId: string;
  readonly dbName: string;
  close(): void;
  isClosed(): boolean;
  mutateTask(mutation: TaskMutationParams): Promise<MutationResult<TaskRecord>>;
  getTask(id: string): Promise<TaskRecord | null>;
  listTasks(filter?: TaskFilter): Promise<readonly TaskRecord[]>;
  appendEvidence(evidence: EvidenceRecord, mutationId: string): Promise<MutationResult<EvidenceRecord>>;
  getEvidenceBySemanticKey(semanticKey: string): Promise<EvidenceRecord | null>;
  listEvidence(filter?: EvidenceFilter): Promise<readonly EvidenceRecord[]>;
  saveReviewDraft(
    draft: ReviewDraftRecord,
    mutationId: string,
    expectedDraftRevision?: number
  ): Promise<MutationResult<ReviewDraftRecord>>;
  getReviewDraft(dayKey: string): Promise<ReviewDraftRecord | null>;
  submitReflection(reflection: ReflectionRecord, mutationId: string): Promise<MutationResult<ReflectionRecord>>;
  getReflection(dayKey: string): Promise<ReflectionRecord | null>;
  getOutbox(limit?: number): Promise<readonly OutboxRecord[]>;
  getMutationReceipt(mutationId: string): Promise<MutationReceipt | null>;
  getDeletionFence(entityType: EntityType, entityId: string): Promise<DeletionFence | null>;
  deleteDatabase(): Promise<void>;
}

/**
 * Opens an owner-isolated LaunchPad IndexedDB database instance.
 */
export async function openLaunchpadDatabase(options: OpenDatabaseOptions): Promise<LaunchpadDatabase> {
  const ownerId = validateOwnerId(options.ownerId);
  const prefix = options.dbPrefix ?? DEFAULT_DB_PREFIX;
  const version = options.version ?? LAUNCHPAD_DB_VERSION;
  const dbName = getDatabaseName(ownerId, prefix);

  const factory = options.idbFactory ?? (typeof globalThis !== 'undefined' ? globalThis.indexedDB : undefined);
  if (!factory || typeof factory.open !== 'function') {
    throw new DatabaseError('IDB_UNAVAILABLE', 'IndexedDB factory is not available in the current runtime environment.');
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let settled = false;

    function fail(err: Error): void {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }

    try {
      request = factory.open(dbName, version);
    } catch (openErr) {
      return fail(new DatabaseError('OPEN_FAILED', `Failed to open IndexedDB "${dbName}": ${String(openErr)}`, openErr));
    }

    request.onupgradeneeded = (event) => {
      try {
        const idb = request.result;
        upgradeDatabaseSchema(idb, event.oldVersion, event.newVersion);
      } catch (upgradeErr) {
        try {
          request.transaction?.abort();
        } catch {
          // Ignore secondary abort failure
        }
        fail(new DatabaseError('UPGRADE_FAILED', `Schema upgrade failed on "${dbName}": ${String(upgradeErr)}`, upgradeErr));
      }
    };

    request.onsuccess = () => {
      const idb = request.result;
      if (settled) {
        // Late onsuccess fired after onblocked or error: close immediately to prevent connection leak
        try {
          idb.close();
        } catch {
          // Ignore close error
        }
        return;
      }
      settled = true;
      resolve(idb);
    };

    request.onerror = () => {
      fail(
        new DatabaseError(
          'OPEN_FAILED',
          `Failed to open database "${dbName}": ${request.error?.message ?? 'Unknown error'}`,
          request.error
        )
      );
    };

    request.onblocked = () => {
      fail(new DatabaseBlockedError(`Opening database "${dbName}" was blocked by existing unclosed connections.`));
    };
  });

  return new LaunchpadDatabaseImpl(db, ownerId, dbName, factory, options.subtle);
}

class LaunchpadDatabaseImpl implements LaunchpadDatabase {
  private closed = false;
  private activeTransactions = new Set<IDBTransaction>();

  constructor(
    private idb: IDBDatabase,
    public readonly ownerId: string,
    public readonly dbName: string,
    private factory: IDBFactory,
    private subtle?: SubtleCrypto
  ) {
    this.idb.onversionchange = () => {
      this.close();
    };
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public close(): void {
    if (!this.closed) {
      this.closed = true;
      for (const tx of this.activeTransactions) {
        try {
          tx.abort();
        } catch {
          // Ignore abort failures on already completed/aborted tx
        }
      }
      this.activeTransactions.clear();
      try {
        this.idb.close();
      } catch {
        // Ignore errors on close
      }
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new DatabaseClosedError(`Database "${this.dbName}" is closed.`);
    }
  }

  private assertOwner(recordOwner: string): void {
    if (recordOwner !== this.ownerId) {
      throw new OwnerMismatchError(this.ownerId, recordOwner);
    }
  }

  private registerTransaction(tx: IDBTransaction): void {
    this.activeTransactions.add(tx);
    const cleanup = () => {
      this.activeTransactions.delete(tx);
    };
    tx.oncomplete = cleanup;
    tx.onabort = cleanup;
    tx.onerror = cleanup;
  }

  /**
   * Allocates the next monotonic enqueue ordinal within the active write transaction.
   * Uses purely synchronous IDB chaining to avoid auto-commit inactivation.
   */
  private allocateNextEnqueueOrdinal(
    syncStore: IDBObjectStore,
    now: string,
    onSuccess: (ordinal: number) => void,
    onError: (error: Error) => void
  ): void {
    const syncReq = syncStore.get(this.ownerId);
    syncReq.onerror = () => onError(new DatabaseError('SYNC_STATE_READ_FAILED', 'Failed to read sync state'));
    syncReq.onsuccess = () => {
      const current: OwnerSyncStateRecord | undefined = syncReq.result;
      const ordinal = current ? current.next_enqueue_ordinal : 1;
      syncStore.put({
        owner_id: this.ownerId,
        next_enqueue_ordinal: ordinal + 1,
        updated_at: now,
      });
      onSuccess(ordinal);
    };
  }

  /**
   * Executes a single atomic IDB transaction for local task mutation + outbox + receipt.
   */
  public async mutateTask(mutationParams: TaskMutationParams): Promise<MutationResult<TaskRecord>> {
    this.assertOpen();

    // 1. Deeply detach and validate inputs before entering async/IDB phases
    const mutation = deepCloneAndFreeze(mutationParams);
    const mutationId = validateEntityId(mutation.mutationId, 'mutationId');
    const taskInput = mutation.task;
    const taskId = validateEntityId(taskInput.id, 'task.id');
    this.assertOwner(taskInput.owner_id);
    const expectedRevision = validateRevision(mutation.expectedRevision, 'expectedRevision');
    const operation = mutation.operation;

    if (operation !== 'insert' && operation !== 'update' && operation !== 'delete') {
      throw new DomainValidationError('operation', `Invalid operation: "${String(operation)}"`);
    }

    if (operation === 'insert' && expectedRevision !== 0) {
      throw new DomainValidationError(
        'expectedRevision',
        `Insert operation requires expectedRevision to be 0. Received: ${expectedRevision}`
      );
    }

    if (operation === 'insert') {
      validateTaskTitle(taskInput.title);
      if (taskInput.priority !== undefined) validateTaskPriority(taskInput.priority);
      if (taskInput.lifecycle !== undefined) validateTaskLifecycle(taskInput.lifecycle);
      validateDurationMinutes(taskInput.duration_minutes);
      validateSubtasks(taskInput.subtasks);
      validateAttachedUrls(taskInput.attached_urls);
    } else if (operation === 'update') {
      if (taskInput.title !== undefined) validateTaskTitle(taskInput.title);
      if (taskInput.priority !== undefined) validateTaskPriority(taskInput.priority);
      if (taskInput.lifecycle !== undefined) validateTaskLifecycle(taskInput.lifecycle);
      if (taskInput.duration_minutes !== undefined) validateDurationMinutes(taskInput.duration_minutes);
      if (taskInput.subtasks !== undefined) validateSubtasks(taskInput.subtasks);
      if (taskInput.attached_urls !== undefined) validateAttachedUrls(taskInput.attached_urls);
    }

    // 2. Compute deterministic request fingerprint BEFORE opening IDB transaction
    const fingerprint = await computeMutationFingerprint(
      mutationId,
      this.ownerId,
      'task',
      taskId,
      operation,
      expectedRevision,
      taskInput,
      this.subtle
    );

    this.assertOpen();

    // 3. Execute ONE atomic readwrite transaction across all required stores
    return new Promise<MutationResult<TaskRecord>>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(
          [
            STORES.TASKS,
            STORES.OUTBOX,
            STORES.MUTATION_RECEIPTS,
            STORES.DELETION_FENCES,
            STORES.OWNER_SYNC_STATE,
          ],
          'readwrite'
        );
      } catch (txErr) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create IDB transaction: ${String(txErr)}`, txErr));
      }

      this.registerTransaction(tx);

      const taskStore = tx.objectStore(STORES.TASKS);
      const outboxStore = tx.objectStore(STORES.OUTBOX);
      const receiptStore = tx.objectStore(STORES.MUTATION_RECEIPTS);
      const fenceStore = tx.objectStore(STORES.DELETION_FENCES);
      const syncStore = tx.objectStore(STORES.OWNER_SYNC_STATE);

      let finalResult: MutationResult<TaskRecord> | null = null;
      let aborted = false;

      function abortWithError(error: Error): void {
        if (!aborted) {
          aborted = true;
          try {
            tx.abort();
          } catch {
            // Ignore abort error
          }
          reject(error);
        }
      }

      tx.onabort = () => {
        if (!aborted) {
          reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown cause'}`, tx.error));
        }
      };

      tx.onerror = () => {
        if (!aborted) {
          reject(new DatabaseError('TX_ERROR', `Transaction failed: ${tx.error?.message ?? 'unknown cause'}`, tx.error));
        }
      };

      tx.oncomplete = () => {
        try {
          if (finalResult) {
            resolve(deepCloneAndFreeze(finalResult));
          } else if (!aborted) {
            reject(new DatabaseError('TX_INCOMPLETE', 'Transaction completed without emitting result.'));
          }
        } catch (err) {
          reject(err);
        }
      };

      // Step A: Check Mutation Receipts for idempotency or duplicate-with-changed-payload
      const receiptReq = receiptStore.get(mutationId);
      receiptReq.onerror = () => abortWithError(new DatabaseError('RECEIPT_READ_FAILED', 'Failed to read receipt store'));
      receiptReq.onsuccess = () => {
        const existingReceipt: MutationReceipt | undefined = receiptReq.result;
        if (existingReceipt) {
          if (existingReceipt.fingerprint === fingerprint) {
            // Exact same request replayed: return original committed entity snapshot from receipt!
            const outboxReq = outboxStore.get(mutationId);
            outboxReq.onerror = () => abortWithError(new DatabaseError('OUTBOX_READ_FAILED', 'Failed to read outbox store'));
            outboxReq.onsuccess = () => {
              finalResult = {
                entity: (existingReceipt.committed_result as TaskRecord) ?? null,
                outbox: outboxReq.result ?? null,
                receipt: existingReceipt,
                wasReplayed: true,
              };
            };
            return;
          } else {
            return abortWithError(new MutationConflictError(mutationId));
          }
        }

        // Step B: Check Deletion Fence for tombstone constraint
        const fenceKey = `task:${taskId}`;
        const fenceReq = fenceStore.get(fenceKey);
        fenceReq.onerror = () => abortWithError(new DatabaseError('FENCE_READ_FAILED', 'Failed to read deletion fence'));
        fenceReq.onsuccess = () => {
          const existingFence: DeletionFence | undefined = fenceReq.result;

          if (existingFence) {
            if (operation === 'delete') {
              const now = new Date().toISOString();
              this.allocateNextEnqueueOrdinal(
                syncStore,
                now,
                (ordinal) => {
                  const receipt: MutationReceipt = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    fingerprint,
                    entity_type: 'task',
                    entity_id: taskId,
                    applied_revision: existingFence.deletion_revision,
                    committed_at: now,
                    committed_result: null,
                  };
                  const outbox: OutboxRecord = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    enqueue_ordinal: ordinal,
                    entity_type: 'task',
                    entity_id: taskId,
                    operation: 'delete',
                    expected_revision: expectedRevision,
                    base_revision: existingFence.deletion_revision,
                    payload: { id: taskId, owner_id: this.ownerId },
                    fingerprint,
                    created_at: now,
                    status: 'pending',
                  };
                  receiptStore.put(receipt);
                  outboxStore.put(outbox);
                  finalResult = {
                    entity: null,
                    outbox,
                    receipt,
                    wasReplayed: false,
                  };
                },
                abortWithError
              );
              return;
            } else {
              return abortWithError(new TombstoneConflictError('task', taskId));
            }
          }

          // Step C: Check Current Entity State for optimistic revision check
          const taskReq = taskStore.get(taskId);
          taskReq.onerror = () => abortWithError(new DatabaseError('TASK_READ_FAILED', 'Failed to read task'));
          taskReq.onsuccess = () => {
            const currentTask: TaskRecord | undefined = taskReq.result;
            const now = new Date().toISOString();

            if (operation === 'insert') {
              if (currentTask) {
                return abortWithError(
                  new RevisionConflictError(expectedRevision, currentTask.revision, taskId)
                );
              }
              this.allocateNextEnqueueOrdinal(
                syncStore,
                now,
                (ordinal) => {
                  const newTask: TaskRecord = {
                    id: taskId,
                    owner_id: this.ownerId,
                    revision: 1,
                    title: taskInput.title!.trim(),
                    description: taskInput.description,
                    duration_minutes: taskInput.duration_minutes,
                    deadline: taskInput.deadline,
                    priority: taskInput.priority ?? 'medium',
                    subtasks: taskInput.subtasks ?? [],
                    attached_urls: taskInput.attached_urls ?? [],
                    planned_day: taskInput.planned_day,
                    lifecycle: taskInput.lifecycle ?? 'active',
                    completion_id: taskInput.completion_id,
                    completed_at: taskInput.completed_at,
                    undo_until: taskInput.undo_until,
                    archived_at: taskInput.archived_at,
                    review_day: taskInput.review_day,
                    created_at: taskInput.created_at ?? now,
                    updated_at: now,
                  };

                  const receipt: MutationReceipt = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    fingerprint,
                    entity_type: 'task',
                    entity_id: taskId,
                    applied_revision: 1,
                    committed_at: now,
                    committed_result: newTask,
                  };

                  const outbox: OutboxRecord = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    enqueue_ordinal: ordinal,
                    entity_type: 'task',
                    entity_id: taskId,
                    operation: 'insert',
                    expected_revision: 0,
                    base_revision: 0,
                    payload: newTask,
                    fingerprint,
                    created_at: now,
                    status: 'pending',
                  };

                  taskStore.add(newTask);
                  outboxStore.put(outbox);
                  receiptStore.put(receipt);

                  finalResult = {
                    entity: newTask,
                    outbox,
                    receipt,
                    wasReplayed: false,
                  };
                },
                abortWithError
              );
            } else if (operation === 'update') {
              if (!currentTask) {
                return abortWithError(new EntityNotFoundError('task', taskId));
              }
              if (currentTask.revision !== expectedRevision) {
                return abortWithError(
                  new RevisionConflictError(expectedRevision, currentTask.revision, taskId)
                );
              }

              this.allocateNextEnqueueOrdinal(
                syncStore,
                now,
                (ordinal) => {
                  // Apply ONLY explicit editable fields onto currentTask; protect managed fields
                  const updatedTask: TaskRecord = {
                    id: currentTask.id,
                    owner_id: currentTask.owner_id,
                    revision: currentTask.revision + 1,
                    title: taskInput.title !== undefined ? taskInput.title.trim() : currentTask.title,
                    description: taskInput.description !== undefined ? taskInput.description : currentTask.description,
                    duration_minutes:
                      taskInput.duration_minutes !== undefined ? taskInput.duration_minutes : currentTask.duration_minutes,
                    deadline: taskInput.deadline !== undefined ? taskInput.deadline : currentTask.deadline,
                    priority: taskInput.priority !== undefined ? taskInput.priority : currentTask.priority,
                    subtasks: taskInput.subtasks !== undefined ? taskInput.subtasks : currentTask.subtasks,
                    attached_urls:
                      taskInput.attached_urls !== undefined ? taskInput.attached_urls : currentTask.attached_urls,
                    planned_day: taskInput.planned_day !== undefined ? taskInput.planned_day : currentTask.planned_day,
                    lifecycle: taskInput.lifecycle !== undefined ? taskInput.lifecycle : currentTask.lifecycle,
                    completion_id:
                      taskInput.completion_id !== undefined ? taskInput.completion_id : currentTask.completion_id,
                    completed_at: taskInput.completed_at !== undefined ? taskInput.completed_at : currentTask.completed_at,
                    undo_until: taskInput.undo_until !== undefined ? taskInput.undo_until : currentTask.undo_until,
                    archived_at: taskInput.archived_at !== undefined ? taskInput.archived_at : currentTask.archived_at,
                    review_day: taskInput.review_day !== undefined ? taskInput.review_day : currentTask.review_day,
                    created_at: currentTask.created_at,
                    updated_at: now,
                  };

                  const receipt: MutationReceipt = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    fingerprint,
                    entity_type: 'task',
                    entity_id: taskId,
                    applied_revision: updatedTask.revision,
                    committed_at: now,
                    committed_result: updatedTask,
                  };

                  const outbox: OutboxRecord = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    enqueue_ordinal: ordinal,
                    entity_type: 'task',
                    entity_id: taskId,
                    operation: 'update',
                    expected_revision: expectedRevision,
                    base_revision: currentTask.revision,
                    payload: updatedTask,
                    fingerprint,
                    created_at: now,
                    status: 'pending',
                  };

                  taskStore.put(updatedTask);
                  outboxStore.put(outbox);
                  receiptStore.put(receipt);

                  finalResult = {
                    entity: updatedTask,
                    outbox,
                    receipt,
                    wasReplayed: false,
                  };
                },
                abortWithError
              );
            } else if (operation === 'delete') {
              const currentRev = currentTask ? currentTask.revision : expectedRevision;
              if (currentTask && currentTask.revision !== expectedRevision) {
                return abortWithError(
                  new RevisionConflictError(expectedRevision, currentTask.revision, taskId)
                );
              }

              this.allocateNextEnqueueOrdinal(
                syncStore,
                now,
                (ordinal) => {
                  const deletionRev = currentRev + 1;
                  const fence: DeletionFence = {
                    id: fenceKey,
                    owner_id: this.ownerId,
                    entity_type: 'task',
                    entity_id: taskId,
                    deleted_at: now,
                    deletion_revision: deletionRev,
                  };

                  const receipt: MutationReceipt = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    fingerprint,
                    entity_type: 'task',
                    entity_id: taskId,
                    applied_revision: deletionRev,
                    committed_at: now,
                    committed_result: null,
                  };

                  const outbox: OutboxRecord = {
                    mutation_id: mutationId,
                    owner_id: this.ownerId,
                    enqueue_ordinal: ordinal,
                    entity_type: 'task',
                    entity_id: taskId,
                    operation: 'delete',
                    expected_revision: expectedRevision,
                    base_revision: currentRev,
                    payload: { id: taskId, owner_id: this.ownerId, deleted_at: now },
                    fingerprint,
                    created_at: now,
                    status: 'pending',
                  };

                  taskStore.delete(taskId);
                  fenceStore.put(fence);
                  outboxStore.put(outbox);
                  receiptStore.put(receipt);

                  finalResult = {
                    entity: null,
                    outbox,
                    receipt,
                    wasReplayed: false,
                  };
                },
                abortWithError
              );
            }
          };
        };
      };
    });
  }

  public async getTask(id: string): Promise<TaskRecord | null> {
    this.assertOpen();
    const taskId = validateEntityId(id, 'taskId');

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.TASKS, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.TASKS);
      const req = store.get(taskId);
      let item: TaskRecord | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_TASK_FAILED', 'Failed to retrieve task', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_TASK_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  public async listTasks(filter?: TaskFilter): Promise<readonly TaskRecord[]> {
    this.assertOpen();

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.TASKS, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.TASKS);
      const ownerIndex = store.index('by_owner_id');
      const req = ownerIndex.getAll(this.ownerId);
      let results: TaskRecord[] = [];

      req.onsuccess = () => {
        results = req.result ?? [];
      };
      req.onerror = () => reject(new DatabaseError('LIST_TASKS_FAILED', 'Failed to list tasks', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('LIST_TASKS_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => {
        if (filter?.lifecycle) {
          results = results.filter((t) => t.lifecycle === filter.lifecycle);
        }
        if (filter?.plannedDay) {
          results = results.filter((t) => t.planned_day === filter.plannedDay);
        }
        resolve(deepCloneAndFreeze(results));
      };
    });
  }

  /**
   * Appends an immutable evidence record with semantic uniqueness and substantive conflict rejection.
   */
  public async appendEvidence(
    evidenceInput: EvidenceRecord,
    mutationIdInput: string
  ): Promise<MutationResult<EvidenceRecord>> {
    this.assertOpen();
    const cleanEvidence = validateEvidenceRecord(evidenceInput);
    const mutationId = validateEntityId(mutationIdInput, 'mutationId');
    this.assertOwner(cleanEvidence.owner_id);

    const eventId = cleanEvidence.event_id;
    const semanticKey = cleanEvidence.semantic_key;

    // Compute request fingerprint before entering transaction
    const fingerprint = await computeMutationFingerprint(
      mutationId,
      this.ownerId,
      'evidence',
      eventId,
      'insert',
      0,
      cleanEvidence,
      this.subtle
    );

    this.assertOpen();

    return new Promise<MutationResult<EvidenceRecord>>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(
          [STORES.EVIDENCE, STORES.OUTBOX, STORES.MUTATION_RECEIPTS, STORES.OWNER_SYNC_STATE],
          'readwrite'
        );
      } catch (txErr) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create IDB transaction: ${String(txErr)}`, txErr));
      }

      this.registerTransaction(tx);

      const evidenceStore = tx.objectStore(STORES.EVIDENCE);
      const outboxStore = tx.objectStore(STORES.OUTBOX);
      const receiptStore = tx.objectStore(STORES.MUTATION_RECEIPTS);
      const syncStore = tx.objectStore(STORES.OWNER_SYNC_STATE);

      let finalResult: MutationResult<EvidenceRecord> | null = null;
      let aborted = false;

      function abortWithError(error: Error): void {
        if (!aborted) {
          aborted = true;
          try {
            tx.abort();
          } catch {
            // Ignore
          }
          reject(error);
        }
      }

      tx.onabort = () => {
        if (!aborted) reject(new DatabaseError('TX_ABORTED', 'Evidence transaction aborted', tx.error));
      };
      tx.onerror = () => {
        if (!aborted) reject(new DatabaseError('TX_FAILED', 'Evidence transaction failed', tx.error));
      };
      tx.oncomplete = () => {
        if (finalResult) resolve(deepCloneAndFreeze(finalResult));
        else if (!aborted) reject(new DatabaseError('TX_INCOMPLETE', 'Transaction completed without result'));
      };

      // Check receipt first
      const receiptReq = receiptStore.get(mutationId);
      receiptReq.onerror = () => abortWithError(new DatabaseError('RECEIPT_READ_FAILED', 'Failed to read receipt'));
      receiptReq.onsuccess = () => {
        const existingReceipt: MutationReceipt | undefined = receiptReq.result;
        if (existingReceipt) {
          if (existingReceipt.fingerprint === fingerprint) {
            const outboxReq = outboxStore.get(mutationId);
            outboxReq.onsuccess = () => {
              finalResult = {
                entity: (existingReceipt.committed_result as EvidenceRecord) ?? null,
                outbox: outboxReq.result ?? null,
                receipt: existingReceipt,
                wasReplayed: true,
              };
            };
            return;
          } else {
            return abortWithError(new MutationConflictError(mutationId));
          }
        }

        // 1. Explicit check: does event_id already exist?
        const idReq = evidenceStore.get(eventId);
        idReq.onerror = () => abortWithError(new DatabaseError('EVIDENCE_READ_FAILED', 'Failed to check event_id'));
        idReq.onsuccess = () => {
          const existingById: EvidenceRecord | undefined = idReq.result;
          if (existingById) {
            // Same event_id with different semantic_key or differing facts must reject!
            return abortWithError(
              new DatabaseError(
                'EVIDENCE_EXISTS',
                `Evidence with event_id "${eventId}" already exists. Permanent evidence cannot be overwritten.`
              )
            );
          }

          // 2. Semantic uniqueness check
          const semanticIndex = evidenceStore.index('by_semantic_key');
          const semanticReq = semanticIndex.get(semanticKey);
          semanticReq.onerror = () => abortWithError(new DatabaseError('EVIDENCE_READ_FAILED', 'Failed to check semantic_key'));
          semanticReq.onsuccess = () => {
            const existingBySemantic: EvidenceRecord | undefined = semanticReq.result;
            if (existingBySemantic) {
              // Compare substantive payload
              const isSubstantiveMatch =
                existingBySemantic.kind === cleanEvidence.kind &&
                existingBySemantic.local_day === cleanEvidence.local_day &&
                existingBySemantic.estimated_minutes === cleanEvidence.estimated_minutes &&
                existingBySemantic.timezone === cleanEvidence.timezone &&
                existingBySemantic.rule_version === cleanEvidence.rule_version &&
                existingBySemantic.correction_of_event_id === cleanEvidence.correction_of_event_id;

              if (!isSubstantiveMatch) {
                // Semantic-key duplicate with changed substantive payload must conflict!
                return abortWithError(
                  new SemanticConflictError(
                    `Evidence with semantic_key "${semanticKey}" already exists with differing facts. Evidence is immutable.`
                  )
                );
              }

              // Identical semantic retry: reuse original canonical record without another award or outbox write!
              const now = new Date().toISOString();
              const receipt: MutationReceipt = {
                mutation_id: mutationId,
                owner_id: this.ownerId,
                fingerprint,
                entity_type: 'evidence',
                entity_id: existingBySemantic.event_id,
                applied_revision: 1,
                committed_at: now,
                committed_result: existingBySemantic,
              };
              receiptStore.put(receipt);

              finalResult = {
                entity: existingBySemantic,
                outbox: null, // No extra sync write for duplicate semantic retry
                receipt,
                wasReplayed: true,
              };
              return;
            }

            // New evidence record append
            const now = new Date().toISOString();
            this.allocateNextEnqueueOrdinal(
              syncStore,
              now,
              (ordinal) => {
                const receipt: MutationReceipt = {
                  mutation_id: mutationId,
                  owner_id: this.ownerId,
                  fingerprint,
                  entity_type: 'evidence',
                  entity_id: eventId,
                  applied_revision: 1,
                  committed_at: now,
                  committed_result: cleanEvidence,
                };

                const outbox: OutboxRecord = {
                  mutation_id: mutationId,
                  owner_id: this.ownerId,
                  enqueue_ordinal: ordinal,
                  entity_type: 'evidence',
                  entity_id: eventId,
                  operation: 'insert',
                  expected_revision: 0,
                  base_revision: 0,
                  payload: cleanEvidence,
                  fingerprint,
                  created_at: now,
                  status: 'pending',
                };

                // Use append-only add
                evidenceStore.add(cleanEvidence);
                outboxStore.put(outbox);
                receiptStore.put(receipt);

                finalResult = {
                  entity: cleanEvidence,
                  outbox,
                  receipt,
                  wasReplayed: false,
                };
              },
              abortWithError
            );
          };
        };
      };
    });
  }

  public async getEvidenceBySemanticKey(semanticKeyInput: string): Promise<EvidenceRecord | null> {
    this.assertOpen();
    const key = validateEntityId(semanticKeyInput, 'semanticKey');

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.EVIDENCE, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.EVIDENCE);
      const index = store.index('by_semantic_key');
      const req = index.get(key);
      let item: EvidenceRecord | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_EVIDENCE_FAILED', 'Failed to retrieve evidence', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_EVIDENCE_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  public async listEvidence(filter?: EvidenceFilter): Promise<readonly EvidenceRecord[]> {
    this.assertOpen();

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.EVIDENCE, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.EVIDENCE);
      const ownerIndex = store.index('by_owner_id');
      const req = ownerIndex.getAll(this.ownerId);
      let results: EvidenceRecord[] = [];

      req.onsuccess = () => {
        results = req.result ?? [];
      };
      req.onerror = () => reject(new DatabaseError('LIST_EVIDENCE_FAILED', 'Failed to list evidence', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('LIST_EVIDENCE_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => {
        if (filter?.kind) {
          results = results.filter((e) => e.kind === filter.kind);
        }
        if (filter?.localDay) {
          results = results.filter((e) => e.local_day === filter.localDay);
        }
        resolve(deepCloneAndFreeze(results));
      };
    });
  }

  /**
   * Saves a review draft with separate monotonic draft revision CAS checks.
   */
  public async saveReviewDraft(
    draftInput: ReviewDraftRecord,
    mutationIdInput: string,
    expectedDraftRevision?: number
  ): Promise<MutationResult<ReviewDraftRecord>> {
    this.assertOpen();
    const cleanDraft = validateReviewDraftRecord(draftInput);
    const mutationId = validateEntityId(mutationIdInput, 'mutationId');
    const dayKey = cleanDraft.day_key;
    this.assertOwner(cleanDraft.owner_id);

    if (expectedDraftRevision !== undefined) {
      validateRevision(expectedDraftRevision, 'expectedDraftRevision');
    }

    const fingerprint = await computeMutationFingerprint(
      mutationId,
      this.ownerId,
      'review_draft',
      dayKey,
      'update',
      expectedDraftRevision ?? 0,
      cleanDraft,
      this.subtle
    );

    this.assertOpen();

    return new Promise<MutationResult<ReviewDraftRecord>>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(
          [STORES.REVIEW_DRAFTS, STORES.OUTBOX, STORES.MUTATION_RECEIPTS, STORES.OWNER_SYNC_STATE],
          'readwrite'
        );
      } catch (txErr) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create IDB transaction: ${String(txErr)}`, txErr));
      }

      this.registerTransaction(tx);

      const draftStore = tx.objectStore(STORES.REVIEW_DRAFTS);
      const outboxStore = tx.objectStore(STORES.OUTBOX);
      const receiptStore = tx.objectStore(STORES.MUTATION_RECEIPTS);
      const syncStore = tx.objectStore(STORES.OWNER_SYNC_STATE);

      let finalResult: MutationResult<ReviewDraftRecord> | null = null;
      let aborted = false;

      function abortWithError(error: Error): void {
        if (!aborted) {
          aborted = true;
          try {
            tx.abort();
          } catch {
            // Ignore
          }
          reject(error);
        }
      }

      tx.onabort = () => {
        if (!aborted) reject(new DatabaseError('TX_ABORTED', 'Draft transaction aborted', tx.error));
      };
      tx.onerror = () => {
        if (!aborted) reject(new DatabaseError('TX_FAILED', 'Draft transaction failed', tx.error));
      };
      tx.oncomplete = () => {
        if (finalResult) resolve(deepCloneAndFreeze(finalResult));
        else if (!aborted) reject(new DatabaseError('TX_INCOMPLETE', 'Transaction completed without result'));
      };

      const receiptReq = receiptStore.get(mutationId);
      receiptReq.onsuccess = () => {
        const existingReceipt: MutationReceipt | undefined = receiptReq.result;
        if (existingReceipt) {
          if (existingReceipt.fingerprint === fingerprint) {
            const outboxReq = outboxStore.get(mutationId);
            outboxReq.onsuccess = () => {
              finalResult = {
                entity: (existingReceipt.committed_result as ReviewDraftRecord) ?? null,
                outbox: outboxReq.result ?? null,
                receipt: existingReceipt,
                wasReplayed: true,
              };
            };
            return;
          } else {
            return abortWithError(new MutationConflictError(mutationId));
          }
        }

        // Check existing draft for draft_revision CAS check
        const dReq = draftStore.get(dayKey);
        dReq.onerror = () => abortWithError(new DatabaseError('DRAFT_READ_FAILED', 'Failed to read draft'));
        dReq.onsuccess = () => {
          const existingDraft: ReviewDraftRecord | undefined = dReq.result;
          let nextDraftRevision = 1;

          if (existingDraft) {
            if (expectedDraftRevision !== undefined && existingDraft.draft_revision !== expectedDraftRevision) {
              return abortWithError(
                new RevisionConflictError(expectedDraftRevision, existingDraft.draft_revision, dayKey)
              );
            }
            nextDraftRevision = existingDraft.draft_revision + 1;
          } else {
            if (expectedDraftRevision !== undefined && expectedDraftRevision !== 0) {
              return abortWithError(
                new RevisionConflictError(expectedDraftRevision, 0, dayKey)
              );
            }
          }

          const now = new Date().toISOString();
          this.allocateNextEnqueueOrdinal(
            syncStore,
            now,
            (ordinal) => {
              const draftToSave: ReviewDraftRecord = {
                ...cleanDraft,
                draft_revision: nextDraftRevision,
                updated_at: now,
              };

              const receipt: MutationReceipt = {
                mutation_id: mutationId,
                owner_id: this.ownerId,
                fingerprint,
                entity_type: 'review_draft',
                entity_id: dayKey,
                applied_revision: nextDraftRevision,
                committed_at: now,
                committed_result: draftToSave,
              };

              const outbox: OutboxRecord = {
                mutation_id: mutationId,
                owner_id: this.ownerId,
                enqueue_ordinal: ordinal,
                entity_type: 'review_draft',
                entity_id: dayKey,
                operation: existingDraft ? 'update' : 'insert',
                expected_revision: expectedDraftRevision ?? (existingDraft?.draft_revision ?? 0),
                base_revision: existingDraft?.draft_revision ?? 0,
                payload: draftToSave,
                fingerprint,
                created_at: now,
                status: 'pending',
              };

              draftStore.put(draftToSave);
              outboxStore.put(outbox);
              receiptStore.put(receipt);

              finalResult = {
                entity: draftToSave,
                outbox,
                receipt,
                wasReplayed: false,
              };
            },
            abortWithError
          );
        };
      };
    });
  }

  public async getReviewDraft(dayKeyInput: string): Promise<ReviewDraftRecord | null> {
    this.assertOpen();
    const dayKey = validateEntityId(dayKeyInput, 'dayKey');

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.REVIEW_DRAFTS, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.REVIEW_DRAFTS);
      const req = store.get(dayKey);
      let item: ReviewDraftRecord | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_DRAFT_FAILED', 'Failed to retrieve draft', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_DRAFT_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  /**
   * Submits an immutable reflection record with day uniqueness and ID collision rejection.
   */
  public async submitReflection(
    reflectionInput: ReflectionRecord,
    mutationIdInput: string
  ): Promise<MutationResult<ReflectionRecord>> {
    this.assertOpen();
    const cleanReflection = validateReflectionRecord(reflectionInput);
    const mutationId = validateEntityId(mutationIdInput, 'mutationId');
    const id = cleanReflection.id;
    const dayKey = cleanReflection.day_key;
    this.assertOwner(cleanReflection.owner_id);

    const fingerprint = await computeMutationFingerprint(
      mutationId,
      this.ownerId,
      'reflection',
      id,
      'insert',
      0,
      cleanReflection,
      this.subtle
    );

    this.assertOpen();

    return new Promise<MutationResult<ReflectionRecord>>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(
          [STORES.REFLECTIONS, STORES.OUTBOX, STORES.MUTATION_RECEIPTS, STORES.OWNER_SYNC_STATE],
          'readwrite'
        );
      } catch (txErr) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create IDB transaction: ${String(txErr)}`, txErr));
      }

      this.registerTransaction(tx);

      const reflectionStore = tx.objectStore(STORES.REFLECTIONS);
      const outboxStore = tx.objectStore(STORES.OUTBOX);
      const receiptStore = tx.objectStore(STORES.MUTATION_RECEIPTS);
      const syncStore = tx.objectStore(STORES.OWNER_SYNC_STATE);

      let finalResult: MutationResult<ReflectionRecord> | null = null;
      let aborted = false;

      function abortWithError(error: Error): void {
        if (!aborted) {
          aborted = true;
          try {
            tx.abort();
          } catch {
            // Ignore
          }
          reject(error);
        }
      }

      tx.onabort = () => {
        if (!aborted) reject(new DatabaseError('TX_ABORTED', 'Reflection transaction aborted', tx.error));
      };
      tx.onerror = () => {
        if (!aborted) reject(new DatabaseError('TX_FAILED', 'Reflection transaction failed', tx.error));
      };
      tx.oncomplete = () => {
        if (finalResult) resolve(deepCloneAndFreeze(finalResult));
        else if (!aborted) reject(new DatabaseError('TX_INCOMPLETE', 'Transaction completed without result'));
      };

      const receiptReq = receiptStore.get(mutationId);
      receiptReq.onsuccess = () => {
        const existingReceipt: MutationReceipt | undefined = receiptReq.result;
        if (existingReceipt) {
          if (existingReceipt.fingerprint === fingerprint) {
            const outboxReq = outboxStore.get(mutationId);
            outboxReq.onsuccess = () => {
              finalResult = {
                entity: (existingReceipt.committed_result as ReflectionRecord) ?? null,
                outbox: outboxReq.result ?? null,
                receipt: existingReceipt,
                wasReplayed: true,
              };
            };
            return;
          } else {
            return abortWithError(new MutationConflictError(mutationId));
          }
        }

        // 1. Check ID collision
        const idReq = reflectionStore.get(id);
        idReq.onerror = () => abortWithError(new DatabaseError('REFLECTION_READ_FAILED', 'Failed to check reflection ID'));
        idReq.onsuccess = () => {
          const existingById: ReflectionRecord | undefined = idReq.result;
          if (existingById) {
            return abortWithError(
              new DatabaseError(
                'REFLECTION_EXISTS',
                `Reflection with id "${id}" already exists. Reflection submissions cannot be overwritten.`
              )
            );
          }

          // 2. Check unique day_key constraint
          const dayIndex = reflectionStore.index('by_day_key');
          const dayReq = dayIndex.get(dayKey);
          dayReq.onerror = () => abortWithError(new DatabaseError('REFLECTION_READ_FAILED', 'Failed to check day_key'));
          dayReq.onsuccess = () => {
            const existingReflection: ReflectionRecord | undefined = dayReq.result;
            if (existingReflection) {
              // Check substantive payload
              const isMatch =
                existingReflection.word_count === cleanReflection.word_count &&
                existingReflection.submission_hash === cleanReflection.submission_hash &&
                JSON.stringify(existingReflection.answers) === JSON.stringify(cleanReflection.answers);

              if (!isMatch) {
                return abortWithError(
                  new SemanticConflictError(
                    `Reflection for day "${dayKey}" has already been submitted with differing answers.`
                  )
                );
              }

              // Identical retry: reuse canonical record without extra outbox append
              const now = new Date().toISOString();
              const receipt: MutationReceipt = {
                mutation_id: mutationId,
                owner_id: this.ownerId,
                fingerprint,
                entity_type: 'reflection',
                entity_id: existingReflection.id,
                applied_revision: 1,
                committed_at: now,
                committed_result: existingReflection,
              };
              receiptStore.put(receipt);

              finalResult = {
                entity: existingReflection,
                outbox: null,
                receipt,
                wasReplayed: true,
              };
              return;
            }

            const now = new Date().toISOString();
            this.allocateNextEnqueueOrdinal(
              syncStore,
              now,
              (ordinal) => {
                const receipt: MutationReceipt = {
                  mutation_id: mutationId,
                  owner_id: this.ownerId,
                  fingerprint,
                  entity_type: 'reflection',
                  entity_id: id,
                  applied_revision: 1,
                  committed_at: now,
                  committed_result: cleanReflection,
                };

                const outbox: OutboxRecord = {
                  mutation_id: mutationId,
                  owner_id: this.ownerId,
                  enqueue_ordinal: ordinal,
                  entity_type: 'reflection',
                  entity_id: id,
                  operation: 'insert',
                  expected_revision: 0,
                  base_revision: 0,
                  payload: cleanReflection,
                  fingerprint,
                  created_at: now,
                  status: 'pending',
                };

                // Use append-only add
                reflectionStore.add(cleanReflection);
                outboxStore.put(outbox);
                receiptStore.put(receipt);

                finalResult = {
                  entity: cleanReflection,
                  outbox,
                  receipt,
                  wasReplayed: false,
                };
              },
              abortWithError
            );
          };
        };
      };
    });
  }

  public async getReflection(dayKeyInput: string): Promise<ReflectionRecord | null> {
    this.assertOpen();
    const dayKey = validateEntityId(dayKeyInput, 'dayKey');

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.REFLECTIONS, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.REFLECTIONS);
      const index = store.index('by_day_key');
      const req = index.get(dayKey);
      let item: ReflectionRecord | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_REFLECTION_FAILED', 'Failed to retrieve reflection', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_REFLECTION_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  /**
   * Retrieves durable outbox entries strictly ordered by persistent monotonic enqueue ordinal.
   */
  public async getOutbox(limit?: number): Promise<readonly OutboxRecord[]> {
    this.assertOpen();

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.OUTBOX, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.OUTBOX);
      const ordinalIndex = store.index('by_owner_ordinal');
      const keyRange = IDBKeyRange.bound(
        [this.ownerId, 0],
        [this.ownerId, Number.MAX_SAFE_INTEGER]
      );
      const req = ordinalIndex.getAll(keyRange);
      let results: OutboxRecord[] = [];

      req.onsuccess = () => {
        results = req.result ?? [];
      };
      req.onerror = () => reject(new DatabaseError('GET_OUTBOX_FAILED', 'Failed to read outbox', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_OUTBOX_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => {
        if (typeof limit === 'number' && limit > 0) {
          results = results.slice(0, limit);
        }
        resolve(deepCloneAndFreeze(results));
      };
    });
  }

  public async getMutationReceipt(mutationIdInput: string): Promise<MutationReceipt | null> {
    this.assertOpen();
    const mutationId = validateEntityId(mutationIdInput, 'mutationId');

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.MUTATION_RECEIPTS, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.MUTATION_RECEIPTS);
      const req = store.get(mutationId);
      let item: MutationReceipt | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_RECEIPT_FAILED', 'Failed to read receipt', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_RECEIPT_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  public async getDeletionFence(entityType: EntityType, entityId: string): Promise<DeletionFence | null> {
    this.assertOpen();
    const id = validateEntityId(entityId, 'entityId');
    const fenceKey = `${entityType}:${id}`;

    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = this.idb.transaction(STORES.DELETION_FENCES, 'readonly');
      } catch (err) {
        return reject(new DatabaseError('TX_CREATION_FAILED', `Failed to create readonly transaction: ${String(err)}`, err));
      }
      this.registerTransaction(tx);

      const store = tx.objectStore(STORES.DELETION_FENCES);
      const req = store.get(fenceKey);
      let item: DeletionFence | null = null;

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.owner_id === this.ownerId) {
          item = res;
        }
      };
      req.onerror = () => reject(new DatabaseError('GET_FENCE_FAILED', 'Failed to read deletion fence', req.error));
      tx.onabort = () => reject(new DatabaseError('TX_ABORTED', `Transaction aborted: ${tx.error?.message ?? 'unknown'}`, tx.error));
      tx.onerror = () => reject(new DatabaseError('GET_FENCE_FAILED', 'Transaction failed', tx.error));
      tx.oncomplete = () => resolve(item ? deepCloneAndFreeze(item) : null);
    });
  }

  public async deleteDatabase(): Promise<void> {
    this.close();
    return new Promise<void>((resolve, reject) => {
      const req = this.factory.deleteDatabase(this.dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        reject(
          new DatabaseError(
            'DELETE_FAILED',
            `Failed to delete database "${this.dbName}": ${req.error?.message ?? 'unknown error'}`,
            req.error
          )
        );
      };
      req.onblocked = () => {
        reject(
          new DatabaseBlockedError(
            `Deleting database "${this.dbName}" was blocked by existing unclosed connections.`
          )
        );
      };
    });
  }
}
