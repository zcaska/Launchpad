/**
 * LaunchPad Domain Validation & Immutability Utilities (Stage 2A)
 */

import {
  TaskPriority,
  TaskLifecycle,
  Subtask,
  AttachedUrl,
  EvidenceRecord,
  EvidenceKind,
  ReviewDraftRecord,
  ReflectionRecord,
} from './types';

export class DomainValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`[DomainValidationError:${field}] ${message}`);
    this.name = 'DomainValidationError';
  }
}

const OWNER_ID_REGEX = /^[a-zA-Z0-9_\-\.]{1,128}$/;
const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that an owner identifier is a non-empty, safe string without unnormalized whitespace.
 */
export function validateOwnerId(ownerId: unknown): string {
  if (typeof ownerId !== 'string' || !ownerId) {
    throw new DomainValidationError('ownerId', 'ownerId must be a non-empty string');
  }
  if (ownerId !== ownerId.trim()) {
    throw new DomainValidationError(
      'ownerId',
      `ownerId "${ownerId}" contains unnormalized leading or trailing whitespace.`
    );
  }
  if (!OWNER_ID_REGEX.test(ownerId)) {
    throw new DomainValidationError(
      'ownerId',
      `ownerId "${ownerId}" contains invalid characters. Must match ${OWNER_ID_REGEX}`
    );
  }
  return ownerId;
}

/**
 * Validates that an entity identifier is a non-empty string without unnormalized whitespace.
 */
export function validateEntityId(id: unknown, fieldName: string = 'id'): string {
  if (typeof id !== 'string' || !id) {
    throw new DomainValidationError(fieldName, `${fieldName} must be a non-empty string`);
  }
  if (id !== id.trim()) {
    throw new DomainValidationError(
      fieldName,
      `${fieldName} "${id}" contains unnormalized leading or trailing whitespace.`
    );
  }
  return id;
}

/**
 * Validates that a revision counter is a non-negative safe integer.
 */
export function validateRevision(revision: unknown, fieldName: string = 'revision'): number {
  if (
    typeof revision !== 'number' ||
    !Number.isFinite(revision) ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  ) {
    throw new DomainValidationError(
      fieldName,
      `${fieldName} must be a non-negative safe integer. Received: ${String(revision)}`
    );
  }
  return revision;
}

/**
 * Validates that a string is a valid ISO 8601 date timestamp.
 */
export function validateIsoTimestamp(timestamp: unknown, fieldName: string): string {
  if (typeof timestamp !== 'string' || !timestamp) {
    throw new DomainValidationError(fieldName, `${fieldName} must be a non-empty string`);
  }
  if (timestamp !== timestamp.trim()) {
    throw new DomainValidationError(
      fieldName,
      `${fieldName} contains unnormalized leading or trailing whitespace.`
    );
  }
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new DomainValidationError(
      fieldName,
      `${fieldName} must be a valid ISO 8601 date string. Received: ${String(timestamp)}`
    );
  }
  return timestamp;
}

/**
 * Validates a YYYY-MM-DD local day string.
 */
export function validateLocalDay(day: unknown, fieldName: string = 'local_day'): string {
  if (typeof day !== 'string' || !DAY_KEY_REGEX.test(day)) {
    throw new DomainValidationError(
      fieldName,
      `${fieldName} must match YYYY-MM-DD format. Received: ${String(day)}`
    );
  }
  return day;
}

/**
 * Validates task title.
 */
export function validateTaskTitle(title: unknown): string {
  if (typeof title !== 'string' || !title.trim()) {
    throw new DomainValidationError('title', 'Task title must be a non-empty string');
  }
  return title.trim();
}

const VALID_PRIORITIES = new Set<TaskPriority>(['urgent', 'high', 'medium', 'low']);

/**
 * Validates task priority.
 */
export function validateTaskPriority(priority: unknown): TaskPriority {
  if (typeof priority !== 'string' || !VALID_PRIORITIES.has(priority as TaskPriority)) {
    throw new DomainValidationError(
      'priority',
      `Invalid priority "${String(priority)}". Must be one of: urgent, high, medium, low`
    );
  }
  return priority as TaskPriority;
}

const VALID_LIFECYCLES = new Set<TaskLifecycle>(['active', 'completed', 'archived']);

/**
 * Validates task lifecycle state.
 */
export function validateTaskLifecycle(lifecycle: unknown): TaskLifecycle {
  if (typeof lifecycle !== 'string' || !VALID_LIFECYCLES.has(lifecycle as TaskLifecycle)) {
    throw new DomainValidationError(
      'lifecycle',
      `Invalid lifecycle "${String(lifecycle)}". Must be one of: active, completed, archived`
    );
  }
  return lifecycle as TaskLifecycle;
}

/**
 * Validates estimated duration minutes.
 */
