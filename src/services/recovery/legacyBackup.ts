/**
 * LaunchPad Legacy Recovery & Additive Backup Helpers (Stage 1)
 *
 * This module implements pure, read-only snapshot, validation, and staging helpers
 * for legacy storage keys across LaunchPad v1, v2, and v3 schemas.
 *
 * Guarantees:
 * - Read-only: accepts a dependency-injected StorageReader interface; never writes
 *   to storage or relies on implicit global localStorage.
 * - Exact fidelity: preserves exact raw strings (including corrupt or malformed JSON)
 *   without invoking sanitizers or stripping unknown/unsupported fields.
 * - Strict allowlist: only accesses verified AppData (primary & backups v1/v2/v3) and
 *   focus timer keys. Credential keys (launchpad_gcal_token_v1, launchpad_ticktick_settings_v1)
 *   and unrelated origin keys are strictly excluded and never queried.
 * - Explicit sensitivity warnings: raw data may contain OpenRouter API keys; envelope
 *   is explicitly labeled as sensitive local recovery material and not portable.
 * - Tamper detection: Web Crypto SHA-256 digests over raw UTF-8 payloads and sorted manifest.
 * - Pure staging: returns validated in-memory raw map and snapshots without activating migrations
 *   or fabricating synthetic tasks or growth evidence.
 * - Hardened isolation: validates positive integer bounds and timestamps, extracts known fields
 *   into a detached normalized structure prior to hashing (defense against async aliasing/mutation),
 *   freezes all returned objects and entries, and uses safe error messages without secret leakage.
 */

export const RECOVERY_ENVELOPE_SCHEMA_VERSION = 'launchpad-recovery-v1';

/**
 * Strict allowlist of storage keys permitted for recovery snapshotting and staging.
 * Sorted deterministically in ascending alphabetical order.
 */
export const ALLOWED_STORAGE_KEYS = [
  'launchpad_app_data_backup',
  'launchpad_app_data_backup_v3',
  'launchpad_app_data_v1',
  'launchpad_app_data_v2',
  'launchpad_app_data_v3',
  'launchpad_focus_timer_v1',
] as const;

export type AllowedStorageKey = (typeof ALLOWED_STORAGE_KEYS)[number];

/**
 * Explicitly excluded sensitive credential and integration keys.
 * These must never be queried by recovery snapshotting.
 */
export const EXCLUDED_STORAGE_KEYS = [
  'launchpad_gcal_token_v1',
  'launchpad_ticktick_settings_v1',
] as const;

export type ExcludedStorageKey = (typeof EXCLUDED_STORAGE_KEYS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_STORAGE_KEYS);
const EXCLUDED_SET = new Set<string>(EXCLUDED_STORAGE_KEYS);

/**
 * Check whether a given key is on the allowed recovery key list.
 */
export function isAllowedStorageKey(key: string): key is AllowedStorageKey {
  return ALLOWED_SET.has(key);
}

/**
 * Check whether a given key is explicitly excluded.
 */
export function isExcludedStorageKey(key: string): key is ExcludedStorageKey {
  return EXCLUDED_SET.has(key);
}

/**
 * Dependency-injected read-only storage access interface.
 */
export interface StorageReader {
  getItem(key: string): string | null | Promise<string | null>;
}

/**
 * Error hierarchy for recovery operations.
 */
