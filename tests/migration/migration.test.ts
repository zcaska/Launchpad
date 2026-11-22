/**
 * LaunchPad Legacy Migration Test Suite (Stage 2B)
 *
 * Comprehensive tests for:
 * 1. Malformed / corrupt raw JSON candidate rejection & raw recoverability.
 * 2. Missing task ID detection & actionable remediation report.
 * 3. Duplicate task ID detection & rejection without silent dropping.
 * 4. Duplicate task titles with distinct IDs preservation (never dedup titles).
 * 5. Full imported field fidelity (deadline HH:MM, URLs with original IDs, subtasks,
 *    timeSpentSeconds, legacy source & sync metadata, lossless sidecar).
 * 6. Historical representation of done tasks (no fabricated completedAt/XP/evidence).
 * 7. Unknown growth history & legacy reflections preservation in immutable archive.
 * 8. Deterministic record mapping & SHA-256 manifest resumability.
 * 9. Staged copy into isolated IndexedDB fixture namespace with readback verification.
 * 10. Repeat staging idempotency.
 * 11. Transaction abort & clean retry behavior in fixture copy.
 * 12. Accurate runtime disclosure when IDB factory is unavailable.
 * 13. Operational safety disclosures & concise preview report generation.
 */

import {
  generateMigrationPreview,
  formatPreviewReport,
  stageMigrationCopy,
  computeSha256Digest,
  canonicalJson,
  MigrationPreviewSuccess,
  MigrationPreviewFailure,
} from '../../src/services/migration';
import { MockIDBFactory } from './mockIdb';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite(): Promise<void> {
  console.log('=== Stage 2B Legacy Migration Test Suite ===\n');

  // 1. Malformed / Corrupt Raw JSON and Container Shape Validation
  console.log('1. Testing malformed/corrupt raw JSON and container shape handling...');
  {
    // 1a. Corrupt unclosed JSON
    const corruptPayload = '{"version": 3, "quickNotes": [{"id": "task-1", "text": "Unclosed string';
    const previewCorrupt = await generateMigrationPreview(corruptPayload);
    assert(!previewCorrupt.success, 'Corrupt payload must fail preview');
    const failureCorrupt = previewCorrupt as MigrationPreviewFailure;
    assert(failureCorrupt.rawRecoverable === true, 'Corrupt raw payload must remain recoverable');
    assert(failureCorrupt.errors[0].code === 'CORRUPT_RAW_PAYLOAD', 'Error code must be CORRUPT_RAW_PAYLOAD');
    assert(failureCorrupt.rawPayloadSha256.length === 64, 'Must compute SHA-256 of raw corrupt string');

    // 1b. JSON null
    const previewNull = await generateMigrationPreview('null');
    assert(!previewNull.success, 'JSON null must fail preview');
    assert((previewNull as MigrationPreviewFailure).errors[0].code === 'MALFORMED_CONTAINER_SHAPE', 'null must be MALFORMED_CONTAINER_SHAPE');

    // 1c. JSON Array
    const previewArray = await generateMigrationPreview('[1, 2, 3]');
    assert(!previewArray.success, 'JSON array must fail preview');
    assert((previewArray as MigrationPreviewFailure).errors[0].code === 'MALFORMED_CONTAINER_SHAPE', 'array must be MALFORMED_CONTAINER_SHAPE');

    // 1d. Empty object {} missing tasks array
    const previewEmptyObj = await generateMigrationPreview('{}');
    assert(!previewEmptyObj.success, 'Empty object without tasks array must fail preview');
    assert((previewEmptyObj as MigrationPreviewFailure).errors[0].code === 'MALFORMED_CONTAINER_SHAPE', '{} must be MALFORMED_CONTAINER_SHAPE');

    // 1e. quickNotes: {} (non-array quickNotes)
    const previewBadNotes = await generateMigrationPreview({ quickNotes: {} });
    assert(!previewBadNotes.success, 'quickNotes as object must fail preview');
    assert((previewBadNotes as MigrationPreviewFailure).errors[0].code === 'MALFORMED_CONTAINER_SHAPE', 'non-array quickNotes must be MALFORMED_CONTAINER_SHAPE');

    // 1f. Valid empty quickNotes: []
    const previewValidEmpty = await generateMigrationPreview({ version: 3, quickNotes: [] });
    assert(previewValidEmpty.success, 'Valid empty quickNotes: [] must succeed');
    assert((previewValidEmpty as MigrationPreviewSuccess).taskRecords.length === 0, 'Zero tasks for valid empty container');

    const formattedReport = formatPreviewReport(previewCorrupt);
    assert(formattedReport.includes('STAGE 2B MIGRATION PREVIEW: FAILED'), 'Formatted report must indicate failure');
    assert(formattedReport.includes('CORRUPT_RAW_PAYLOAD'), 'Formatted report must include diagnostic');
    console.log('   ✓ Malformed/corrupt JSON and container shapes rejected with recoverable raw payload; empty quickNotes:[] permitted.');
  }

  // 2. Missing Task ID & Whitespace Rejection
  console.log('2. Testing missing task ID and unnormalized whitespace rejection...');
  {
    // 2a. Missing and blank IDs
    const payloadWithMissingId = {
      version: 3,
      quickNotes: [
        { id: 'valid-task-1', text: 'First task', isDone: false },
        { text: 'Task without ID', isDone: false }, // missing id!
        { id: '', text: 'Task with empty ID', isDone: false }, // empty id!
      ],
    };
    const previewMissing = await generateMigrationPreview(payloadWithMissingId);
    assert(!previewMissing.success, 'Payload with missing IDs must fail preview');
    const failureMissing = previewMissing as MigrationPreviewFailure;
    assert(failureMissing.errors.length === 2, 'Must report both missing ID errors');
    assert(failureMissing.errors[0].code === 'MISSING_TASK_ID', 'First error must be MISSING_TASK_ID');
    assert(failureMissing.errors[0].index === 1, 'First error must point to index 1');

    // 2b. Unnormalized whitespace in task ID
    const payloadWithWhitespaceId = {
      version: 3,
      quickNotes: [{ id: '  task-with-leading-space', text: 'Spaced ID', isDone: false }],
    };
    const previewWhitespace = await generateMigrationPreview(payloadWithWhitespaceId);
    assert(!previewWhitespace.success, 'Task with unnormalized whitespace ID must fail preview');
    assert((previewWhitespace as MigrationPreviewFailure).errors[0].code === 'UNNORMALIZED_ID_WHITESPACE', 'Must reject with UNNORMALIZED_ID_WHITESPACE');

    // 2c. Unnormalized whitespace in subtask ID
    const payloadWithWhitespaceSubtask = {
      version: 3,
      quickNotes: [{
        id: 'task-clean',
        text: 'Clean',
        isDone: false,
        subtasks: [{ id: ' sub-whitespace ', text: 'Sub' }],
      }],
    };
    const previewSub = await generateMigrationPreview(payloadWithWhitespaceSubtask);
    assert(!previewSub.success, 'Subtask with whitespace ID must fail preview');
    assert((previewSub as MigrationPreviewFailure).errors[0].code === 'UNNORMALIZED_ID_WHITESPACE', 'Must reject subtask with UNNORMALIZED_ID_WHITESPACE');

    // 2d. Unnormalized whitespace in URL ID
    const payloadWithWhitespaceUrl = {
      version: 3,
      quickNotes: [{
        id: 'task-clean',
        text: 'Clean',
        isDone: false,
        attachedUrls: [{ id: ' url-whitespace ', url: 'https://example.com' }],
      }],
    };
    const previewUrl = await generateMigrationPreview(payloadWithWhitespaceUrl);
    assert(!previewUrl.success, 'URL with whitespace ID must fail preview');
    assert((previewUrl as MigrationPreviewFailure).errors[0].code === 'UNNORMALIZED_ID_WHITESPACE', 'Must reject URL with UNNORMALIZED_ID_WHITESPACE');

    // 2e. Unnormalized whitespace in ownerId
    const previewOwner = await generateMigrationPreview({ version: 3, quickNotes: [] }, { ownerId: ' bad_owner ' });
    assert(!previewOwner.success, 'ownerId with whitespace must fail preview');
    assert((previewOwner as MigrationPreviewFailure).errors[0].code === 'UNNORMALIZED_ID_WHITESPACE', 'Must reject owner with UNNORMALIZED_ID_WHITESPACE');

    console.log('   ✓ Missing task IDs and unnormalized whitespace in task/subtask/URL/owner IDs rejected without silent trimming.');
  }

  // 3. Duplicate Task ID
  console.log('3. Testing duplicate task ID detection and rejection...');
  {
    const payloadWithDuplicateIds = {
      version: 3,
      quickNotes: [
        { id: 'duplicate-id-123', text: 'Initial work item', isDone: false },
        { id: 'unique-id-456', text: 'Another item', isDone: false },
        { id: 'duplicate-id-123', text: 'Collision work item', isDone: true }, // duplicate!
      ],
    };
    const preview = await generateMigrationPreview(payloadWithDuplicateIds);

    assert(!preview.success, 'Duplicate task IDs must fail preview');
    const failure = preview as MigrationPreviewFailure;
    assert(failure.errors.length === 1, 'Must detect the duplicate ID');
    assert(failure.errors[0].code === 'DUPLICATE_TASK_ID', 'Error code must be DUPLICATE_TASK_ID');
    assert(failure.errors[0].taskId === 'duplicate-id-123', 'Error must name the offending ID');
    assert(failure.errors[0].message.includes('index 2'), 'Message must reference offending index');
    assert(failure.errors[0].message.includes('index 0'), 'Message must reference first occurrence');
    console.log('   ✓ Duplicate task IDs detected and rejected without silent coercion or dropping.');
  }

  // 4. Duplicate Titles With Distinct IDs (Never Dedup)
  console.log('4. Testing duplicate titles with distinct IDs preservation...');
  {
    const payloadWithDuplicateTitles = {
      version: 3,
      quickNotes: [
        { id: 'id-alpha', text: 'Review pull request', isDone: false },
        { id: 'id-beta', text: 'Review pull request', isDone: true }, // same title!
        { id: 'id-gamma', text: 'Review pull request', isDone: false }, // same title!
      ],
    };
    const preview = await generateMigrationPreview(payloadWithDuplicateTitles);

    assert(preview.success, 'Duplicate titles with distinct IDs must succeed');
    const success = preview as MigrationPreviewSuccess;
    assert(success.taskRecords.length === 3, 'All 3 tasks with identical title must be preserved');
    assert(success.fingerprint.distinctTitleCount === 1, 'Should have 1 distinct title');
    assert(success.fingerprint.duplicateTitleCount === 3, 'Should count 3 tasks participating in duplicate titles');
    assert(success.taskRecords[0].id === 'id-alpha', 'First ID preserved');
    assert(success.taskRecords[1].id === 'id-beta', 'Second ID preserved');
    assert(success.taskRecords[2].id === 'id-gamma', 'Third ID preserved');
    console.log('   ✓ Tasks with identical titles preserved under stable unique IDs (never deduplicated).');
  }

  // 5. Full Imported Field Fidelity & Lossless Sidecar
  console.log('5. Testing imported fields fidelity, legacy HH:MM deadline, and lossless sidecars...');
  {
    const sampleTask = {
      id: 'task-full-fidelity',
      text: 'Deep Work Session',
      description: 'Design architecture and implement Stage 2B migration preview',
      durationMinutes: 45,
      deadline: '17:30', // legacy HH:MM deadline format!
      priority: 'high',
      isDone: false,
      createdAt: 1710000000000,
      timeSpentSeconds: 2700,
      source: 'ticktick',
      eventId: 'gcal-evt-999',
      ticktickTaskId: 'tt-task-123',
      ticktickProjectId: 'tt-proj-456',
      ticktickLastModified: 1710000500000,
      syncStatus: 'synced',
      subtasks: [
        { id: 'sub-1', text: 'Write types', is_done: true },
        { id: 'sub-2', text: 'Write converter', is_done: false },
      ],
      attachedUrls: [
        { id: 'url-legacy-id-1', url: 'https://example.com/spec', title: 'Feature Spec' },
        { id: 'url-legacy-id-2', url: 'https://example.com/ticket' },
      ],
      customExtraField: 'preserved in sidecar raw object',
    };

    const preview = await generateMigrationPreview({ version: 3, quickNotes: [sampleTask] });
    assert(preview.success, 'Preview must succeed');
    const success = preview as MigrationPreviewSuccess;
    const task = success.taskRecords[0];

    // Core domain attributes
    assert(task.id === 'task-full-fidelity', 'Task ID must match');
    assert(task.title === 'Deep Work Session', 'Title must match');
    assert(task.description === 'Design architecture and implement Stage 2B migration preview', 'Description must match');
    assert(task.duration_minutes === 45, 'Duration minutes must match');
    assert(task.deadline === '17:30', 'Legacy HH:MM deadline must be preserved exactly');
    assert(task.priority === 'high', 'Priority must match');
    assert(task.lifecycle === 'active', 'Lifecycle must be active');
    assert(task.created_at === new Date(1710000000000).toISOString(), 'createdAt must convert to ISO string');
    assert(task.subtasks.length === 2, 'Subtasks count must match');
    assert(task.subtasks[0].id === 'sub-1' && task.subtasks[0].is_done === true, 'Subtask 1 preserved');
    assert(task.subtasks[1].id === 'sub-2' && task.subtasks[1].is_done === false, 'Subtask 2 preserved');
    assert(task.attached_urls.length === 2, 'Attached URLs count must match');
    assert(task.attached_urls[0].url === 'https://example.com/spec', 'URL 1 preserved');
    assert(task.attached_urls[0].title === 'Feature Spec', 'URL 1 title preserved');
    assert(task.attached_urls[1].url === 'https://example.com/ticket', 'URL 2 preserved');

    // Lossless sidecar attributes
    const sidecar = success.legacyArchive.taskSidecars['task-full-fidelity'];
    assert(Boolean(sidecar), 'Sidecar must exist for task');
    assert(sidecar.originalUrlIds.length === 2, 'Sidecar must preserve original URL count');
    assert(sidecar.originalUrlIds[0].id === 'url-legacy-id-1', 'Sidecar must preserve original URL ID 1');
    assert(sidecar.originalUrlIds[1].id === 'url-legacy-id-2', 'Sidecar must preserve original URL ID 2');
    assert(sidecar.timeSpentSeconds === 2700, 'Sidecar must preserve timeSpentSeconds');
    assert(sidecar.source === 'ticktick', 'Sidecar must preserve source');
    assert(sidecar.eventId === 'gcal-evt-999', 'Sidecar must preserve eventId');
    assert(sidecar.ticktickTaskId === 'tt-task-123', 'Sidecar must preserve ticktickTaskId');
    assert(sidecar.ticktickProjectId === 'tt-proj-456', 'Sidecar must preserve ticktickProjectId');
    assert(sidecar.ticktickLastModified === 1710000500000, 'Sidecar must preserve ticktickLastModified');
    assert(sidecar.syncStatus === 'synced', 'Sidecar must preserve syncStatus');
    assert(sidecar.originalRaw.customExtraField === 'preserved in sidecar raw object', 'Raw extras preserved');
    console.log('   ✓ Full field fidelity, legacy HH:MM deadline, and lossless sidecars verified.');
  }

  // 6. Honest Representation of Legacy Done Tasks (No Fabricated Dates/XP/Evidence)
  console.log('6. Testing historical representation of done tasks without fabricated completedAt/XP...');
  {
    const legacyDoneTask = {
      id: 'task-done-legacy',
      text: 'Finished Legacy Goal',
      isDone: true,
      createdAt: 1705000000000,
    };

    const stagedAtFixed = '2026-11-09T14:30:00.000Z';
    const preview = await generateMigrationPreview(
      { version: 3, quickNotes: [legacyDoneTask] },
      { stagedAt: stagedAtFixed }
    );
    assert(preview.success, 'Preview must succeed');
    const success = preview as MigrationPreviewSuccess;
    const task = success.taskRecords[0];

    // Invariant checks on TaskRecord
    assert(task.lifecycle === 'archived', 'Completed legacy task must have lifecycle: "archived"');
    assert(task.completed_at === undefined, 'completed_at MUST NOT be fabricated');
    assert(task.completion_id === undefined, 'completion_id MUST NOT be fabricated');
    assert(task.undo_until === undefined, 'undo_until MUST NOT be fabricated');
    assert(task.archived_at === stagedAtFixed, 'archived_at must record stagedAt conversion time');
    assert(task.created_at === new Date(1705000000000).toISOString(), 'created_at records legacy creation date');
    assert(task.archived_at !== task.created_at, 'archived_at must NEVER equal legacy creation timestamp');

    // Invariant checks on LegacyDoneTaskArchive
    assert(success.legacyArchive.doneTasksArchive.length === 1, 'Must record 1 archived done task');
    const doneArchive = success.legacyArchive.doneTasksArchive[0];
    assert(doneArchive.taskId === 'task-done-legacy', 'Archive must match task ID');
    assert(doneArchive.hasReliableCompletedAt === false, 'Explicitly flags hasReliableCompletedAt: false');
    assert(doneArchive.completedAtFabricated === false, 'Explicitly flags completedAtFabricated: false');
    assert(doneArchive.xpGranted === 0, 'Explicitly grants 0 fake XP');
    assert(doneArchive.evidenceFabricated === false, 'Explicitly flags evidenceFabricated: false');
    assert(doneArchive.archivedAt === stagedAtFixed, 'Archive records actual conversion time');
    assert(doneArchive.representationNotice.includes('artificial completion dates, fake XP'), 'Notice explains representation');
    console.log('   ✓ Done tasks archived with stagedAt archival conversion time; creationDate is never used as completion/archival time.');
  }

  // 7. Unknown Growth History & Legacy Reflections Preservation
  console.log('7. Testing unknown growth history and legacy reflections preservation...');
  {
    const payloadWithGrowthAndReflections = {
      version: 3,
      quickNotes: [{ id: 'task-active', text: 'Do something', isDone: false }],
      growthHistory: {
        '2026-03-01': { tasksCompleted: 5, focusMinutes: 120, xpEarned: 250, dailyGoalCompleted: true, customNote: 'Special milestone' },
        '2026-03-02': { tasksCompleted: 3, focusMinutes: 90, xpEarned: 150, dailyGoalCompleted: false },
      },
      reflections: [
        { dayKey: '2026-03-01', text: 'Had high momentum today' },
      ],
      gamification: {
        currentXp: 1850,
        currentStreak: 7,
        longestStreak: 14,
        lastActiveDate: '2026-03-02',
        unlockedHeroIds: ['lvl-1-awakening', 'lvl-2-momentum'],
        activeHeroId: 'lvl-2-momentum',
        lastBackupTimestamp: 1709400000000,
      },
    };

    const preview = await generateMigrationPreview(payloadWithGrowthAndReflections);
    assert(preview.success, 'Preview must succeed');
    const success = preview as MigrationPreviewSuccess;

    const growthArchive = success.legacyArchive.growthArchive;
    assert(Object.keys(growthArchive.growthHistory).length === 2, 'All 2 growth history days preserved');
    assert(
      (growthArchive.growthHistory['2026-03-01'] as any).customNote === 'Special milestone',
      'Custom fields in growth history preserved'
    );
    assert(growthArchive.legacyReflections.length === 1, 'Legacy reflections preserved');
    assert(growthArchive.gamification.currentXp === 1850, 'Gamification currentXp preserved');
    assert(growthArchive.gamification.currentStreak === 7, 'Gamification currentStreak preserved');
    assert(growthArchive.gamification.unlockedHeroIds?.length === 2, 'Unlocked heroes preserved');
    assert(growthArchive.aggregateNotice.includes('never converted into synthetic task completion evidence'), 'Notice disclaims synthetic XP');
    console.log('   ✓ Unknown growth history, reflections, and achievements preserved in immutable archive.');
  }

  // 8. Deterministic Record Mapping & SHA-256 Checksums
  console.log('8. Testing deterministic record mapping and SHA-256 reproducibility...');
  {
    const candidate = {
      version: 3,
      quickNotes: [
        { id: 'task-1', text: 'Task 1', isDone: false, createdAt: 1700000000000 },
        { id: 'task-2', text: 'Task 2', isDone: true, createdAt: 1700001000000 },
      ],
      gamification: { currentXp: 100 },
    };

    const stagedAtFixed = '2026-11-09T10:00:00.000Z';
    const previewA = await generateMigrationPreview(candidate, { stagedAt: stagedAtFixed });
    const previewB = await generateMigrationPreview(candidate, { stagedAt: stagedAtFixed });

    assert(previewA.success && previewB.success, 'Both previews must succeed');
    const sA = previewA as MigrationPreviewSuccess;
    const sB = previewB as MigrationPreviewSuccess;

    assert(sA.manifest.source_manifest_hash === sB.manifest.source_manifest_hash, 'Source hash must match');
    assert(sA.fingerprint.taskListChecksumSha256 === sB.fingerprint.taskListChecksumSha256, 'Task list checksum must match');
    assert(sA.fingerprint.archiveChecksumSha256 === sB.fingerprint.archiveChecksumSha256, 'Archive checksum must match');
    assert(canonicalJson(sA.taskRecords) === canonicalJson(sB.taskRecords), 'TaskRecords JSON must be byte-identical');
    console.log('   ✓ Deterministic record mapping and cryptographic checksum reproducibility verified.');
  }

  // 9. Staged IDB Copy into Explicit Fixture Namespace & Post-Import Verification
  console.log('9. Testing staged copy into isolated fixture namespace and readback verification...');
  {
    const mockFactory = new MockIDBFactory();
    const candidate = {
      version: 3,
      quickNotes: [
        { id: 'fixture-task-1', text: 'First Fixture Task', isDone: false, priority: 'urgent' },
        { id: 'fixture-task-2', text: 'Second Fixture Task', isDone: true, priority: 'low' },
      ],
    };

    const preview = (await generateMigrationPreview(candidate, { ownerId: 'test_owner' })) as MigrationPreviewSuccess;
    assert(preview.success, 'Preview must succeed');

    const stageResult = await stageMigrationCopy(preview, {
      ownerId: 'test_owner',
      idbFactory: mockFactory as any,
    });

    assert(stageResult.status === 'verified', 'Stage status must be verified');
    assert(stageResult.verificationPassed === true, 'Verification must pass');
    assert(stageResult.tasksWritten === 2, 'Must record 2 tasks written');
    assert(stageResult.fixtureDatabaseName.startsWith('launchpad_fixture_stage_'), 'Must use separate fixture prefix');
    assert(stageResult.disclosures.separateFixtureNamespace === true, 'Discloses separate fixture namespace');
    assert(stageResult.disclosures.liveDataUntouched === true, 'Discloses live data untouched');
    assert(stageResult.disclosures.noUserDataDeletion === true, 'Discloses no user data deletion');
    console.log('   ✓ Staged fixture copy written, read back, and verified in isolated namespace.');
  }

  // 10. Repeat Staging Idempotency
  console.log('10. Testing repeat staging idempotency...');
  {
    const mockFactory = new MockIDBFactory();
    const candidate = {
      version: 3,
      quickNotes: [{ id: 'idemp-task-1', text: 'Idempotency Check', isDone: false }],
    };

    const preview = (await generateMigrationPreview(candidate, { ownerId: 'idemp_owner' })) as MigrationPreviewSuccess;
    const firstStage = await stageMigrationCopy(preview, {
      ownerId: 'idemp_owner',
      idbFactory: mockFactory as any,
    });
    assert(firstStage.status === 'verified', 'First stage must succeed');

    // Run repeat stage on the same database
    const repeatStage = await stageMigrationCopy(preview, {
      ownerId: 'idemp_owner',
      idbFactory: mockFactory as any,
    });
    assert(repeatStage.status === 'verified', 'Repeat stage must succeed idempotently');
    assert(repeatStage.tasksWritten === 1, 'Tasks written count remains 1');
    assert(repeatStage.manifest.manifest_id === firstStage.manifest.manifest_id, 'Manifest ID remains identical');
    console.log('   ✓ Repeat staging is completely idempotent and preserves verified status.');
  }

  // 11. Transaction Abort & Retry Behavior
  console.log('11. Testing transaction abort and retry behavior...');
  {
    const mockFactory = new MockIDBFactory();
    const candidate = {
      version: 3,
      quickNotes: [{ id: 'abort-task-1', text: 'Task to abort', isDone: false }],
    };
    const preview = (await generateMigrationPreview(candidate, { ownerId: 'abort_owner' })) as MigrationPreviewSuccess;

    // Configure mock factory to fail the next write transaction
    mockFactory.failNextWriteTransaction = true;

    let caughtError = false;
    try {
      await stageMigrationCopy(preview, {
        ownerId: 'abort_owner',
        idbFactory: mockFactory as any,
      });
    } catch (err: any) {
      caughtError = true;
      assert(err.message.includes('TRANSACTION_ABORTED'), `Expected TRANSACTION_ABORTED but received: ${err.message}`);
    }
    assert(caughtError, 'Aborted transaction must throw');

    // Now retry cleanly with normal factory
    const retryResult = await stageMigrationCopy(preview, {
      ownerId: 'abort_owner',
      idbFactory: mockFactory as any,
    });
    assert(retryResult.status === 'verified', 'Retry after abort must succeed and verify');
    console.log('   ✓ Transaction abort rolls back cleanly and subsequent retry verifies successfully.');
  }

  // 12. Accurate Runtime Disclosure When IDB Factory Unavailable
  console.log('12. Testing accurate runtime disclosure when IDB is unavailable...');
  {
    const candidate = {
      version: 3,
      quickNotes: [{ id: 't-1', text: 'Some task', isDone: false }],
    };
    const preview = (await generateMigrationPreview(candidate)) as MigrationPreviewSuccess;

    let caughtError = false;
    try {
      await stageMigrationCopy(preview, {
        ownerId: 'test_owner',
        idbFactory: undefined, // no factory provided and globalThis.indexedDB is undefined in node
      });
    } catch (err: any) {
      caughtError = true;
      assert(err.code === 'IDB_UNAVAILABLE', 'Must report IDB_UNAVAILABLE code');
      assert(err.message.toLowerCase().includes('pure preview is complete'), 'Must disclose preview completed');
    }
    assert(caughtError, 'Must throw IDB_UNAVAILABLE when factory is missing');
    console.log('   ✓ Accurately discloses unimplemented IDB copy when runtime factory is unavailable.');
  }

  // 13. Operational Safety Disclosures & Concise Report Generation
  console.log('13. Testing operational safety disclosures and report formatting...');
  {
    const candidate = {
      version: 3,
      quickNotes: [
        { id: 'task-a', text: 'Implement feature', isDone: false, priority: 'urgent' },
        { id: 'task-b', text: 'Implement feature', isDone: true, priority: 'medium' }, // same title
      ],
      growthHistory: {
        '2026-11-01': { tasksCompleted: 2, focusMinutes: 60, xpEarned: 100, dailyGoalCompleted: true },
      },
      gamification: { currentXp: 500, currentStreak: 3 },
    };

    const preview = await generateMigrationPreview(candidate, { ownerId: 'auditor' });
    assert(preview.success, 'Preview must succeed');
    const success = preview as MigrationPreviewSuccess;

    assert(success.liveActivationDisclosures.isLiveActivation === false, 'Live activation is false');
    assert(success.liveActivationDisclosures.isUserDataDeleted === false, 'User data deletion is false');
    assert(success.liveActivationDisclosures.isAppWired === false, 'App wiring is false');
    assert(success.liveActivationDisclosures.separateFixtureNamespace === true, 'Fixture namespace is true');

    const report = formatPreviewReport(preview);
    assert(report.includes('STAGE 2B MIGRATION PREVIEW: SUCCESS'), 'Report has success header');
    assert(report.includes('Total Tasks:        2'), 'Report has total tasks');
    assert(report.includes('Active Tasks:   1'), 'Report has active tasks');
    assert(report.includes('Archived Done:  1'), 'Report has archived done tasks');
    assert(report.includes('Same-Title Dups:    2'), 'Report highlights preserved duplicate titles');
    assert(report.includes('Sidecar Records:    2'), 'Report highlights sidecar preservation');
    assert(report.includes('Live Activation:    NO (Fixture only)'), 'Report highlights fixture safety');
    console.log('   ✓ Operational safety disclosures verified and concise preview report generated.');
  }

  console.log('\n🎉 ALL 13 MIGRATION TEST SUITES PASSED SUCCESSFULLY!\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
