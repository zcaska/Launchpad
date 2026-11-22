/**
 * LaunchPad Legacy Migration Converter (Stage 2B)
 *
 * Implements pure, deterministic conversion of legacy storage payloads into
 * TaskRecord[] and an immutable legacy archive.
 *
 * Guarantees:
 * - Pure & deterministic: same input candidate produces identical records and SHA-256 digests.
 * - Stable IDs preserved: task IDs are never regenerated or altered.
 * - Same titles never deduped: multiple tasks with identical titles but distinct IDs are preserved.
 * - Lossless sidecar: properties not expressible in core domain (URL IDs, timeSpentSeconds,
 *   legacy source fields, ticktick metadata) are retained in sidecars.
 * - No fabricated completion evidence: legacy done tasks lack reliable completion timestamps;
 *   they are converted to archived lifecycle without fabricating completedAt, XP, or evidence.
 * - Fail with actionable reports on duplicate IDs, missing IDs, or malformed/corrupt JSON.
 * - Immutable legacy archive retains whole raw payload, growthHistory, reflections, and XP.
 */

import { TaskRecord, Subtask, AttachedUrl, TaskPriority, MigrationManifestRecord } from '../../domain/types';
import { deepCloneAndFreeze } from '../../domain/validation';
import {
  LegacyTaskCandidate,
  LegacySubtaskItem,
  LegacyAttachedUrlItem,
  LegacyTaskSidecar,
  LegacyDoneTaskArchive,
  LegacyGrowthArchive,
  LegacyMigrationArchive,
  MigrationValidationErrorDetail,
  MigrationPreviewResult,
} from './types';

/**
 * Computes Web Crypto SHA-256 hexadecimal digest.
 */
export async function computeSha256Digest(
  input: string | Uint8Array,
  subtleCrypto?: SubtleCrypto
): Promise<string> {
  const subtle = subtleCrypto ?? (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined);
  if (!subtle || typeof subtle.digest !== 'function') {
    throw new Error('Web Crypto API (subtle.digest) is unavailable in current runtime.');
  }

  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const buffer = await subtle.digest('SHA-256', bytes as BufferSource);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Canonical JSON stringifier that sorts object keys deterministically.
 */
export function canonicalJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  const entries = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((val as Record<string, unknown>)[k]));
  return '{' + entries.join(',') + '}';
}

export interface ConvertOptions {
  readonly ownerId?: string;
  readonly stagedAt?: string;
  readonly subtle?: SubtleCrypto;
}

export const REPRESENTATION_EXPLANATION_DONE_TASKS =
  'Legacy LaunchPad stored task completion as a simple boolean flag (isDone: true) without an immutable completion timestamp, completion event ID, or verified execution proof. In accordance with domain integrity invariants, legacy done tasks are archived with lifecycle: "archived", completed_at: undefined, and completion_id: undefined. Their archived_at property records the explicit migration staging/conversion timestamp (stagedAt) when they entered the archive; original creationDate is NEVER fabricated as completion or archival time. Full raw legacy properties are preserved in the immutable legacy archive. Zero artificial completion dates, fake XP, or synthetic evidence events were fabricated.';

export const REPRESENTATION_EXPLANATION_SIDECAR =
  'Core TaskRecord contracts deliberately omit integration-specific metadata, focused duration seconds, and original subtask/URL link IDs. These attributes are fully preserved in lossless LegacyTaskSidecar records mapped by task ID.';

export const REPRESENTATION_EXPLANATION_GROWTH_ARCHIVE =
  'Legacy gamification aggregates (currentXp, streak counts, hero unlocks) and daily growth history are preserved in the immutable LegacyGrowthArchive for historical inspection and future profile migration. They are never converted into synthetic task completion evidence or unearned level awards.';

/**
 * Pure converter function from legacy AppData/raw candidate into TaskRecord[] + archive.
 */