export class RecoveryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[RecoveryError:${code}] ${message}`);
    this.name = 'RecoveryError';
  }
}

/**
 * Safe read error identifying only the allowlisted key without interpolating
 * arbitrary reader error text (which could leak private payload or tokens).
 */
export class RecoveryReadError extends RecoveryError {
  constructor(public readonly key: string, public readonly cause?: unknown) {
    super('READ_FAILED', `Failed to read key "${key}" from storage reader.`);
    this.name = 'RecoveryReadError';
  }
}

export class RecoveryValidationError extends RecoveryError {
  constructor(message: string) {
    super('VALIDATION_FAILED', message);
    this.name = 'RecoveryValidationError';
  }
}

export class RecoveryCryptoError extends RecoveryError {
  constructor(message: string) {
    super('CRYPTO_UNAVAILABLE', message);
    this.name = 'RecoveryCryptoError';
  }
}

/**
 * Explicit sensitivity label and non-portability notice.
 */
export interface RecoverySensitivityNotice {
  readonly classification: 'SENSITIVE_LOCAL_RECOVERY_MATERIAL';
  readonly warning: string;
  readonly isPortableExport: false;
  readonly isCredentialFree: false;
  readonly claimsIndependentProof: false;
  readonly cryptographicProofLimitation: string;
}

export const DEFAULT_SENSITIVITY_NOTICE: RecoverySensitivityNotice = Object.freeze({
  classification: 'SENSITIVE_LOCAL_RECOVERY_MATERIAL',
  warning:
    'CRITICAL: This envelope contains unredacted raw local storage records which may include sensitive personal data or OpenRouter API keys. It is intended strictly for local-device recovery/staging and MUST NOT be transmitted, shared as portable export, or stored in insecure locations.',
  isPortableExport: false,
  isCredentialFree: false,
  claimsIndependentProof: false,
  cryptographicProofLimitation:
    'SHA-256 integrity hashes verify internal tampering detection and bitwise preservation only; they do not verify authorship, truthfulness, external verification, or proof of real-world task work.',
});

/**
 * Individual key-value entry in recovery envelope.
 */
export interface RecoveryEntry {
  readonly key: AllowedStorageKey;
  readonly rawValue: string;
  readonly byteLength: number;
  readonly sha256: string;
}

/**
 * Integrity manifest summarizing present and missing keys.
 */
export interface RecoveryManifest {
  readonly entryCount: number;
  readonly totalByteLength: number;
  readonly presentKeys: readonly AllowedStorageKey[];
  readonly missingKeys: readonly AllowedStorageKey[];
  readonly manifestSha256: string;
}

/**
 * Complete immutable recovery envelope.
 */
export interface RecoveryEnvelope {
  readonly schemaVersion: typeof RECOVERY_ENVELOPE_SCHEMA_VERSION;
  readonly capturedAt: string;
  readonly sensitivity: RecoverySensitivityNotice;
  readonly entries: readonly RecoveryEntry[];
  readonly manifest: RecoveryManifest;
}

export interface SnapshotOptions {
  readonly capturedAt?: string;
  readonly maxEntryBytes?: number;
  readonly maxTotalBytes?: number;
  readonly subtle?: SubtleCrypto;
}

export interface ValidationOptions {
  readonly maxEntryBytes?: number;
  readonly maxTotalBytes?: number;
  readonly subtle?: SubtleCrypto;
}

export interface StagingOptions extends ValidationOptions {
  readonly stagedAt?: string;
}

/**
 * Individual staged entry containing raw text plus safe parse diagnostics.
 */
export interface StagedRecoveryEntry {
  readonly key: AllowedStorageKey;
  readonly rawValue: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly isJson: boolean;
  readonly parsedJson: unknown | null;
  readonly parseError?: string;
}

/**
 * Pure staged recovery snapshot ready for future non-destructive migration.
 */
export interface StagedRecoverySnapshot {
  readonly schemaVersion: typeof RECOVERY_ENVELOPE_SCHEMA_VERSION;
  readonly capturedAt: string;
  readonly stagedAt: string;
  readonly rawMap: Readonly<Partial<Record<AllowedStorageKey, string>>>;
  readonly stagedEntries: readonly StagedRecoveryEntry[];
  readonly missingKeys: readonly AllowedStorageKey[];
  readonly totalBytes: number;
  readonly manifestSha256: string;
  readonly containsCorruptPayload: boolean;
  readonly sensitivity: RecoverySensitivityNotice;
}

export const DEFAULT_MAX_ENTRY_BYTES = 15 * 1024 * 1024; // 15 MB
export const DEFAULT_MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates that byte limits are finite, positive safe integers with maxEntryBytes <= maxTotalBytes.
 */
function validateByteLimits(maxEntryBytes: number, maxTotalBytes: number): void {
  if (
    typeof maxEntryBytes !== 'number' ||
    !Number.isFinite(maxEntryBytes) ||
    !Number.isSafeInteger(maxEntryBytes) ||
    maxEntryBytes <= 0
  ) {
    throw new RecoveryValidationError(
      `Limit maxEntryBytes must be a positive safe integer. Received: ${String(maxEntryBytes)}.`
    );
  }
  if (
    typeof maxTotalBytes !== 'number' ||
    !Number.isFinite(maxTotalBytes) ||
    !Number.isSafeInteger(maxTotalBytes) ||
    maxTotalBytes <= 0
  ) {
    throw new RecoveryValidationError(
      `Limit maxTotalBytes must be a positive safe integer. Received: ${String(maxTotalBytes)}.`
    );
  }
  if (maxEntryBytes > maxTotalBytes) {
    throw new RecoveryValidationError(
      `Limit maxEntryBytes (${maxEntryBytes}) cannot exceed maxTotalBytes (${maxTotalBytes}).`
    );
  }
}

/**
 * Resolves byte limits from options, filling sensible defaults and validating bounds.
 */
function resolveByteLimits(
  optionsMaxEntryBytes?: number,
  optionsMaxTotalBytes?: number
): { maxEntryBytes: number; maxTotalBytes: number } {
  let maxEntryBytes = optionsMaxEntryBytes;
  let maxTotalBytes = optionsMaxTotalBytes;

  if (maxEntryBytes !== undefined && maxTotalBytes === undefined) {
    // If only entry limit given and it exceeds default total, expand total to match
    if (typeof maxEntryBytes === 'number' && Number.isFinite(maxEntryBytes) && maxEntryBytes > DEFAULT_MAX_TOTAL_BYTES) {
      maxTotalBytes = maxEntryBytes;
    } else {
      maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES;
    }
  } else if (maxEntryBytes === undefined && maxTotalBytes !== undefined) {
    // If only total limit given and it is smaller than default entry, bound entry to total
    if (typeof maxTotalBytes === 'number' && Number.isFinite(maxTotalBytes) && maxTotalBytes < DEFAULT_MAX_ENTRY_BYTES) {
      maxEntryBytes = maxTotalBytes;
    } else {
      maxEntryBytes = DEFAULT_MAX_ENTRY_BYTES;
    }
  } else {
    maxEntryBytes = maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
    maxTotalBytes = maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  }

  validateByteLimits(maxEntryBytes, maxTotalBytes);
  return { maxEntryBytes, maxTotalBytes };
}

/**
 * Validates that an optional timestamp is a valid ISO 8601 date string.
 */
function validateTimestamp(timestamp: string, fieldName: string): void {
  if (typeof timestamp !== 'string' || !timestamp.trim() || Number.isNaN(Date.parse(timestamp))) {
    throw new RecoveryValidationError(
      `Invalid ${fieldName} timestamp: must be a valid ISO 8601 date string.`
    );
  }
}

/**
 * Resolves a Web Crypto SubtleCrypto instance or throws RecoveryCryptoError.
 */
function resolveSubtle(subtleOverride?: SubtleCrypto): SubtleCrypto {
  if (subtleOverride !== undefined) {
    if (subtleOverride && typeof subtleOverride.digest === 'function') {
      return subtleOverride;
    }
    throw new RecoveryCryptoError('Web Crypto API subtle.digest is unavailable in current runtime environment.');
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle && typeof globalThis.crypto.subtle.digest === 'function') {
    return globalThis.crypto.subtle;
  }
  throw new RecoveryCryptoError('Web Crypto API subtle.digest is unavailable in current runtime environment.');
}

/**
 * Computes lowercase hex SHA-256 digest using browser-standard Web Crypto API.
 */
export async function computeSha256(
  data: string | Uint8Array,
  subtle?: SubtleCrypto
): Promise<string> {
  const cryptoSubtle = resolveSubtle(subtle);
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  try {
    const buffer = await cryptoSubtle.digest('SHA-256', bytes as BufferSource);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    throw new RecoveryCryptoError(`SHA-256 computation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Computes canonical manifest digest over sorted entries.
 */