export function validateDurationMinutes(duration: unknown): number | undefined {
  if (duration === undefined || duration === null) {
    return undefined;
  }
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    throw new DomainValidationError(
      'duration_minutes',
      `duration_minutes must be a finite non-negative number. Received: ${String(duration)}`
    );
  }
  return duration;
}

/**
 * Validates subtasks array.
 */
export function validateSubtasks(subtasks: unknown): readonly Subtask[] {
  if (subtasks === undefined || subtasks === null) {
    return [];
  }
  if (!Array.isArray(subtasks)) {
    throw new DomainValidationError('subtasks', 'subtasks must be an array');
  }
  for (let i = 0; i < subtasks.length; i++) {
    const s = subtasks[i];
    if (!s || typeof s !== 'object') {
      throw new DomainValidationError(`subtasks[${i}]`, 'subtask must be an object');
    }
    if (typeof s.id !== 'string' || !s.id.trim()) {
      throw new DomainValidationError(`subtasks[${i}].id`, 'subtask id must be a non-empty string');
    }
    if (typeof s.text !== 'string' || !s.text.trim()) {
      throw new DomainValidationError(`subtasks[${i}].text`, 'subtask text must be a non-empty string');
    }
    if (typeof s.is_done !== 'boolean') {
      throw new DomainValidationError(`subtasks[${i}].is_done`, 'subtask is_done must be a boolean');
    }
  }
  return subtasks as readonly Subtask[];
}

/**
 * Validates attached URLs array.
 */
export function validateAttachedUrls(urls: unknown): readonly AttachedUrl[] {
  if (urls === undefined || urls === null) {
    return [];
  }
  if (!Array.isArray(urls)) {
    throw new DomainValidationError('attached_urls', 'attached_urls must be an array');
  }
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    if (!u || typeof u !== 'object') {
      throw new DomainValidationError(`attached_urls[${i}]`, 'attached url must be an object');
    }
    if (typeof u.url !== 'string' || !u.url.trim()) {
      throw new DomainValidationError(`attached_urls[${i}].url`, 'url must be a non-empty string');
    }
    if (u.title !== undefined && (typeof u.title !== 'string' || !u.title.trim())) {
      throw new DomainValidationError(`attached_urls[${i}].title`, 'title must be a non-empty string when provided');
    }
  }
  return urls as readonly AttachedUrl[];
}

const VALID_EVIDENCE_KINDS = new Set<EvidenceKind>([
  'task_completion',
  'daily_review_milestone',
  'achievement_award',
  'correction',
]);

/**
 * Validates an EvidenceRecord runtime payload.
 */
export function validateEvidenceRecord(evidence: EvidenceRecord): EvidenceRecord {
  if (!evidence || typeof evidence !== 'object') {
    throw new DomainValidationError('evidence', 'evidence must be an object');
  }
  const event_id = validateEntityId(evidence.event_id, 'evidence.event_id');
  const owner_id = validateOwnerId(evidence.owner_id);
  const semantic_key = validateEntityId(evidence.semantic_key, 'evidence.semantic_key');

  if (!VALID_EVIDENCE_KINDS.has(evidence.kind)) {
    throw new DomainValidationError(
      'evidence.kind',
      `Invalid evidence kind: "${String(evidence.kind)}"`
    );
  }

  const source = typeof evidence.source === 'string' && evidence.source.trim()
    ? evidence.source.trim()
    : 'self_reported';

  const estimated_minutes = validateDurationMinutes(evidence.estimated_minutes);
  const local_day = validateLocalDay(evidence.local_day, 'evidence.local_day');
  const timezone = validateEntityId(evidence.timezone || 'UTC', 'evidence.timezone');
  const rule_version = validateEntityId(evidence.rule_version, 'evidence.rule_version');
  const occurred_at = validateIsoTimestamp(evidence.occurred_at, 'evidence.occurred_at');
  const created_at = evidence.created_at
    ? validateIsoTimestamp(evidence.created_at, 'evidence.created_at')
    : new Date().toISOString();

  let correction_of_event_id: string | undefined;
  if (evidence.kind === 'correction') {
    correction_of_event_id = validateEntityId(
      evidence.correction_of_event_id,
      'evidence.correction_of_event_id'
    );
  }

  return {
    event_id,
    owner_id,
    semantic_key,
    kind: evidence.kind,
    source,
    estimated_minutes,
    local_day,
    timezone,
    rule_version,
    occurred_at,
    created_at,
    ...(correction_of_event_id ? { correction_of_event_id } : {}),
  };
}

/**
 * Validates a ReviewDraftRecord runtime payload.
 */
