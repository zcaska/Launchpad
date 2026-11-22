/**
 * LaunchPad Legacy Migration Contracts & Types (Stage 2B)
 *
 * Defines pure contracts for:
 * - Deterministic conversion from legacy AppData / raw candidate into TaskRecord[].
 * - Lossless sidecar preservation for fields the core domain does not express.
 * - Immutable legacy archive retaining original raw payload, growth history,
 *   legacy reflections, achievements, and XP without fabricating evidence.
 * - Historical representation of done legacy tasks without fabricated completedAt.
 * - Actionable preview reports for corruption, missing IDs, or duplicate IDs.
 * - Separate fixture-namespace staging in IndexedDB with post-import verification.
 */

import { TaskRecord, MigrationManifestRecord } from '../../domain/types';

export class MigrationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[MigrationError:${code}] ${message}`);
    this.name = 'MigrationError';
  }
}

export interface MigrationValidationErrorDetail {
  readonly code:
    | 'CORRUPT_RAW_PAYLOAD'
    | 'MALFORMED_CONTAINER_SHAPE'
    | 'MISSING_TASK_ID'
    | 'DUPLICATE_TASK_ID'
    | 'UNNORMALIZED_ID_WHITESPACE'
    | 'MISSING_SUBTASK_ID'
    | 'INVALID_TIMESTAMP'
    | 'MALFORMED_TASK_STRUCTURE'
    | 'INVALID_OWNER_ID'
    | 'UNEXPECTED_DATA_TYPE';
  readonly index?: number;
  readonly taskId?: string;
  readonly taskTitle?: string;
  readonly message: string;
  readonly actionableRemedy: string;
}

export interface LegacySubtaskItem {
  readonly id?: string;
  readonly text?: string;
  readonly title?: string;
  readonly isDone?: boolean;
  readonly is_done?: boolean;
}

export interface LegacyAttachedUrlItem {
  readonly id?: string;
  readonly url?: string;
  readonly title?: string;
}

export interface LegacyTaskCandidate {
  readonly id?: unknown;
  readonly text?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
  readonly isDone?: unknown;
  readonly is_done?: unknown;
  readonly createdAt?: unknown;
  readonly durationMinutes?: unknown;
  readonly duration_minutes?: unknown;
  readonly deadline?: unknown;
  readonly priority?: unknown;
  readonly attachedUrls?: unknown;
  readonly subtasks?: unknown;
  readonly source?: unknown;
  readonly eventId?: unknown;
  readonly timeSpentSeconds?: unknown;
  readonly ticktickTaskId?: unknown;
  readonly ticktickProjectId?: unknown;
  readonly ticktickLastModified?: unknown;
  readonly syncStatus?: unknown;
  readonly planned_day?: unknown;
  readonly [key: string]: unknown;
}

/**
 * Lossless sidecar holding properties that the core TaskRecord domain contract
 * deliberately does not express or where original legacy IDs / representations must be kept.
 */
export interface LegacyTaskSidecar {
  readonly taskId: string;
  readonly originalUrlIds: readonly {
    readonly id?: string;
    readonly url: string;
    readonly title?: string;
  }[];
  readonly timeSpentSeconds?: number;
  readonly source?: 'local' | 'google_calendar' | 'ticktick' | string;
  readonly eventId?: string;
  readonly ticktickTaskId?: string;
  readonly ticktickProjectId?: string;
  readonly ticktickLastModified?: number;
  readonly syncStatus?: 'synced' | 'pending' | 'error' | string;
  readonly originalCreatedAt?: number | string;
  readonly originalIsDone: boolean;
  readonly originalRaw: Readonly<Record<string, unknown>>;
}

/**
 * Explicit representation of archived legacy completed tasks.
 * Invariant: legacy tasks have NO reliable completion timestamps.
 * No completion dates, XP, or evidence events are ever fabricated.
 */
export interface LegacyDoneTaskArchive {
  readonly taskId: string;
  readonly title: string;
  readonly representationNotice: string;
  readonly hasReliableCompletedAt: false;
  readonly completedAtFabricated: false;
  readonly xpGranted: 0;
  readonly evidenceFabricated: false;
  readonly originalCreatedAt?: number | string;
  readonly archivedAt?: string;
  readonly sidecar: LegacyTaskSidecar;
}

/**
 * Retains original whole raw payload, growth history, reflections, achievements, and XP.
 */
export interface LegacyGrowthArchive {
  readonly growthHistory: Readonly<Record<string, unknown>>;
  readonly legacyReflections: readonly unknown[];
  readonly gamification: {
    readonly currentXp?: number;
    readonly currentStreak?: number;
    readonly longestStreak?: number;
    readonly lastActiveDate?: string;
    readonly unlockedHeroIds?: readonly string[];
    readonly activeHeroId?: string;
    readonly lastBackupTimestamp?: number;
  };
  readonly aggregateNotice: string;
}

/**
 * Complete immutable legacy migration archive with cryptographic checksums.
 */
export interface LegacyMigrationArchive {
  readonly schemaVersion: 'launchpad-migration-archive-v1';
  readonly sourceChecksumSha256: string;
  readonly rawPayloadChecksumSha256: string;
  readonly originalRawPayload: string;
  readonly growthArchive: LegacyGrowthArchive;
  readonly doneTasksArchive: readonly LegacyDoneTaskArchive[];
  readonly taskSidecars: Readonly<Record<string, LegacyTaskSidecar>>;
  readonly archiveCreatedAt: string; // ISO 8601
}

/**
 * Failure result when preview cannot proceed safely.
 * Retains raw candidate payload so that nothing is discarded.
 */
export interface MigrationPreviewFailure {
  readonly success: false;
  readonly errors: readonly MigrationValidationErrorDetail[];
  readonly actionableReport: string;
  readonly rawRecoverable: boolean;
  readonly rawPayloadSha256: string;
  readonly candidateTaskCount: number;
}

/**
 * Success result from pure migration preview.
 */
export interface MigrationPreviewSuccess {
  readonly success: true;
  readonly manifest: MigrationManifestRecord;
  readonly taskRecords: readonly TaskRecord[];
  readonly activeTasks: readonly TaskRecord[];
  readonly archivedDoneTasks: readonly TaskRecord[];
  readonly legacyArchive: LegacyMigrationArchive;
  readonly fingerprint: {
    readonly totalCandidateTasks: number;
    readonly activeTaskCount: number;
    readonly archivedDoneTaskCount: number;
    readonly distinctTitleCount: number;
    readonly duplicateTitleCount: number;
    readonly subtaskCount: number;
    readonly attachedUrlCount: number;
    readonly sidecarCount: number;
    readonly growthDaysCount: number;
    readonly taskListChecksumSha256: string;
    readonly archiveChecksumSha256: string;
  };
  readonly representationExplanations: readonly string[];
  readonly liveActivationDisclosures: {
    readonly isLiveActivation: false;
    readonly isUserDataDeleted: false;
    readonly isAppWired: false;
    readonly separateFixtureNamespace: true;
    readonly note: string;
  };
}

export type MigrationPreviewResult = MigrationPreviewSuccess | MigrationPreviewFailure;

export interface MigrationStageOptions {
  readonly ownerId: string;
  readonly fixturePrefix?: string; // Default: 'launchpad_fixture_stage_'
  readonly idbFactory?: IDBFactory;
  readonly subtle?: SubtleCrypto;
  readonly stagedAt?: string;
}

export interface MigrationStageResult {
  readonly status: 'staged' | 'verified';
  readonly manifest: MigrationManifestRecord;
  readonly fixtureDatabaseName: string;
  readonly tasksWritten: number;
  readonly verificationPassed: boolean;
  readonly preview: MigrationPreviewSuccess;
  readonly verifiedAt: string;
  readonly disclosures: {
    readonly separateFixtureNamespace: true;
    readonly liveDataUntouched: true;
    readonly noUserDataDeletion: true;
    readonly requiresExplicitLiveApproval: true;
  };
}