export async function convertLegacyPayload(
  rawCandidate: unknown,
  options: ConvertOptions = {}
): Promise<MigrationPreviewResult> {
  const stagedAt = options.stagedAt ?? new Date().toISOString();
  const subtle = options.subtle;

  // Validate ownerId explicitly: must be safe non-empty string without whitespace
  let ownerId = 'local_user';
  if (options.ownerId !== undefined) {
    if (typeof options.ownerId !== 'string' || !options.ownerId) {
      return {
        success: false,
        errors: [
          {
            code: 'INVALID_OWNER_ID',
            message: 'options.ownerId must be a non-empty string.',
            actionableRemedy: 'Provide a valid non-empty string for ownerId.',
          },
        ],
        actionableReport: '[Migration Failure: INVALID_OWNER_ID] options.ownerId must be a non-empty string.',
        rawRecoverable: false,
        rawPayloadSha256: '',
        candidateTaskCount: 0,
      };
    }
    if (options.ownerId !== options.ownerId.trim()) {
      return {
        success: false,
        errors: [
          {
            code: 'UNNORMALIZED_ID_WHITESPACE',
            message: `ownerId "${options.ownerId}" contains unnormalized leading or trailing whitespace. IDs must not be silently altered.`,
            actionableRemedy: 'Normalize ownerId before invoking migration.',
          },
        ],
        actionableReport: `[Migration Failure: UNNORMALIZED_ID_WHITESPACE] ownerId "${options.ownerId}" contains unnormalized whitespace.`,
        rawRecoverable: false,
        rawPayloadSha256: '',
        candidateTaskCount: 0,
      };
    }
    if (!/^[a-zA-Z0-9_\-\.]{1,128}$/.test(options.ownerId)) {
      return {
        success: false,
        errors: [
          {
            code: 'INVALID_OWNER_ID',
            message: `ownerId "${options.ownerId}" contains invalid characters. Must match safe pattern /^[a-zA-Z0-9_\\-\\.]*$/.`,
            actionableRemedy: 'Use an ownerId matching the safe alphanumeric/hyphen/underscore pattern.',
          },
        ],
        actionableReport: `[Migration Failure: INVALID_OWNER_ID] ownerId "${options.ownerId}" contains invalid characters.`,
        rawRecoverable: false,
        rawPayloadSha256: '',
        candidateTaskCount: 0,
      };
    }
    ownerId = options.ownerId;
  }

  // 1. Resolve raw string and validate container shape
  let rawString: string;
  let parsedObject: Record<string, unknown>;

  if (typeof rawCandidate === 'string') {
    rawString = rawCandidate;
    try {
      const parsed = JSON.parse(rawCandidate);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        const sha256 = await computeSha256Digest(rawString, subtle).catch(() => 'hash-unavailable');
        const kind = parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed;
        const errDetail: MigrationValidationErrorDetail = {
          code: 'MALFORMED_CONTAINER_SHAPE',
          message: `Raw candidate parsed to a JSON ${kind}, but expected a legacy AppData container object.`,
          actionableRemedy: 'Ensure the candidate JSON represents a legacy AppData object containing quickNotes or tasks.',
        };
        return {
          success: false,
          errors: [errDetail],
          actionableReport: `[Migration Failure: MALFORMED_CONTAINER_SHAPE]\n${errDetail.message}\nRemedy: ${errDetail.actionableRemedy}`,
          rawRecoverable: true,
          rawPayloadSha256: sha256,
          candidateTaskCount: 0,
        };
      }
      parsedObject = parsed as Record<string, unknown>;
    } catch (parseErr) {
      const sha256 = await computeSha256Digest(rawString, subtle).catch(() => 'hash-unavailable');
      const errDetail: MigrationValidationErrorDetail = {
        code: 'CORRUPT_RAW_PAYLOAD',
        message: `Raw candidate payload is malformed or invalid JSON: ${String(parseErr)}`,
        actionableRemedy:
          'Inspect the raw storage string for truncation or invalid characters. The raw payload has been preserved without mutation and remains recoverable.',
      };
      return {
        success: false,
        errors: [errDetail],
        actionableReport: `[Migration Failure: CORRUPT_RAW_PAYLOAD]\n${errDetail.message}\nRemedy: ${errDetail.actionableRemedy}`,
        rawRecoverable: true,
        rawPayloadSha256: sha256,
        candidateTaskCount: 0,
      };
    }
  } else if (rawCandidate && typeof rawCandidate === 'object' && !Array.isArray(rawCandidate)) {
    // If input is a recovery envelope or staged snapshot, extract candidate AppData if present
    const candidateObj = rawCandidate as Record<string, unknown>;
    if (candidateObj.rawMap && typeof candidateObj.rawMap === 'object') {
      const rawMap = candidateObj.rawMap as Record<string, string>;
      const primaryKey = ['launchpad_app_data_v3', 'launchpad_app_data_v2', 'launchpad_app_data_v1', 'launchpad_app_data_backup_v3', 'launchpad_app_data_backup'].find(
        (k) => typeof rawMap[k] === 'string'
      );
      if (primaryKey && rawMap[primaryKey]) {
        return convertLegacyPayload(rawMap[primaryKey], options);
      }
    }
    parsedObject = candidateObj;
    rawString = canonicalJson(candidateObj);
  } else {
    const kind = rawCandidate === null ? 'null' : Array.isArray(rawCandidate) ? 'array' : typeof rawCandidate;
    return {
      success: false,
      errors: [
        {
          code: 'MALFORMED_CONTAINER_SHAPE',
          message: `Expected candidate to be a legacy AppData object, but received ${kind}.`,
          actionableRemedy: 'Provide valid legacy AppData JSON string or object candidate.',
        },
      ],
      actionableReport: `[Migration Failure: MALFORMED_CONTAINER_SHAPE] Candidate is a ${kind}, not an AppData object.`,
      rawRecoverable: typeof rawCandidate === 'string',
      rawPayloadSha256: '',
      candidateTaskCount: 0,
    };
  }

  const rawSha256 = await computeSha256Digest(rawString, subtle);

  // 2. Locate tasks list and strictly validate tasks array container
  let candidateTasks: unknown[];
  const hasQuickNotes = 'quickNotes' in parsedObject;
  const hasTasks = 'tasks' in parsedObject;

  if (!hasQuickNotes && !hasTasks) {
    return {
      success: false,
      errors: [
        {
          code: 'MALFORMED_CONTAINER_SHAPE',
          message:
            "Candidate object does not contain a legacy tasks array ('quickNotes' or 'tasks' property is missing). Valid legacy containers must include a tasks array (empty array 'quickNotes: []' is permitted for valid empty storage).",
          actionableRemedy:
            "Ensure the legacy candidate has a 'quickNotes' or 'tasks' array. Do not supply arbitrary objects without a task list.",
        },
      ],
      actionableReport:
        "[Migration Failure: MALFORMED_CONTAINER_SHAPE] Missing 'quickNotes' or 'tasks' array in candidate object.",
      rawRecoverable: true,
      rawPayloadSha256: rawSha256,
      candidateTaskCount: 0,
    };
  }

  if (hasQuickNotes) {
    if (!Array.isArray(parsedObject.quickNotes)) {
      return {
        success: false,
        errors: [
          {
            code: 'MALFORMED_CONTAINER_SHAPE',
            message: `Legacy container 'quickNotes' property must be an array, but received ${typeof parsedObject.quickNotes}.`,
            actionableRemedy: "Ensure 'quickNotes' is an array of task objects.",
          },
        ],
        actionableReport:
          `[Migration Failure: MALFORMED_CONTAINER_SHAPE] 'quickNotes' property is ${typeof parsedObject.quickNotes}, not an array.`,
        rawRecoverable: true,
        rawPayloadSha256: rawSha256,
        candidateTaskCount: 0,
      };
    }
    candidateTasks = parsedObject.quickNotes;
  } else {
    if (!Array.isArray(parsedObject.tasks)) {
      return {
        success: false,
        errors: [
          {
            code: 'MALFORMED_CONTAINER_SHAPE',
            message: `Legacy container 'tasks' property must be an array, but received ${typeof parsedObject.tasks}.`,
            actionableRemedy: "Ensure 'tasks' is an array of task objects.",
          },
        ],
        actionableReport:
          `[Migration Failure: MALFORMED_CONTAINER_SHAPE] 'tasks' property is ${typeof parsedObject.tasks}, not an array.`,
        rawRecoverable: true,
        rawPayloadSha256: rawSha256,
        candidateTaskCount: 0,
      };
    }
    candidateTasks = parsedObject.tasks;
  }

  // 3. Validate tasks: check for missing IDs, duplicate IDs, whitespace, timestamps, and structure
  const validationErrors: MigrationValidationErrorDetail[] = [];
  const seenIds = new Map<string, { index: number; title: string }>();
  const validCandidates: { task: LegacyTaskCandidate; index: number }[] = [];

  for (let i = 0; i < candidateTasks.length; i++) {
    const item = candidateTasks[i];
    if (!item || typeof item !== 'object') {
      validationErrors.push({
        code: 'MALFORMED_TASK_STRUCTURE',
        index: i,
        message: `Task at index ${i} is not a valid object (${typeof item}).`,
        actionableRemedy: `Remove or fix non-object element at index ${i} in legacy tasks array.`,
      });
      continue;
    }

    const task = item as LegacyTaskCandidate;
    const taskTitle = typeof task.text === 'string' ? task.text.trim() : typeof task.title === 'string' ? task.title.trim() : 'Untitled Task';

    // Missing ID check
    if (typeof task.id !== 'string' || task.id.length === 0) {
      validationErrors.push({
        code: 'MISSING_TASK_ID',
        index: i,
        taskTitle,
        message: `Task at index ${i} ("${taskTitle}") has a missing, non-string, or empty "id" field.`,
        actionableRemedy: `Assign a stable unique string ID to task at index ${i} before running migration preview.`,
      });
      continue;
    }

    // Unnormalized whitespace in task ID check
    if (task.id !== task.id.trim()) {
      validationErrors.push({
        code: 'UNNORMALIZED_ID_WHITESPACE',
        index: i,
        taskId: task.id,
        taskTitle,
        message: `Task at index ${i} ("${taskTitle}") has ID "${task.id}" containing unnormalized whitespace. IDs must be preserved bit-for-bit without silent trimming.`,
        actionableRemedy: `Remove unnormalized whitespace from ID "${task.id}" in source storage.`,
      });
      continue;
    }

    const id = task.id; // EXACT ID PRESERVED WITHOUT TRIM!

    // Duplicate ID check
    const existing = seenIds.get(id);
    if (existing) {
      validationErrors.push({
        code: 'DUPLICATE_TASK_ID',
        index: i,
        taskId: id,
        taskTitle,
        message: `Duplicate task ID "${id}" detected at index ${i} ("${taskTitle}"), previously seen at index ${existing.index} ("${existing.title}").`,
        actionableRemedy: `Resolve the ID collision for "${id}". Stable unique IDs are strictly required; silent deduplication or dropping is prohibited.`,
      });
      continue;
    }

    // Subtask IDs whitespace and validation check
    if (Array.isArray(task.subtasks)) {
      for (let sIdx = 0; sIdx < task.subtasks.length; sIdx++) {
        const rawSub = task.subtasks[sIdx] as LegacySubtaskItem;
        if (rawSub && typeof rawSub === 'object' && rawSub.id !== undefined) {
          if (typeof rawSub.id !== 'string' || rawSub.id.length === 0) {
            validationErrors.push({
              code: 'MISSING_SUBTASK_ID',
              index: i,
              taskId: id,
              taskTitle,
              message: `Subtask at index ${sIdx} in task "${id}" has a non-string or empty id.`,
              actionableRemedy: `Provide a valid string id for subtask at index ${sIdx}.`,
            });
          } else if (rawSub.id !== rawSub.id.trim()) {
            validationErrors.push({
              code: 'UNNORMALIZED_ID_WHITESPACE',
              index: i,
              taskId: id,
              taskTitle,
              message: `Subtask ID "${rawSub.id}" in task "${id}" contains unnormalized whitespace.`,
              actionableRemedy: `Normalize whitespace for subtask ID "${rawSub.id}".`,
            });
          }
        }
      }
    }

    // Attached URL IDs whitespace and validation check
    if (Array.isArray(task.attachedUrls)) {
      for (let uIdx = 0; uIdx < task.attachedUrls.length; uIdx++) {
        const rawUrl = task.attachedUrls[uIdx] as LegacyAttachedUrlItem;
        if (rawUrl && typeof rawUrl === 'object' && rawUrl.id !== undefined) {
          if (typeof rawUrl.id !== 'string' || rawUrl.id.length === 0) {
            validationErrors.push({
              code: 'MALFORMED_TASK_STRUCTURE',
              index: i,
              taskId: id,
              taskTitle,
              message: `Attached URL at index ${uIdx} in task "${id}" has a non-string or empty id.`,
              actionableRemedy: `Provide a valid string id for attached URL at index ${uIdx}.`,
            });
          } else if (rawUrl.id !== rawUrl.id.trim()) {
            validationErrors.push({
              code: 'UNNORMALIZED_ID_WHITESPACE',
              index: i,
              taskId: id,
              taskTitle,
              message: `Attached URL ID "${rawUrl.id}" in task "${id}" contains unnormalized whitespace.`,
              actionableRemedy: `Normalize whitespace for URL ID "${rawUrl.id}".`,
            });
          }
        }
      }
    }

    // CreatedAt timestamp validation
    if (task.createdAt !== undefined && task.createdAt !== null) {
      if (typeof task.createdAt === 'number') {
        if (!Number.isFinite(task.createdAt) || !Number.isSafeInteger(task.createdAt) || task.createdAt <= 0) {
          validationErrors.push({
            code: 'INVALID_TIMESTAMP',
            index: i,
            taskId: id,
            taskTitle,
            message: `Task "${id}" createdAt must be a positive integer timestamp, received: ${task.createdAt}.`,
            actionableRemedy: `Fix invalid createdAt timestamp on task "${id}".`,
          });
        }
      } else if (typeof task.createdAt === 'string') {
        if (task.createdAt !== task.createdAt.trim() || Number.isNaN(Date.parse(task.createdAt))) {
          validationErrors.push({
            code: 'INVALID_TIMESTAMP',
            index: i,
            taskId: id,
            taskTitle,
            message: `Task "${id}" createdAt "${task.createdAt}" is not a valid ISO date or has unnormalized whitespace.`,
            actionableRemedy: `Provide a valid ISO 8601 date string for createdAt on task "${id}".`,
          });
        }
      } else {
        validationErrors.push({
          code: 'INVALID_TIMESTAMP',
          index: i,
          taskId: id,
          taskTitle,
          message: `Task "${id}" createdAt must be a number or string, received ${typeof task.createdAt}.`,
          actionableRemedy: `Fix createdAt type on task "${id}".`,
        });
      }
    }

    seenIds.set(id, { index: i, title: taskTitle });
    validCandidates.push({ task, index: i });
  }

  // If any validation errors exist, fail preview immediately with actionable report
  if (validationErrors.length > 0) {
    const errorList = validationErrors.map((e, idx) => `  ${idx + 1}. [${e.code}] ${e.message}\n     Remedy: ${e.actionableRemedy}`).join('\n');
    const actionableReport = `[Migration Preview Failed with ${validationErrors.length} validation error(s)]\n${errorList}\n\nNotice: Raw candidate data remains completely intact and recoverable.`;
    return {
      success: false,
      errors: validationErrors,
      actionableReport,
      rawRecoverable: true,
      rawPayloadSha256: rawSha256,
      candidateTaskCount: candidateTasks.length,
    };
  }

  // 4. Perform pure, deterministic conversion
  const taskRecords: TaskRecord[] = [];
  const activeTasks: TaskRecord[] = [];
  const archivedDoneTasks: TaskRecord[] = [];
  const doneTasksArchive: LegacyDoneTaskArchive[] = [];
  const taskSidecars: Record<string, LegacyTaskSidecar> = {};

  const titleCounts = new Map<string, number>();

  for (const { task } of validCandidates) {
    const id = task.id as string; // EXACT STABLE ID WITHOUT TRIM
    const title = (typeof task.text === 'string' ? task.text : typeof task.title === 'string' ? task.title : 'Untitled Task').trim() || 'Untitled Task';
    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);

    const isDone = Boolean(task.isDone ?? task.is_done);

    // Duration minutes
    let duration_minutes: number | undefined;
    const rawDur = task.durationMinutes ?? task.duration_minutes;
    if (typeof rawDur === 'number' && Number.isFinite(rawDur) && rawDur > 0) {
      duration_minutes = rawDur;
    }

    // Priority
    let priority: TaskPriority = 'medium';
    if (task.priority === 'urgent' || task.priority === 'high' || task.priority === 'medium' || task.priority === 'low') {
      priority = task.priority;
    }

    // Deadline: preserve legacy format as-is, including "HH:MM" or ISO date
    let deadline: string | undefined;
    if (typeof task.deadline === 'string' && task.deadline.trim()) {
      deadline = task.deadline.trim();
    }

    // Created at timestamp
    let createdAtIso = stagedAt;
    if (typeof task.createdAt === 'number' && Number.isFinite(task.createdAt)) {
      createdAtIso = new Date(task.createdAt).toISOString();
    } else if (typeof task.createdAt === 'string' && task.createdAt.trim()) {
      createdAtIso = task.createdAt.trim();
    }

    // Description
    const description = typeof task.description === 'string' && task.description.trim() ? task.description.trim() : undefined;

    // Subtasks: preserve exact subtask IDs without trim
    const subtasks: Subtask[] = [];
    if (Array.isArray(task.subtasks)) {
      for (let sIdx = 0; sIdx < task.subtasks.length; sIdx++) {
        const rawSub = task.subtasks[sIdx] as LegacySubtaskItem;
        if (rawSub && typeof rawSub === 'object') {
          const subId = typeof rawSub.id === 'string' ? rawSub.id : `subtask-${sIdx + 1}`;
          const subText = typeof rawSub.text === 'string' ? rawSub.text.trim() : typeof rawSub.title === 'string' ? rawSub.title.trim() : `Step ${sIdx + 1}`;
          const subDone = Boolean(rawSub.is_done ?? rawSub.isDone);
          subtasks.push({ id: subId, text: subText, is_done: subDone });
        }
      }
    }

    // Attached URLs: domain AttachedUrl has url and title; original exact ID preserved in sidecar
    const attached_urls: AttachedUrl[] = [];
    const originalUrlIds: { id?: string; url: string; title?: string }[] = [];
    if (Array.isArray(task.attachedUrls)) {
      for (let uIdx = 0; uIdx < task.attachedUrls.length; uIdx++) {
        const rawUrl = task.attachedUrls[uIdx] as LegacyAttachedUrlItem;
        if (rawUrl && typeof rawUrl === 'object' && typeof rawUrl.url === 'string' && rawUrl.url.trim()) {
          const urlStr = rawUrl.url.trim();
          const urlTitle = typeof rawUrl.title === 'string' && rawUrl.title.trim() ? rawUrl.title.trim() : undefined;
          attached_urls.push({ url: urlStr, ...(urlTitle ? { title: urlTitle } : {}) });
          originalUrlIds.push({
            id: typeof rawUrl.id === 'string' ? rawUrl.id : undefined,
            url: urlStr,
            title: urlTitle,
          });
        }
      }
    }

    // Planned day
    const planned_day = typeof task.planned_day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.planned_day.trim())
      ? task.planned_day.trim()
      : undefined;

    // Build lossless sidecar for this task
    const sidecar: LegacyTaskSidecar = deepCloneAndFreeze({
      taskId: id,
      originalUrlIds,
      timeSpentSeconds: typeof task.timeSpentSeconds === 'number' && Number.isFinite(task.timeSpentSeconds) ? task.timeSpentSeconds : undefined,
      source: typeof task.source === 'string' ? task.source : undefined,
      eventId: typeof task.eventId === 'string' ? task.eventId : undefined,
      ticktickTaskId: typeof task.ticktickTaskId === 'string' ? task.ticktickTaskId : undefined,
      ticktickProjectId: typeof task.ticktickProjectId === 'string' ? task.ticktickProjectId : undefined,
      ticktickLastModified: typeof task.ticktickLastModified === 'number' ? task.ticktickLastModified : undefined,
      syncStatus: typeof task.syncStatus === 'string' ? task.syncStatus : undefined,
      originalCreatedAt: typeof task.createdAt === 'number' || typeof task.createdAt === 'string' ? task.createdAt : undefined,
      originalIsDone: isDone,
      originalRaw: task as Record<string, unknown>,
    });
    taskSidecars[id] = sidecar;

    if (isDone) {
      // Completed legacy task: archived without fabricated completedAt/XP/evidence.
      // archived_at uses explicitly provided stagedAt as actual archival-conversion time; NEVER creationDate!
      const archivedRecord: TaskRecord = {
        id,
        owner_id: ownerId,
        revision: 1,
        title,
        ...(description ? { description } : {}),
        ...(duration_minutes !== undefined ? { duration_minutes } : {}),
        ...(deadline ? { deadline } : {}),
        priority,
        subtasks,
        attached_urls,
        ...(planned_day ? { planned_day } : {}),
        lifecycle: 'archived',
        archived_at: stagedAt,
        created_at: createdAtIso,
        updated_at: stagedAt,
      };

      archivedDoneTasks.push(archivedRecord);
      taskRecords.push(archivedRecord);

      doneTasksArchive.push({
        taskId: id,
        title,
        representationNotice: REPRESENTATION_EXPLANATION_DONE_TASKS,
        hasReliableCompletedAt: false,
        completedAtFabricated: false,
        xpGranted: 0,
        evidenceFabricated: false,
        originalCreatedAt: task.createdAt as number | string | undefined,
        archivedAt: stagedAt,
        sidecar,
      });
    } else {
      // Active task
      const activeRecord: TaskRecord = {
        id,
        owner_id: ownerId,
        revision: 1,
        title,
        ...(description ? { description } : {}),
        ...(duration_minutes !== undefined ? { duration_minutes } : {}),
        ...(deadline ? { deadline } : {}),
        priority,
        subtasks,
        attached_urls,
        ...(planned_day ? { planned_day } : {}),
        lifecycle: 'active',
        created_at: createdAtIso,
        updated_at: createdAtIso,
      };

      activeTasks.push(activeRecord);
      taskRecords.push(activeRecord);
    }
  }

  // 5. Build immutable legacy growth archive
  const rawGrowthHistory = (parsedObject.growthHistory && typeof parsedObject.growthHistory === 'object')
    ? (parsedObject.growthHistory as Record<string, unknown>)
    : {};

  const rawGamification = (parsedObject.gamification && typeof parsedObject.gamification === 'object')
    ? (parsedObject.gamification as Record<string, unknown>)
    : {};

  const legacyReflections: unknown[] = Array.isArray(parsedObject.reflections) ? parsedObject.reflections : [];

  const growthArchive: LegacyGrowthArchive = deepCloneAndFreeze({
    growthHistory: rawGrowthHistory,
    legacyReflections,
    gamification: {
      currentXp: typeof rawGamification.currentXp === 'number' ? rawGamification.currentXp : undefined,
      currentStreak: typeof rawGamification.currentStreak === 'number' ? rawGamification.currentStreak : undefined,
      longestStreak: typeof rawGamification.longestStreak === 'number' ? rawGamification.longestStreak : undefined,
      lastActiveDate: typeof rawGamification.lastActiveDate === 'string' ? rawGamification.lastActiveDate : undefined,
      unlockedHeroIds: Array.isArray(rawGamification.unlockedHeroIds) ? (rawGamification.unlockedHeroIds as string[]) : undefined,
      activeHeroId: typeof rawGamification.activeHeroId === 'string' ? rawGamification.activeHeroId : undefined,
      lastBackupTimestamp: typeof rawGamification.lastBackupTimestamp === 'number' ? rawGamification.lastBackupTimestamp : undefined,
    },
    aggregateNotice: REPRESENTATION_EXPLANATION_GROWTH_ARCHIVE,
  });

  const sourceChecksumSha256 = rawSha256;
  const legacyArchive: LegacyMigrationArchive = deepCloneAndFreeze({
    schemaVersion: 'launchpad-migration-archive-v1',
    sourceChecksumSha256,
    rawPayloadChecksumSha256: rawSha256,
    originalRawPayload: rawString,
    growthArchive,
    doneTasksArchive,
    taskSidecars,
    archiveCreatedAt: stagedAt,
  });

  const archiveChecksumSha256 = await computeSha256Digest(canonicalJson(legacyArchive), subtle);
  const taskListChecksumSha256 = await computeSha256Digest(canonicalJson(taskRecords), subtle);

  // Compute duplicate title metrics
  let duplicateTitleCount = 0;
  for (const count of titleCounts.values()) {
    if (count > 1) {
      duplicateTitleCount += count;
    }
  }

  const distinctTitleCount = titleCounts.size;
  const subtaskTotalCount = taskRecords.reduce((sum, t) => sum + t.subtasks.length, 0);
  const attachedUrlTotalCount = taskRecords.reduce((sum, t) => sum + t.attached_urls.length, 0);
  const growthDaysCount = Object.keys(rawGrowthHistory).length;

  const manifest: MigrationManifestRecord = deepCloneAndFreeze({
    manifest_id: `manifest-${rawSha256.slice(0, 16)}`,
    owner_id: ownerId,
    legacy_schema_version: typeof parsedObject.version === 'number' ? `v${parsedObject.version}` : 'v3',
    staged_at: stagedAt,
    source_manifest_hash: rawSha256,
    entry_count: taskRecords.length,
    migrated_counts: {
      totalTasks: taskRecords.length,
      activeTasks: activeTasks.length,
      archivedDoneTasks: archivedDoneTasks.length,
      subtasks: subtaskTotalCount,
      attachedUrls: attachedUrlTotalCount,
      sidecars: Object.keys(taskSidecars).length,
      growthDays: growthDaysCount,
    },
    status: 'staged',
  });

  return {
    success: true,
    manifest,
    taskRecords: deepCloneAndFreeze(taskRecords),
    activeTasks: deepCloneAndFreeze(activeTasks),
    archivedDoneTasks: deepCloneAndFreeze(archivedDoneTasks),
    legacyArchive,
    fingerprint: {
      totalCandidateTasks: taskRecords.length,
      activeTaskCount: activeTasks.length,
      archivedDoneTaskCount: archivedDoneTasks.length,
      distinctTitleCount,
      duplicateTitleCount,
      subtaskCount: subtaskTotalCount,
      attachedUrlCount: attachedUrlTotalCount,
      sidecarCount: Object.keys(taskSidecars).length,
      growthDaysCount,
      taskListChecksumSha256,
      archiveChecksumSha256,
    },
    representationExplanations: [
      REPRESENTATION_EXPLANATION_DONE_TASKS,
      REPRESENTATION_EXPLANATION_SIDECAR,
      REPRESENTATION_EXPLANATION_GROWTH_ARCHIVE,
    ],
    liveActivationDisclosures: {
      isLiveActivation: false,
      isUserDataDeleted: false,
      isAppWired: false,
      separateFixtureNamespace: true,
      note: 'This preview and any subsequent staging writes occur purely in fixture memory or an isolated fixture IndexedDB database. Live application storage, live user data, and production databases are strictly untouched.',
    },
  };
}
