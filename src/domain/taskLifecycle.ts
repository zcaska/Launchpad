import type { EvidenceRecord, TaskRecord } from './types';

const UNDO_WINDOW_MS = 600_000;
const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface CompletionTaskSnapshot {
  readonly title: string;
  readonly duration_minutes?: number;
  readonly priority: TaskRecord['priority'];
  readonly subtasks: readonly Readonly<{ id: string; text: string; is_done: boolean }>[];
}

/** Persistence intent only; this reducer never writes evidence or awards XP. */
export interface SelfReportedEvidenceIntent {
  readonly event_id: string;
  readonly semantic_key: string;
  readonly kind: 'task_completion';
  readonly source: 'self_reported';
  readonly occurred_at: string;
  readonly local_day: string;
  readonly task_snapshot: CompletionTaskSnapshot;
  readonly verified: false;
}

export interface FinalizedReviewProof {
  readonly owner_id: string;
  readonly day_key: string;
  readonly finalized: true;
  readonly completion_semantic_keys: readonly string[];
}

export interface ReviewCleanupIntent {
  readonly purge_redundant_task_payload: true;
  readonly semantic_key: string;
  readonly retain_evidence: true;
  readonly retain_deletion_fence: true;
  readonly retain_completed_summary: true;
  readonly prohibit_resurrection: true;
}

export type LifecycleResult = {
  readonly task: TaskRecord;
  readonly event?: 'completed' | 'undone' | 'settled';
  readonly evidenceIntent?: SelfReportedEvidenceIntent;
  readonly conflict?: string;
};

function conflict(task: TaskRecord, reason: string): LifecycleResult { return { task, conflict: reason }; }

function parseUtcIso(value: string): number | undefined {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value ? milliseconds : undefined;
}

function expectedRevisionMatches(task: TaskRecord, expectedRevision: number): boolean {
  return Number.isSafeInteger(expectedRevision) && task.revision === expectedRevision;
}

function isCompletionId(value: string): boolean { return value.trim().length > 0 && value === value.trim(); }

function hasValidLocalDay(value: string): boolean {
  if (!LOCAL_DAY.test(value)) return false;
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === value;
}

function completionState(task: TaskRecord): { readonly completedAt: number; readonly undoUntil: number; readonly completionId: string; readonly occurredAt: string; readonly reviewDay: string } | undefined {
  if (!task.completion_id || !isCompletionId(task.completion_id) || !task.completed_at || !task.undo_until || !task.review_day) return undefined;
  const completedAt = parseUtcIso(task.completed_at);
  const undoUntil = parseUtcIso(task.undo_until);
  if (completedAt === undefined || undoUntil === undefined || undoUntil !== completedAt + UNDO_WINDOW_MS || !hasValidLocalDay(task.review_day)) return undefined;
  return { completedAt, undoUntil, completionId: task.completion_id, occurredAt: task.completed_at, reviewDay: task.review_day };
}

function immutableSnapshot(task: TaskRecord): CompletionTaskSnapshot {
  const subtasks = task.subtasks.map((subtask) => Object.freeze({ ...subtask }));
  return Object.freeze({
    title: task.title,
    ...(task.duration_minutes === undefined ? {} : { duration_minutes: task.duration_minutes }),
    priority: task.priority,
    subtasks: Object.freeze(subtasks),
  });
}

export function completeTask(task: TaskRecord, now: string, localDay: string, completionId: string, expectedRevision: number): LifecycleResult {
  const nowMs = parseUtcIso(now);
  const createdAt = parseUtcIso(task.created_at);
  if (nowMs === undefined || createdAt === undefined || nowMs < createdAt || !hasValidLocalDay(localDay) || !isCompletionId(completionId)) return conflict(task, 'invalid_transition_timestamp_or_input');
  if (task.deleted_at || task.lifecycle === 'archived') return conflict(task, 'deleted_or_archived');
  if (!expectedRevisionMatches(task, expectedRevision)) return conflict(task, 'stale_revision');
  if (task.lifecycle === 'completed') return task.completion_id === completionId ? { task } : conflict(task, 'already_completed');
  if (task.lifecycle !== 'active') return conflict(task, 'invalid_lifecycle');
  return {
    task: { ...task, lifecycle: 'completed', completion_id: completionId, completed_at: now, undo_until: new Date(nowMs + UNDO_WINDOW_MS).toISOString(), review_day: localDay, revision: task.revision + 1, updated_at: now },
    event: 'completed',
  };
}