async function computeManifestDigest(
  entries: readonly RecoveryEntry[],
  subtle?: SubtleCrypto
): Promise<string> {
  const canonical = entries.map((e) => `${e.key}:${e.sha256}`).join('\n');
  return computeSha256(canonical, subtle);
}

/**
 * Computes UTF-8 byte length for a string.
 */
export function computeUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).byteLength;
}

/**
 * Captures a read-only snapshot of all allowlisted LaunchPad storage keys.
 *
 * Guarantees:
 * - Validates options (positive safe integer limits, valid timestamps) before reading.
 * - Only queries ALLOWED_STORAGE_KEYS in deterministic sorted order.
 * - Never queries launchpad_gcal_token_v1, launchpad_ticktick_settings_v1, or other origin keys.
 * - Performs ZERO writes and calls no sanitizers.
 * - Captures exact raw strings (including invalid/corrupt JSON).
 * - Read failures throw RecoveryReadError; never silently ignored.
 * - Enforces character length precheck, UTF-8 byte length checks, and running total size checks before hashing.
 * - Missing keys are tracked in manifest.missingKeys.
 * - Returns a fully frozen envelope with frozen individual entries.
 */
export async function createRecoverySnapshot(
  reader: StorageReader,
  options: SnapshotOptions = {}
): Promise<RecoveryEnvelope> {
  if (!reader || typeof reader.getItem !== 'function') {
    throw new RecoveryError('INVALID_READER', 'StorageReader with getItem method is required');
  }

  const { maxEntryBytes, maxTotalBytes } = resolveByteLimits(options.maxEntryBytes, options.maxTotalBytes);

  if (options.capturedAt !== undefined) {
    validateTimestamp(options.capturedAt, 'capturedAt');
  }
  const capturedAt = options.capturedAt ?? new Date().toISOString();

  const subtle = resolveSubtle(options.subtle);
  const entries: RecoveryEntry[] = [];
  const presentKeys: AllowedStorageKey[] = [];
  const missingKeys: AllowedStorageKey[] = [];
  let runningTotalBytes = 0;

  // Iterate over strictly allowed keys in deterministic alphabetical order
  for (const key of ALLOWED_STORAGE_KEYS) {
    let raw: string | null;
    try {
      raw = await reader.getItem(key);
    } catch (readErr) {
      throw new RecoveryReadError(key, readErr);
    }

    if (raw === null || raw === undefined) {
      missingKeys.push(key);
    } else {
      const rawValue = String(raw);

      // 1. Character length precheck before UTF-8 encoding
      if (rawValue.length > maxEntryBytes) {
        throw new RecoveryValidationError(
          `Entry "${key}" character length (${rawValue.length}) exceeds single entry limit (${maxEntryBytes} bytes).`
        );
      }

      // 2. UTF-8 byte length check
      const byteLength = computeUtf8ByteLength(rawValue);
      if (byteLength > maxEntryBytes) {
        throw new RecoveryValidationError(
          `Entry "${key}" byte size (${byteLength}) exceeds maximum allowed (${maxEntryBytes}).`
        );
      }

      // 3. Running total byte size check
      if (runningTotalBytes + byteLength > maxTotalBytes) {
        throw new RecoveryValidationError(
          `Total snapshot byte size (${runningTotalBytes + byteLength}) exceeds maximum allowed (${maxTotalBytes}).`
        );
      }
      runningTotalBytes += byteLength;

      // 4. Cryptographic digest
      const sha256 = await computeSha256(rawValue, subtle);

      entries.push(
        Object.freeze({
          key,
          rawValue,
          byteLength,
          sha256,
        })
      );
      presentKeys.push(key);
    }
  }

  const manifestSha256 = await computeManifestDigest(entries, subtle);

  const manifest: RecoveryManifest = Object.freeze({
    entryCount: entries.length,
    totalByteLength: runningTotalBytes,
    presentKeys: Object.freeze(presentKeys),
    missingKeys: Object.freeze(missingKeys),
    manifestSha256,
  });

  return Object.freeze({
    schemaVersion: RECOVERY_ENVELOPE_SCHEMA_VERSION,
    capturedAt,
    sensitivity: DEFAULT_SENSITIVITY_NOTICE,
    entries: Object.freeze(entries),
    manifest,
  });
}