export function validateReviewDraftRecord(draft: ReviewDraftRecord): ReviewDraftRecord {
  if (!draft || typeof draft !== 'object') {
    throw new DomainValidationError('draft', 'review draft must be an object');
  }
  const owner_id = validateOwnerId(draft.owner_id);
  const day_key = validateLocalDay(draft.day_key, 'draft.day_key');

  if (!Array.isArray(draft.answers) || draft.answers.length !== 6) {
    throw new DomainValidationError('draft.answers', 'draft.answers must be a tuple of 6 strings');
  }
  for (let i = 0; i < 6; i++) {
    if (typeof draft.answers[i] !== 'string') {
      throw new DomainValidationError(`draft.answers[${i}]`, 'draft answer must be a string');
    }
  }

  if (!Array.isArray(draft.completion_ids)) {
    throw new DomainValidationError('draft.completion_ids', 'draft.completion_ids must be an array');
  }
  for (let i = 0; i < draft.completion_ids.length; i++) {
    validateEntityId(draft.completion_ids[i], `draft.completion_ids[${i}]`);
  }

  const plan_revision = validateRevision(draft.plan_revision, 'draft.plan_revision');
  const draft_revision = draft.draft_revision !== undefined
    ? validateRevision(draft.draft_revision, 'draft.draft_revision')
    : 1;

  const updated_at = draft.updated_at
    ? validateIsoTimestamp(draft.updated_at, 'draft.updated_at')
    : new Date().toISOString();

  return {
    owner_id,
    day_key,
    answers: [
      draft.answers[0],
      draft.answers[1],
      draft.answers[2],
      draft.answers[3],
      draft.answers[4],
      draft.answers[5],
    ],
    completion_ids: [...draft.completion_ids],
    plan_revision,
    draft_revision,
    updated_at,
  };
}

/**
 * Validates a ReflectionRecord runtime payload.
 */
export function validateReflectionRecord(reflection: ReflectionRecord): ReflectionRecord {
  if (!reflection || typeof reflection !== 'object') {
    throw new DomainValidationError('reflection', 'reflection must be an object');
  }
  const id = validateEntityId(reflection.id, 'reflection.id');
  const owner_id = validateOwnerId(reflection.owner_id);
  const day_key = validateLocalDay(reflection.day_key, 'reflection.day_key');

  if (!Array.isArray(reflection.answers) || reflection.answers.length !== 6) {
    throw new DomainValidationError('reflection.answers', 'reflection.answers must be a tuple of 6 strings');
  }
  for (let i = 0; i < 6; i++) {
    if (typeof reflection.answers[i] !== 'string') {
      throw new DomainValidationError(`reflection.answers[${i}]`, 'reflection answer must be a string');
    }
  }

  if (!Array.isArray(reflection.completion_ids)) {
    throw new DomainValidationError('reflection.completion_ids', 'reflection.completion_ids must be an array');
  }
  for (let i = 0; i < reflection.completion_ids.length; i++) {
    validateEntityId(reflection.completion_ids[i], `reflection.completion_ids[${i}]`);
  }

  const word_count = validateRevision(reflection.word_count, 'reflection.word_count');
  const submitted_at = validateIsoTimestamp(reflection.submitted_at, 'reflection.submitted_at');
  const submission_hash = validateEntityId(reflection.submission_hash, 'reflection.submission_hash');

  return {
    id,
    owner_id,
    day_key,
    answers: [
      reflection.answers[0],
      reflection.answers[1],
      reflection.answers[2],
      reflection.answers[3],
      reflection.answers[4],
      reflection.answers[5],
    ],
    completion_ids: [...reflection.completion_ids],
    word_count,
    submitted_at,
    submission_hash,
  };
}

/**
 * Deep clones any JSON-serializable value and recursively freezes every object and array.
 * Ensures caller aliases cannot mutate internal database state or results.
 * Rejects circular references, functions, symbols, and non-finite numbers.
 * Allows valid DAG object sharing across fields without false circular errors.
 */
export function deepCloneAndFreeze<T>(val: T, activeStack = new Set<object>()): T {
  if (val === null || typeof val !== 'object') {
    if (typeof val === 'function' || typeof val === 'symbol') {
      throw new DomainValidationError('value', `Functions and symbols cannot be cloned or frozen`);
    }
    if (typeof val === 'number' && !Number.isFinite(val)) {
      throw new DomainValidationError('value', `Non-finite numbers (${val}) cannot be cloned or frozen`);
    }
    return val;
  }

  if (activeStack.has(val)) {
    throw new DomainValidationError('value', 'Circular reference detected');
  }
  activeStack.add(val);

  let result: any;
  if (Array.isArray(val)) {
    const clonedArray = val.map((item) => deepCloneAndFreeze(item, activeStack));
    result = Object.freeze(clonedArray);
  } else {
    const clonedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(val as Record<string, any>)) {
      clonedObj[key] = deepCloneAndFreeze(value, activeStack);
    }
    result = Object.freeze(clonedObj);
  }

  activeStack.delete(val);
  return result as T;
}
