/**
 * LaunchPad Legacy Migration Preview API & Reporting (Stage 2B)
 *
 * Implements preview generation and concise reporting suitable for later
 * manual review and explicit approval of live activation.
 */

import { convertLegacyPayload, ConvertOptions } from './converter';
import { MigrationPreviewResult } from './types';

export interface PreviewOptions extends ConvertOptions {}

/**
 * Generates a full migration preview for a raw legacy candidate.
 */
export async function generateMigrationPreview(
  rawCandidate: unknown,
  options: PreviewOptions = {}
): Promise<MigrationPreviewResult> {
  return convertLegacyPayload(rawCandidate, options);
}

/**
 * Formats a concise, human-readable preview summary suitable for audit logs
 * and coordinator review before explicit live activation approval.
 */
export function formatPreviewReport(result: MigrationPreviewResult): string {
  if (!result.success) {
    const lines = [
      '========================================================================',
      '           LAUNCHPAD STAGE 2B MIGRATION PREVIEW: FAILED                 ',
      '========================================================================',
      `Status: REJECTED (${result.errors.length} validation error(s) detected)`,
      `Candidate Tasks Evaluated: ${result.candidateTaskCount}`,
      `Raw Recoverable: ${result.rawRecoverable ? 'YES (Payload preserved intact)' : 'NO'}`,
      `Raw SHA-256 Digest: ${result.rawPayloadSha256 || 'N/A'}`,
      '',
      'Actionable Error Diagnostic:',
      result.actionableReport,
      '',
      'Guarantees: Zero live mutations performed. Raw storage candidate remains',
      'fully preserved and recoverable.',
      '========================================================================',
    ];
    return lines.join('\n');
  }

  const { manifest, fingerprint, liveActivationDisclosures } = result;
  const lines = [
    '========================================================================',
    '           LAUNCHPAD STAGE 2B MIGRATION PREVIEW: SUCCESS                ',
    '========================================================================',
    `Manifest ID:        ${manifest.manifest_id}`,
    `Owner ID:           ${manifest.owner_id}`,
    `Legacy Schema:      ${manifest.legacy_schema_version}`,
    `Staged At:          ${manifest.staged_at}`,
    `Source SHA-256:     ${manifest.source_manifest_hash}`,
    `Task List SHA-256:  ${fingerprint.taskListChecksumSha256}`,
    `Archive SHA-256:    ${fingerprint.archiveChecksumSha256}`,
    '',
    '------------------------- RECORD CONVERSION ----------------------------',
    `Total Tasks:        ${manifest.entry_count}`,
    `  - Active Tasks:   ${fingerprint.activeTaskCount} (lifecycle: "active")`,
    `  - Archived Done:  ${fingerprint.archivedDoneTaskCount} (lifecycle: "archived", no fabricated dates/XP)`,
    `Distinct Titles:    ${fingerprint.distinctTitleCount}`,
    `Same-Title Dups:    ${fingerprint.duplicateTitleCount} (preserved with unique stable IDs, never deduped)`,
    `Total Subtasks:     ${fingerprint.subtaskCount}`,
    `Attached URLs:      ${fingerprint.attachedUrlCount}`,
    `Sidecar Records:    ${fingerprint.sidecarCount} (URL IDs, times, legacy sources preserved)`,
    `Growth History:     ${fingerprint.growthDaysCount} days in immutable legacy archive`,
    '',
    '----------------------- INTEGRITY INVARIANTS ---------------------------',
    '1. Stable IDs: All legacy task IDs preserved bit-for-bit.',
    '2. Same Titles: Duplicate titles across distinct IDs preserved without deduplication.',
    '3. Lossless Sidecars: Original URL IDs, timeSpentSeconds, and source metadata saved in sidecars.',
    '4. Honest History: Done tasks archived without fabricated completedAt, XP, or evidence.',
    '5. Growth Integrity: Legacy XP/streak aggregates archived for history; no synthetic XP generated.',
    '',
    '------------------------ OPERATIONAL SAFETY ----------------------------',
    `Live Activation:    ${liveActivationDisclosures.isLiveActivation ? 'YES' : 'NO (Fixture only)'}`,
    `App Wiring:         ${liveActivationDisclosures.isAppWired ? 'ACTIVE' : 'NONE (Pure APIs only)'}`,
    `User Data Deletion: ${liveActivationDisclosures.isUserDataDeleted ? 'TRIGGERED' : 'NONE (Zero deletions)'}`,
    `Isolation Notice:   ${liveActivationDisclosures.note}`,
    '========================================================================',
  ];

  return lines.join('\n');
}