/**
 * Validates a recovery envelope for schema compliance, key allowlists,
 * sorting, byte length accuracy, size bounds, and cryptographic integrity.
 *
 * Guarantees:
 * - Validates positive integer limits and timestamp options.
 * - Defensively extracts known bounded fields synchronously into a detached candidate
 *   structure BEFORE awaiting asynchronous cryptographic hashes (defends against caller mutation during async dispatch).
 * - Avoids unbounded structuredClone of attacker extras; captures only validated known fields.
 * - Returns a completely detached, frozen RecoveryEnvelope with frozen entries, arrays, and manifest.
 */
export async function validateRecoveryEnvelope(
  envelope: unknown,
  options: ValidationOptions = {}
): Promise<RecoveryEnvelope> {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new RecoveryValidationError('Recovery envelope must be a non-null object.');
  }

  const { maxEntryBytes, maxTotalBytes } = resolveByteLimits(options.maxEntryBytes, options.maxTotalBytes);

  const subtle = resolveSubtle(options.subtle);
  const env = envelope as Record<string, any>;

  // 1. Schema version
  if (env.schemaVersion !== RECOVERY_ENVELOPE_SCHEMA_VERSION) {
    throw new RecoveryValidationError(
      `Unsupported envelope schema version: expected "${RECOVERY_ENVELOPE_SCHEMA_VERSION}", received "${env.schemaVersion}".`
    );
  }

  // 2. capturedAt timestamp
  validateTimestamp(env.capturedAt, 'capturedAt');
  const normalizedCapturedAt = String(env.capturedAt);

  // 3. Sensitivity notice invariants
  if (!env.sensitivity || typeof env.sensitivity !== 'object') {
    throw new RecoveryValidationError('Envelope missing required sensitivity notice.');
  }
  if (
    env.sensitivity.classification !== 'SENSITIVE_LOCAL_RECOVERY_MATERIAL' ||
    env.sensitivity.isPortableExport !== false ||
    env.sensitivity.isCredentialFree !== false ||
    env.sensitivity.claimsIndependentProof !== false
  ) {
    throw new RecoveryValidationError('Envelope sensitivity notice has been altered or violates non-portability contract.');
  }
  const normalizedSensitivity = DEFAULT_SENSITIVITY_NOTICE;

  // 4. Entries validation and synchronous detached capture
  if (!Array.isArray(env.entries)) {
    throw new RecoveryValidationError('Envelope entries must be an array.');
  }

  if (env.entries.length > ALLOWED_STORAGE_KEYS.length) {
    throw new RecoveryValidationError(
      `Envelope contains ${env.entries.length} entries, exceeding max allowed (${ALLOWED_STORAGE_KEYS.length}).`
    );
  }

  interface CandidateEntry {
    readonly key: AllowedStorageKey;
    readonly rawValue: string;
    readonly byteLength: number;
    readonly sha256: string;
  }

  const candidateEntries: CandidateEntry[] = [];
  const seenKeys = new Set<string>();
  let previousKey = '';
  let computedTotalBytes = 0;

  // Synchronously validate and extract only known fields before any async operation
  for (let i = 0; i < env.entries.length; i++) {
    const rawEntry = env.entries[i];
    if (!rawEntry || typeof rawEntry !== 'object') {
      throw new RecoveryValidationError(`Entry at index ${i} is not an object.`);
    }

    const key = rawEntry.key;
    if (typeof key !== 'string') {
      throw new RecoveryValidationError(`Entry at index ${i} has non-string key.`);
    }

    if (EXCLUDED_SET.has(key)) {
      throw new RecoveryValidationError(
        `Entry at index ${i} contains explicitly excluded sensitive key "${key}".`
      );
    }

    if (!isAllowedStorageKey(key)) {
      throw new RecoveryValidationError(
        `Entry at index ${i} contains disallowed storage key "${key}".`
      );
    }

    if (seenKeys.has(key)) {
      throw new RecoveryValidationError(`Duplicate storage key "${key}" detected in entries.`);
    }
    seenKeys.add(key);

    // Verify strict alphabetical order
    if (i > 0 && key.localeCompare(previousKey) <= 0) {
      throw new RecoveryValidationError(
        `Entries are not deterministically sorted: key "${key}" appeared after "${previousKey}".`
      );
    }
    previousKey = key;

    const rawValue = rawEntry.rawValue;
    if (typeof rawValue !== 'string') {
      throw new RecoveryValidationError(`Entry "${key}" rawValue must be a string.`);
    }

    const byteLength = rawEntry.byteLength;
    if (typeof byteLength !== 'number' || !Number.isSafeInteger(byteLength) || byteLength < 0) {
      throw new RecoveryValidationError(`Entry "${key}" has invalid byteLength.`);
    }

    // Character length precheck
    if (rawValue.length > maxEntryBytes) {
      throw new RecoveryValidationError(`Entry "${key}" character length exceeds single entry limit.`);
    }

    const actualByteLength = computeUtf8ByteLength(rawValue);
    if (actualByteLength !== byteLength) {
      throw new RecoveryValidationError(
        `Entry "${key}" byte length mismatch: claimed ${byteLength}, calculated ${actualByteLength}.`
      );
    }

    if (actualByteLength > maxEntryBytes) {
      throw new RecoveryValidationError(
        `Entry "${key}" byte size (${actualByteLength}) exceeds maximum allowed (${maxEntryBytes}).`
      );
    }

    computedTotalBytes += actualByteLength;
    if (computedTotalBytes > maxTotalBytes) {
      throw new RecoveryValidationError(
        `Total envelope byte size (${computedTotalBytes}) exceeds maximum allowed (${maxTotalBytes}).`
      );
    }

    const sha256 = rawEntry.sha256;
    if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
      throw new RecoveryValidationError(`Entry "${key}" has invalid SHA-256 format.`);
    }

    // Defensively snapshot candidate fields
    candidateEntries.push({
      key,
      rawValue,
      byteLength,
      sha256,
    });
  }

  // 5. Asynchronous digest verification against detached candidate data
  const normalizedEntries: RecoveryEntry[] = [];
  for (const candidate of candidateEntries) {
    const recomputedSha256 = await computeSha256(candidate.rawValue, subtle);
    if (recomputedSha256 !== candidate.sha256) {
      throw new RecoveryValidationError(
        `Tampering detected: SHA-256 mismatch for entry "${candidate.key}". Expected ${candidate.sha256}, calculated ${recomputedSha256}.`
      );
    }
    normalizedEntries.push(
      Object.freeze({
        key: candidate.key,
        rawValue: candidate.rawValue,
        byteLength: candidate.byteLength,
        sha256: candidate.sha256,
      })
    );
  }

  // 6. Manifest verification
  const manifest = env.manifest;
  if (!manifest || typeof manifest !== 'object') {
    throw new RecoveryValidationError('Envelope missing required manifest object.');
  }

  if (manifest.entryCount !== normalizedEntries.length) {
    throw new RecoveryValidationError(
      `Manifest entryCount (${manifest.entryCount}) does not match entries array length (${normalizedEntries.length}).`
    );
  }

  if (manifest.totalByteLength !== computedTotalBytes) {
    throw new RecoveryValidationError(
      `Manifest totalByteLength (${manifest.totalByteLength}) does not match computed total (${computedTotalBytes}).`
    );
  }

  if (!Array.isArray(manifest.presentKeys) || !Array.isArray(manifest.missingKeys)) {
    throw new RecoveryValidationError('Manifest presentKeys and missingKeys must be arrays.');
  }

  if (manifest.presentKeys.length !== normalizedEntries.length) {
    throw new RecoveryValidationError('Manifest presentKeys count mismatch.');
  }

  const normalizedPresentKeys: AllowedStorageKey[] = [];
  for (let i = 0; i < manifest.presentKeys.length; i++) {
    const pKey = manifest.presentKeys[i];
    if (pKey !== normalizedEntries[i].key) {
      throw new RecoveryValidationError(
        `Manifest presentKey at index ${i} (${pKey}) does not match entry (${normalizedEntries[i].key}).`
      );
    }
    normalizedPresentKeys.push(pKey);
  }

  const normalizedMissingKeys: AllowedStorageKey[] = [];
  const missingSet = new Set<string>();
  let previousMissing = '';
  for (let i = 0; i < manifest.missingKeys.length; i++) {
    const mKey = manifest.missingKeys[i];
    if (typeof mKey !== 'string' || !isAllowedStorageKey(mKey)) {
      throw new RecoveryValidationError(`Manifest missingKey "${mKey}" is not an allowed storage key.`);
    }
    if (seenKeys.has(mKey)) {
      throw new RecoveryValidationError(`Manifest missingKey "${mKey}" overlaps with present entries.`);
    }
    if (missingSet.has(mKey)) {
      throw new RecoveryValidationError(`Duplicate key "${mKey}" in manifest missingKeys.`);
    }
    if (i > 0 && mKey.localeCompare(previousMissing) <= 0) {
      throw new RecoveryValidationError(`Manifest missingKeys are not deterministically sorted.`);
    }
    missingSet.add(mKey);
    previousMissing = mKey;
    normalizedMissingKeys.push(mKey);
  }

  if (seenKeys.size + missingSet.size !== ALLOWED_STORAGE_KEYS.length) {
    throw new RecoveryValidationError(
      `Union of presentKeys (${seenKeys.size}) and missingKeys (${missingSet.size}) does not equal total allowed keys (${ALLOWED_STORAGE_KEYS.length}).`
    );
  }

  const recomputedManifestSha256 = await computeManifestDigest(normalizedEntries, subtle);
  if (manifest.manifestSha256 !== recomputedManifestSha256) {
    throw new RecoveryValidationError(
      `Manifest checksum mismatch / tampering detected. Expected ${manifest.manifestSha256}, calculated ${recomputedManifestSha256}.`
    );
  }

  const normalizedManifest: RecoveryManifest = Object.freeze({
    entryCount: normalizedEntries.length,
    totalByteLength: computedTotalBytes,
    presentKeys: Object.freeze(normalizedPresentKeys),
    missingKeys: Object.freeze(normalizedMissingKeys),
    manifestSha256: recomputedManifestSha256,
  });

  return Object.freeze({
    schemaVersion: RECOVERY_ENVELOPE_SCHEMA_VERSION,
    capturedAt: normalizedCapturedAt,
    sensitivity: normalizedSensitivity,
    entries: Object.freeze(normalizedEntries),
    manifest: normalizedManifest,
  });
}