export function undoCompletion(task: TaskRecord, now: string, expectedRevision: number): LifecycleResult {
  const nowMs = parseUtcIso(now);
  if (nowMs === undefined) return conflict(task, 'invalid_transition_timestamp_or_input');
  if (task.deleted_at) return conflict(task, 'deleted');
  if (!expectedRevisionMatches(task, expectedRevision)) return conflict(task, 'stale_revision');
  if (task.lifecycle !== 'completed') return conflict(task, 'not_undoable');
  const completed = completionState(task);
  if (!completed) return conflict(task, 'invalid_lifecycle_state');
  if (nowMs < completed.completedAt) return conflict(task, 'before_completion');
  if (nowMs >= completed.undoUntil) return conflict(task, 'undo_expired');
  return {
    task: { ...task, lifecycle: 'active', completion_id: undefined, completed_at: undefined, undo_until: undefined, review_day: undefined, revision: task.revision + 1, updated_at: now },
    event: 'undone',
  };
}

export function settleCompletion(task: TaskRecord, now: string, expectedRevision: number): LifecycleResult {
  const nowMs = parseUtcIso(now);
  if (nowMs === undefined) return conflict(task, 'invalid_transition_timestamp_or_input');
  if (task.deleted_at) return conflict(task, 'deleted');
  if (!expectedRevisionMatches(task, expectedRevision)) return conflict(task, 'stale_revision');
  if (task.lifecycle === 'archived') return { task };
  if (task.lifecycle !== 'completed') return conflict(task, 'not_due');
  const completed = completionState(task);
  if (!completed) return conflict(task, 'invalid_lifecycle_state');
  if (nowMs < completed.undoUntil) return conflict(task, 'not_due');
  const semanticKey = `task_completion:${task.id}:${completed.completionId}`;
  const evidenceIntent: SelfReportedEvidenceIntent = Object.freeze({
    event_id: semanticKey, semantic_key: semanticKey, kind: 'task_completion', source: 'self_reported',
    occurred_at: completed.occurredAt, local_day: completed.reviewDay, task_snapshot: immutableSnapshot(task), verified: false,
  });
  return { task: { ...task, lifecycle: 'archived', archived_at: now, revision: task.revision + 1, updated_at: now }, event: 'settled', evidenceIntent };
}

/** Intent only: evidence, deletion fences, and a minimal summary always remain durable. */
export function reviewCleanupIntent(evidence: readonly EvidenceRecord[], finalizedReview: FinalizedReviewProof | undefined, taskId: string, completionId: string): ReviewCleanupIntent | undefined {
  const semanticKey = `task_completion:${taskId}:${completionId}`;
  if (!finalizedReview || !finalizedReview.finalized || !hasValidLocalDay(finalizedReview.day_key)) return undefined;
  const permanentEvidence = evidence.find((record) =>
    record.kind === 'task_completion' && record.source === 'self_reported' && record.semantic_key === semanticKey &&
    record.owner_id === finalizedReview.owner_id && record.local_day === finalizedReview.day_key,
  );
  if (!permanentEvidence || !finalizedReview.completion_semantic_keys.includes(semanticKey)) return undefined;
  return { purge_redundant_task_payload: true, semantic_key: semanticKey, retain_evidence: true, retain_deletion_fence: true, retain_completed_summary: true, prohibit_resurrection: true };
}
