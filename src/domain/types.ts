/**
 * LaunchPad Core Domain Contracts (Stage 2A)
 *
 * Defines minimal, stable contracts for:
 * - Tasks (manual attributes, lifecycle, planning day, 10-minute completion lifecycle)
 * - Evidence (immutable self-reported completion records, append-only corrections, rule versions)
 * - Daily Review (six-prompt autosaved drafts and permanent reflection submissions)
 * - Storage & Synchronization (durable outbox, mutation receipts, deletion fences, conflict logs, migration manifests)
 *
 * Invariant: Planning and XP algorithms are deliberately decoupled from these data contracts.
 */

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskLifecycle = 'active' | 'completed' | 'archived';

export interface Subtask {
  readonly id: string;
  readonly text: string;
  readonly is_done: boolean;
}

export interface AttachedUrl {
  readonly url: string;
  readonly title?: string;
}

/**
 * Task entity representing manual and converted tasks.
 */
export interface TaskRecord {
  readonly id: string;
  readonly owner_id: string;
  readonly revision: number; // Monotonic local revision counter (>= 1)
  readonly title: string;
  readonly description?: string;
  readonly duration_minutes?: number; // Estimated minutes
  readonly deadline?: string; // ISO 8601 or YYYY-MM-DD
  readonly priority: TaskPriority;
  readonly subtasks: readonly Subtask[];
  readonly attached_urls: readonly AttachedUrl[];
  readonly planned_day?: string; // YYYY-MM-DD
  readonly lifecycle: TaskLifecycle;
  readonly completion_id?: string;
  readonly completed_at?: string; // UTC ISO 8601
  readonly undo_until?: string; // UTC ISO 8601 (completed_at + 10m)
  readonly archived_at?: string; // UTC ISO 8601
  readonly review_day?: string; // YYYY-MM-DD
  readonly deleted_at?: string; // UTC ISO 8601
  readonly created_at: string; // UTC ISO 8601
  readonly updated_at: string; // UTC ISO 8601
}

export type EvidenceKind =
  | 'task_completion'
  | 'daily_review_milestone'
  | 'achievement_award'
  | 'correction';

/**
 * Immutable evidence event record.
 */
export interface EvidenceRecord {
  readonly event_id: string;
  readonly owner_id: string;
  readonly semantic_key: string; // Unique deduplication key (e.g. task_completion:${taskId}:${completionId})
  readonly kind: EvidenceKind;
  readonly source: string; // Defaults to 'self_reported'
  readonly estimated_minutes?: number;
  readonly local_day: string; // YYYY-MM-DD
  readonly timezone: string; // Local IANA timezone or UTC
  readonly rule_version: string; // e.g. 'v1'
  readonly occurred_at: string; // UTC ISO 8601
  readonly created_at: string; // UTC ISO 8601
  readonly correction_of_event_id?: string; // Set when kind === 'correction'
}

/**
 * Draft review responses for the six guided prompts.
 */
export interface ReviewDraftRecord {
  readonly owner_id: string;
  readonly day_key: string; // YYYY-MM-DD PK
  readonly answers: readonly [string, string, string, string, string, string];
  readonly completion_ids: readonly string[];
  readonly plan_revision: number;
  readonly draft_revision: number; // Monotonic local draft revision counter (>= 1), independent of plan_revision
  readonly updated_at: string; // UTC ISO 8601
}

/**
 * Permanent, immutable daily review submission.
 */
export interface ReflectionRecord {
  readonly id: string;
  readonly owner_id: string;
  readonly day_key: string; // YYYY-MM-DD (unique constraint)
  readonly answers: readonly [string, string, string, string, string, string];
  readonly completion_ids: readonly string[];
  readonly word_count: number;
  readonly submitted_at: string; // UTC ISO 8601
  readonly submission_hash: string;
}

export type EntityType =
  | 'task'
  | 'evidence'
  | 'review_draft'
  | 'reflection'
  | 'settings';

export type MutationOperation = 'insert' | 'update' | 'delete';

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'conflict';

/**
 * Durable outbox entry queued for synchronization.
 */
export interface OutboxRecord {
  readonly mutation_id: string; // PK
  readonly owner_id: string;
  readonly enqueue_ordinal: number; // Persistent monotonic per-DB enqueue order (>= 1)
  readonly entity_type: EntityType;
  readonly entity_id: string;
  readonly operation: MutationOperation;
  readonly expected_revision: number;
  readonly predecessor_mutation_id?: string;
  readonly base_revision?: number;
  readonly payload: unknown;
  readonly fingerprint: string; // Deterministic hash of mutation request
  readonly created_at: string; // UTC ISO 8601
  readonly status: OutboxStatus;
}

/**
 * Durable receipt for committed local mutations (enables idempotent retries).
 */
export interface MutationReceipt {
  readonly mutation_id: string; // PK
  readonly owner_id: string;
  readonly fingerprint: string;
  readonly entity_type: EntityType;
  readonly entity_id: string;
  readonly applied_revision: number;
  readonly committed_at: string; // UTC ISO 8601
  readonly committed_result?: unknown; // Durable snapshot of committed result (null for deletion)
}

/**
 * Deletion tombstone fence preventing recreation or stale upsert of deleted entities.
 */
export interface DeletionFence {
  readonly id: string; // Composite PK: `${entity_type}:${entity_id}`
  readonly owner_id: string;
  readonly entity_type: EntityType;
  readonly entity_id: string;
  readonly deleted_at: string; // UTC ISO 8601
  readonly deletion_revision: number;
}

/**
 * Log of synchronization conflicts requiring manual or rule-based resolution.
 */
export interface ConflictRecord {
  readonly conflict_id: string; // PK
  readonly owner_id: string;
  readonly entity_type: EntityType;
  readonly entity_id: string;
  readonly client_mutation_id: string;
  readonly server_revision: number;
  readonly local_data: unknown;
  readonly remote_data: unknown;
  readonly detected_at: string; // UTC ISO 8601
  readonly status: 'unresolved' | 'resolved';
}

/**
 * Record of legacy localStorage -> IndexedDB migration executions.
 */
export interface MigrationManifestRecord {
  readonly manifest_id: string; // PK
  readonly owner_id: string;
  readonly legacy_schema_version: string;
  readonly staged_at: string; // UTC ISO 8601
  readonly source_manifest_hash: string;
  readonly entry_count: number;
  readonly migrated_counts: Readonly<Record<string, number>>;
  readonly status: 'staged' | 'in_progress' | 'verified' | 'rolled_back';
}

/**
 * Internal state tracking per-owner monotonic enqueue sequence counter.
 */
export interface OwnerSyncStateRecord {
  readonly owner_id: string;
  readonly next_enqueue_ordinal: number;
  readonly updated_at: string;
}