/**
 * Pure in-memory staging of a recovery envelope.
 *
 * Guarantees:
 * - Validates envelope integrity before staging.
 * - Validates options (including stagedAt timestamp).
 * - Stages ONLY from the detached, validated result (immune to caller input mutation).
 * - Produces a pure raw map of validated keys -> raw strings.
 * - Preserves unsupported fields and corrupt payloads as-is for future recovery.
 * - Does NOT invoke sanitizeAppData or any data-repair routines.
 * - Does NOT invent default tasks, seed data, XP, or growth evidence.
 * - Performs ZERO storage writes and activates NO migrations.
 */
export async function stageRecoverySnapshot(
  envelope: unknown,
  options: StagingOptions = {}
): Promise<StagedRecoverySnapshot> {
  if (options.stagedAt !== undefined) {
    validateTimestamp(options.stagedAt, 'stagedAt');
  }
  const stagedAt = options.stagedAt ?? new Date().toISOString();

  // Validate envelope and receive detached, normalized, frozen envelope
  const validated = await validateRecoveryEnvelope(envelope, options);

  const rawMap: Partial<Record<AllowedStorageKey, string>> = {};
  const stagedEntries: StagedRecoveryEntry[] = [];

  for (const entry of validated.entries) {
    rawMap[entry.key] = entry.rawValue;

    let isJson = false;
    let parsedJson: unknown | null = null;
    let parseError: string | undefined;

    try {
      parsedJson = JSON.parse(entry.rawValue);
      isJson = true;
    } catch (err) {
      isJson = false;
      parsedJson = null;
      parseError = err instanceof Error ? err.message : String(err);
    }

    stagedEntries.push(
      Object.freeze({
        key: entry.key,
        rawValue: entry.rawValue,
        byteLength: entry.byteLength,
        sha256: entry.sha256,
        isJson,
        parsedJson,
        parseError,
      })
    );
  }

  const containsCorruptPayload = stagedEntries.some((e) => !e.isJson);

  return Object.freeze({
    schemaVersion: validated.schemaVersion,
    capturedAt: validated.capturedAt,
    stagedAt,
    rawMap: Object.freeze(rawMap),
    stagedEntries: Object.freeze(stagedEntries),
    missingKeys: validated.manifest.missingKeys,
    totalBytes: validated.manifest.totalByteLength,
    manifestSha256: validated.manifest.manifestSha256,
    containsCorruptPayload,
    sensitivity: validated.sensitivity,
  });
}
