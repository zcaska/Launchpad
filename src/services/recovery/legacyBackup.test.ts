/**
 * Stage 1 Legacy Recovery & Additive Backup Helpers Test Suite
 *
 * Requirements:
 * - Meaningful behavioral tests:
 *   1. Exact roundtrip across v1/v2/v3 and corrupt JSON/unknown embedded fields
 *   2. Unicode byte lengths, limits, and positive safe integer bounds
 *   3. Deterministic ordering/hash verification
 *   4. Excluded token/unrelated keys never requested
 *   5. Missing storage and invalid readers
 *   6. Safe read error handling (no sensitive payload in public error message)
 *   7. Tampering detection (value, byteLength, hashes, sensitivity)
 *   8. Duplicate keys, disallowed keys, and unsupported schema
 *   9. Unavailable crypto
 *   10. No mutations/sanitizer calls
 *   11. Hardened isolation regressions:
 *       - NaN/Infinity/negative/unsafe limits validation
 *       - Capture rejection before digest on oversized data & total size limit
 *       - Invalid capturedAt / stagedAt timestamps
 *       - Caller mutation during delayed digest & post-validation immutability
 *       - Frozen notice and entry objects
 * - Node assertions that throw and properly await asynchronous cases.
 * - Exit nonzero on failure.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createRecoverySnapshot,
  validateRecoveryEnvelope,
  stageRecoverySnapshot,
  computeSha256,
  computeUtf8ByteLength,
  ALLOWED_STORAGE_KEYS,
  EXCLUDED_STORAGE_KEYS,
  RECOVERY_ENVELOPE_SCHEMA_VERSION,
  DEFAULT_SENSITIVITY_NOTICE,
  StorageReader,
  RecoveryEnvelope,
  RecoveryReadError,
  RecoveryValidationError,
  RecoveryCryptoError,
  RecoveryError,
} from './legacyBackup';

class MockStorageReader implements StorageReader {
  public store = new Map<string, string>();
  public queriedKeys: string[] = [];
  public readErrors = new Map<string, Error>();
  public mutationCalls: string[] = [];

  constructor(initialData: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(initialData)) {
      this.store.set(k, v);
    }
  }

  getItem(key: string): string | null {
    this.queriedKeys.push(key);
    if (this.readErrors.has(key)) {
      throw this.readErrors.get(key)!;
    }
    return this.store.get(key) ?? null;
  }

  // Traps for unexpected mutations
  setItem(key: string, value: string): void {
    this.mutationCalls.push(`setItem:${key}:${value.length}`);
    throw new Error(`Unexpected storage write mutation: setItem("${key}")`);
  }

  removeItem(key: string): void {
    this.mutationCalls.push(`removeItem:${key}`);
    throw new Error(`Unexpected storage delete mutation: removeItem("${key}")`);
  }

  clear(): void {
    this.mutationCalls.push('clear');
    throw new Error('Unexpected storage clear mutation');
  }
}

function nodeSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function runTests(): Promise<void> {
  console.log('=== Stage 1 Recovery Helpers Test Suite ===\n');

  // --------------------------------------------------------------------------
  // Suite 1: Exact roundtrip across v1/v2/v3 and corrupt JSON/unknown embedded fields
  // --------------------------------------------------------------------------
  console.log('1. Testing exact roundtrip across v1/v2/v3 and corrupt JSON/unknown embedded fields...');
  {
    const v1Payload = JSON.stringify({
      version: 1,
      folders: [{ id: 'f1', name: 'Legacy Folder' }],
      quickNotes: [{ id: 'qn-1', text: 'V1 Note' }],
      customLegacySetting: 'keep-this-unsupported-field',
    });
    const v2Payload = JSON.stringify({
      version: 2,
      quickNotes: [{ id: 'qn-2', text: 'V2 Note', customField: 12345 }],
      unsupportedTelemetry: { enabled: true, trackingId: 'abc-xyz' },
    });
    const v3Payload = JSON.stringify({
      version: 3,
      quickNotes: [{ id: 'qn-3', text: 'V3 Note' }],
      settings: { openRouter: { apiKey: 'sk-or-sensitive-test-key-do-not-leak' } },
      unknownFutureProp: [1, 2, 3],
    });
    const corruptPayload = '{"brokenJson": true, incomplete_raw_string_without_closing_brace:';
    const focusTimerPayload = JSON.stringify({ remainingSeconds: 1200, state: 'PAUSED' });

    const reader = new MockStorageReader({
      launchpad_app_data_v1: v1Payload,
      launchpad_app_data_v2: v2Payload,
      launchpad_app_data_v3: v3Payload,
      launchpad_app_data_backup_v3: corruptPayload,
      launchpad_focus_timer_v1: focusTimerPayload,
    });

    const envelope = await createRecoverySnapshot(reader, {
      capturedAt: '2026-11-09T12:00:00.000Z',
    });

    assert.equal(envelope.schemaVersion, RECOVERY_ENVELOPE_SCHEMA_VERSION);
    assert.equal(envelope.capturedAt, '2026-11-09T12:00:00.000Z');
    assert.equal(envelope.sensitivity.classification, DEFAULT_SENSITIVITY_NOTICE.classification);
    assert.equal(envelope.entries.length, 5);

    // Validate envelope
    const validated = await validateRecoveryEnvelope(envelope);
    assert.equal(validated.entries.length, 5);

    // Stage envelope
    const staged = await stageRecoverySnapshot(envelope, {
      stagedAt: '2026-11-09T12:05:00.000Z',
    });

    assert.equal(staged.containsCorruptPayload, true, 'Flags corrupt payload presence');
    assert.equal(staged.rawMap.launchpad_app_data_v1, v1Payload);
    assert.equal(staged.rawMap.launchpad_app_data_v2, v2Payload);
    assert.equal(staged.rawMap.launchpad_app_data_v3, v3Payload);
    assert.equal(staged.rawMap.launchpad_app_data_backup_v3, corruptPayload);
    assert.equal(staged.rawMap.launchpad_focus_timer_v1, focusTimerPayload);

    // Verify corrupt payload was preserved without throwing and with error details
    const corruptEntry = staged.stagedEntries.find((e) => e.key === 'launchpad_app_data_backup_v3');
    assert.ok(corruptEntry);
    assert.equal(corruptEntry.isJson, false);
    assert.equal(corruptEntry.parsedJson, null);
    assert.ok(typeof corruptEntry.parseError === 'string' && corruptEntry.parseError.length > 0);

    // Verify unsupported fields were NOT stripped by any sanitizer
    const v1Staged = staged.stagedEntries.find((e) => e.key === 'launchpad_app_data_v1');
    assert.ok(v1Staged && v1Staged.isJson);
    assert.equal((v1Staged.parsedJson as any).customLegacySetting, 'keep-this-unsupported-field');

    const v2Staged = staged.stagedEntries.find((e) => e.key === 'launchpad_app_data_v2');
    assert.ok(v2Staged && v2Staged.isJson);
    assert.equal((v2Staged.parsedJson as any).unsupportedTelemetry.trackingId, 'abc-xyz');

    const v3Staged = staged.stagedEntries.find((e) => e.key === 'launchpad_app_data_v3');
    assert.ok(v3Staged && v3Staged.isJson);
    assert.deepEqual((v3Staged.parsedJson as any).unknownFutureProp, [1, 2, 3]);

    // Ensure staging did NOT invent default tasks, seed data or growth history
    assert.equal((staged as any).quickNotes, undefined);
    assert.equal((staged as any).gamification, undefined);
    assert.equal((staged as any).growthHistory, undefined);

    console.log('   ✓ Exact roundtrip and unsupported field preservation verified.');
  }

  // --------------------------------------------------------------------------
  // Suite 2: Unicode and limits
  // --------------------------------------------------------------------------
  console.log('2. Testing Unicode byte lengths and limits...');
  {
    const unicodeString = '🚀 Focus Rocket — 专注工作 — Über-Funktion — 👨‍👩‍👧‍👦 2026';
    const jsLength = unicodeString.length; // UTF-16 code units
    const utf8Bytes = computeUtf8ByteLength(unicodeString); // UTF-8 byte count

    assert.ok(utf8Bytes > jsLength, `UTF-8 bytes (${utf8Bytes}) must exceed JS char length (${jsLength}) for multi-byte chars`);

    const reader = new MockStorageReader({
      launchpad_app_data_v3: unicodeString,
    });
    const snapshot = await createRecoverySnapshot(reader);
    const entry = snapshot.entries.find((e) => e.key === 'launchpad_app_data_v3')!;
    assert.equal(entry.byteLength, utf8Bytes);
    assert.equal(entry.sha256, nodeSha256(unicodeString));

    await validateRecoveryEnvelope(snapshot);

    // Byte-size overflow testing in validator
    await assert.rejects(
      async () => {
        await validateRecoveryEnvelope(snapshot, { maxEntryBytes: utf8Bytes - 1 });
      },
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('exceeds maximum allowed')
    );

    // Multi-entry total byte size overflow in validator
    const multiEntryReader = new MockStorageReader({
      launchpad_app_data_v1: '12345678', // 8 bytes
      launchpad_app_data_v2: '12345678', // 8 bytes (total 16 bytes)
    });
    const multiSnapshot = await createRecoverySnapshot(multiEntryReader);
    await assert.rejects(
      async () => {
        await validateRecoveryEnvelope(multiSnapshot, { maxEntryBytes: 10, maxTotalBytes: 12 });
      },
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Total envelope byte size')
    );

    console.log('   ✓ Unicode byte length computation and limits verified.');
  }

  // --------------------------------------------------------------------------
  // Suite 3: Deterministic ordering and hash verification
  // --------------------------------------------------------------------------
  console.log('3. Testing deterministic ordering and SHA-256 verification...');
  {
    // Provide keys in reverse/random order in reader
    const reader = new MockStorageReader({
      launchpad_focus_timer_v1: 'timer-data',
      launchpad_app_data_v3: 'v3-data',
      launchpad_app_data_v1: 'v1-data',
      launchpad_app_data_backup: 'backup-data',
      launchpad_app_data_v2: 'v2-data',
      launchpad_app_data_backup_v3: 'backup-v3-data',
    });

    const snapshot = await createRecoverySnapshot(reader);
    const keysInEnvelope = snapshot.entries.map((e) => e.key);

    assert.deepEqual(keysInEnvelope, [...ALLOWED_STORAGE_KEYS]);

    for (const entry of snapshot.entries) {
      const expectedSha256 = nodeSha256(entry.rawValue);
      assert.equal(entry.sha256, expectedSha256, `SHA-256 matches node crypto for ${entry.key}`);
    }

    const canonicalString = snapshot.entries.map((e) => `${e.key}:${e.sha256}`).join('\n');
    const expectedManifestHash = nodeSha256(canonicalString);
    assert.equal(snapshot.manifest.manifestSha256, expectedManifestHash);

    console.log('   ✓ Deterministic alphabetical sorting and cryptographic hashes verified.');
  }

  // --------------------------------------------------------------------------
  // Suite 4: Excluded token and unrelated keys never requested
  // --------------------------------------------------------------------------
  console.log('4. Testing excluded token/unrelated keys never requested...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v3: '{"version": 3}',
      launchpad_gcal_token_v1: 'SECRET_GOOGLE_OAUTH_TOKEN_DO_NOT_READ',
      launchpad_ticktick_settings_v1: 'SECRET_TICKTICK_CLIENT_TOKEN',
      launchpad_pet_v1: 'pet-state',
      launchpad_pet_pos_v1: 'pet-coords',
      unrelated_origin_key: 'unrelated',
      another_app_data: 'other',
    });

    const snapshot = await createRecoverySnapshot(reader);

    assert.equal(reader.queriedKeys.includes('launchpad_gcal_token_v1'), false, 'NEVER queries launchpad_gcal_token_v1');
    assert.equal(reader.queriedKeys.includes('launchpad_ticktick_settings_v1'), false, 'NEVER queries launchpad_ticktick_settings_v1');
    assert.equal(reader.queriedKeys.includes('launchpad_pet_v1'), false, 'NEVER queries launchpad_pet_v1');
    assert.equal(reader.queriedKeys.includes('unrelated_origin_key'), false, 'NEVER queries unrelated keys');

    // Confirm excluded keys are tracked in EXCLUDED_STORAGE_KEYS
    assert.ok(EXCLUDED_STORAGE_KEYS.includes('launchpad_gcal_token_v1'));
    assert.ok(EXCLUDED_STORAGE_KEYS.includes('launchpad_ticktick_settings_v1'));

    // Confirm every queried key is an allowed storage key
    for (const key of reader.queriedKeys) {
      assert.ok(ALLOWED_STORAGE_KEYS.includes(key as any), `Queried key "${key}" must be in ALLOWED_STORAGE_KEYS`);
    }

    // Confirm envelope entries only contain allowed keys
    for (const entry of snapshot.entries) {
      assert.ok(ALLOWED_STORAGE_KEYS.includes(entry.key));
      assert.notEqual(entry.key, 'launchpad_gcal_token_v1' as any);
      assert.notEqual(entry.key, 'launchpad_ticktick_settings_v1' as any);
    }

    console.log('   ✓ Strict allowlist enforcement verified (tokens & foreign keys untouched).');
  }

  // --------------------------------------------------------------------------
  // Suite 5: Missing storage
  // --------------------------------------------------------------------------
  console.log('5. Testing missing storage and missing keys handling...');
  {
    // Completely empty storage
    const emptyReader = new MockStorageReader({});
    const snapshot = await createRecoverySnapshot(emptyReader);

    assert.equal(snapshot.entries.length, 0);
    assert.equal(snapshot.manifest.entryCount, 0);
    assert.equal(snapshot.manifest.totalByteLength, 0);
    assert.deepEqual(snapshot.manifest.presentKeys, []);
    assert.deepEqual(snapshot.manifest.missingKeys, [...ALLOWED_STORAGE_KEYS]);

    const validated = await validateRecoveryEnvelope(snapshot);
    assert.equal(validated.entries.length, 0);

    const staged = await stageRecoverySnapshot(snapshot);
    assert.equal(staged.stagedEntries.length, 0);
    assert.deepEqual(staged.missingKeys, [...ALLOWED_STORAGE_KEYS]);
    assert.equal(staged.containsCorruptPayload, false);

    // Invalid reader
    await assert.rejects(
      async () => {
        await createRecoverySnapshot(null as any);
      },
      (err: any) => err instanceof RecoveryError && err.code === 'INVALID_READER'
    );

    console.log('   ✓ Missing storage keys and invalid reader handled explicitly.');
  }

  // --------------------------------------------------------------------------
  // Suite 6: Safe read error handling (no private token leakage)
  // --------------------------------------------------------------------------
  console.log('6. Testing read errors are never silently ignored and leak no sensitive payload...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v3: '{"version": 3}',
    });
    const sensitiveMessage = 'QuotaExceeded: Storage locked on secretToken="sk-or-super-secret-user-key"';
    reader.readErrors.set('launchpad_app_data_v3', new Error(sensitiveMessage));

    await assert.rejects(
      async () => {
        await createRecoverySnapshot(reader);
      },
      (err: any) => {
        assert.ok(err instanceof RecoveryReadError);
        assert.equal(err.key, 'launchpad_app_data_v3');
        // Public message must identify ONLY the key, never interpolating the underlying error text
        assert.equal(
          err.message,
          '[RecoveryError:READ_FAILED] Failed to read key "launchpad_app_data_v3" from storage reader.'
        );
        assert.equal(err.message.includes('sk-or-super-secret-user-key'), false, 'Does not leak sensitive token in message');
        // Cause is preserved safely for explicit local inspection
        assert.equal((err.cause as Error)?.message, sensitiveMessage);
        return true;
      }
    );

    console.log('   ✓ Safe read error message verified with no payload leakage.');
  }

  // --------------------------------------------------------------------------
  // Suite 7: Tampering detection
  // --------------------------------------------------------------------------
  console.log('7. Testing tampering detection (value, byteLength, hashes, sensitivity)...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v3: '{"status": "authentic"}',
      launchpad_focus_timer_v1: '{"seconds": 60}',
    });
    const snapshot = await createRecoverySnapshot(reader);

    // A: Tamper raw value without updating hash (same byte length to isolate SHA-256 check)
    // '{"status": "authentic"}' -> '{"status": "tampered!"}' (both 23 bytes)
    const tamperedValue: RecoveryEnvelope = {
      ...snapshot,
      entries: snapshot.entries.map((e) =>
        e.key === 'launchpad_app_data_v3'
          ? { ...e, rawValue: '{"status": "tampered!"}' }
          : e
      ),
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(tamperedValue),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Tampering detected: SHA-256 mismatch')
    );

    // B: Tamper byteLength
    const tamperedByteLength: RecoveryEnvelope = {
      ...snapshot,
      entries: snapshot.entries.map((e) =>
        e.key === 'launchpad_app_data_v3'
          ? { ...e, byteLength: e.byteLength + 10 }
          : e
      ),
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(tamperedByteLength),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('byte length mismatch')
    );

    // C: Tamper manifest SHA-256
    const tamperedManifestHash: RecoveryEnvelope = {
      ...snapshot,
      manifest: {
        ...snapshot.manifest,
        manifestSha256: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(tamperedManifestHash),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Manifest checksum mismatch')
    );

    // D: Tamper manifest totalByteLength
    const tamperedTotalBytes: RecoveryEnvelope = {
      ...snapshot,
      manifest: {
        ...snapshot.manifest,
        totalByteLength: 999999,
      },
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(tamperedTotalBytes),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Manifest totalByteLength')
    );

    // E: Tamper sensitivity notice (e.g. attempting to claim portable export)
    const tamperedSensitivity: RecoveryEnvelope = {
      ...snapshot,
      sensitivity: {
        ...snapshot.sensitivity,
        isPortableExport: true as any,
      },
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(tamperedSensitivity),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('non-portability contract')
    );

    console.log('   ✓ Tampering detection verified across all integrity dimensions.');
  }

  // --------------------------------------------------------------------------
  // Suite 8: Duplicate keys and unsupported schema
  // --------------------------------------------------------------------------
  console.log('8. Testing duplicate keys, disallowed keys, and unsupported schema...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v1: 'v1',
      launchpad_app_data_v2: 'v2',
    });
    const snapshot = await createRecoverySnapshot(reader);

    // A: Injected duplicate key
    const duplicateKeyEnvelope = {
      ...snapshot,
      entries: [
        snapshot.entries[0],
        snapshot.entries[0], // Duplicate
      ],
      manifest: {
        ...snapshot.manifest,
        entryCount: 2,
      },
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(duplicateKeyEnvelope),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Duplicate storage key')
    );

    // B: Injected excluded key
    const excludedKeyEnvelope = {
      ...snapshot,
      entries: [
        {
          key: 'launchpad_gcal_token_v1',
          rawValue: 'injected_token',
          byteLength: 14,
          sha256: nodeSha256('injected_token'),
        },
      ],
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(excludedKeyEnvelope),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('excluded sensitive key')
    );

    // C: Injected arbitrary disallowed key
    const disallowedKeyEnvelope = {
      ...snapshot,
      entries: [
        {
          key: 'unrelated_foreign_key',
          rawValue: 'payload',
          byteLength: 7,
          sha256: nodeSha256('payload'),
        },
      ],
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(disallowedKeyEnvelope),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('disallowed storage key')
    );

    // D: Unsupported schema version
    const unsupportedVersionEnvelope = {
      ...snapshot,
      schemaVersion: 'launchpad-recovery-v999',
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(unsupportedVersionEnvelope),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Unsupported envelope schema version')
    );

    // E: Out-of-order keys
    const unsortedEnvelope = {
      ...snapshot,
      entries: [...snapshot.entries].reverse(),
    };
    await assert.rejects(
      async () => validateRecoveryEnvelope(unsortedEnvelope),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Entries are not deterministically sorted')
    );

    console.log('   ✓ Schema version, key allowlists, and sorting order strictly enforced.');
  }

  // --------------------------------------------------------------------------
  // Suite 9: Unavailable crypto
  // --------------------------------------------------------------------------
  console.log('9. Testing explicit error when Web Crypto API is unavailable...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v3: 'test-content',
    });

    // Provide mock subtle with no digest method
    const invalidSubtle = {} as SubtleCrypto;

    await assert.rejects(
      async () => {
        await createRecoverySnapshot(reader, { subtle: invalidSubtle });
      },
      (err: any) => err instanceof RecoveryCryptoError && err.message.includes('Web Crypto API subtle.digest is unavailable')
    );

    await assert.rejects(
      async () => {
        await computeSha256('test', invalidSubtle);
      },
      (err: any) => err instanceof RecoveryCryptoError
    );

    console.log('   ✓ Missing/unavailable crypto handled with RecoveryCryptoError.');
  }

  // --------------------------------------------------------------------------
  // Suite 10: No mutations or sanitizer calls
  // --------------------------------------------------------------------------
  console.log('10. Testing zero mutations and no sanitizer execution...');
  {
    const reader = new MockStorageReader({
      launchpad_app_data_v3: JSON.stringify({
        version: 3,
        quickNotes: [{ id: 'task-test', text: 'Preserve me' }],
      }),
    });

    const snapshot = await createRecoverySnapshot(reader);
    await validateRecoveryEnvelope(snapshot);
    const staged = await stageRecoverySnapshot(snapshot);

    // Verify reader never experienced setItem/removeItem/clear
    assert.equal(reader.mutationCalls.length, 0, 'No write methods called on reader');

    // Verify staged snapshot has not injected default seed data
    assert.equal((staged as any).folders, undefined);
    assert.equal((staged as any).links, undefined);
    assert.equal((staged as any).dailyFocus, undefined);

    console.log('   ✓ Zero storage writes and zero sanitizer mutations confirmed.');
  }

  // --------------------------------------------------------------------------
  // Suite 11: Hardened isolation regressions
  // --------------------------------------------------------------------------
  console.log('11. Testing hardened isolation regressions (limits, timestamps, mutation resistance, frozen data)...');
  {
    // A: NaN, Infinity, negative, unsafe limits rejection in snapshot, validation, staging
    const invalidLimits = [NaN, Infinity, -1, -100, 0, 1.5, Number.MAX_SAFE_INTEGER + 10];
    const reader = new MockStorageReader({ launchpad_app_data_v3: 'test' });

    for (const badLimit of invalidLimits) {
      await assert.rejects(
        async () => createRecoverySnapshot(reader, { maxEntryBytes: badLimit }),
        (err: any) => err instanceof RecoveryValidationError && err.message.includes('must be a positive safe integer'),
        `Snapshot rejects maxEntryBytes: ${badLimit}`
      );
      await assert.rejects(
        async () => createRecoverySnapshot(reader, { maxTotalBytes: badLimit }),
        (err: any) => err instanceof RecoveryValidationError && err.message.includes('must be a positive safe integer'),
        `Snapshot rejects maxTotalBytes: ${badLimit}`
      );
      await assert.rejects(
        async () => validateRecoveryEnvelope({ schemaVersion: RECOVERY_ENVELOPE_SCHEMA_VERSION }, { maxEntryBytes: badLimit }),
        (err: any) => err instanceof RecoveryValidationError && err.message.includes('must be a positive safe integer'),
        `Validator rejects maxEntryBytes: ${badLimit}`
      );
    }

    // maxEntryBytes > maxTotalBytes
    await assert.rejects(
      async () => createRecoverySnapshot(reader, { maxEntryBytes: 100, maxTotalBytes: 50 }),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('cannot exceed maxTotalBytes')
    );

    // B: Capture rejection before digest on oversized entry (character precheck and byte precheck)
    let digestCalled = false;
    const trackingSubtle: SubtleCrypto = {
      digest: async (algo: AlgorithmIdentifier, data: BufferSource) => {
        digestCalled = true;
        return globalThis.crypto.subtle.digest(algo, data);
      },
    } as any;

    const oversizedReader = new MockStorageReader({
      launchpad_app_data_v3: '01234567890123456789', // 20 chars
    });

    digestCalled = false;
    await assert.rejects(
      async () => createRecoverySnapshot(oversizedReader, { maxEntryBytes: 10, subtle: trackingSubtle }),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('exceeds single entry limit')
    );
    assert.equal(digestCalled, false, 'Did not call digest when entry size exceeded limit');

    // Total size limit across entries in snapshot
    const multiEntryReader = new MockStorageReader({
      launchpad_app_data_v1: '12345678', // 8 bytes
      launchpad_app_data_v2: '12345678', // 8 bytes -> running total 16 > 12
    });
    await assert.rejects(
      async () => createRecoverySnapshot(multiEntryReader, { maxEntryBytes: 10, maxTotalBytes: 12 }),
      (err: any) => err instanceof RecoveryValidationError && err.message.includes('Total snapshot byte size')
    );

    // C: Invalid timestamps rejection in capturedAt and stagedAt
    const invalidTimestamps = ['invalid-date', '', '   ', '2026-99-99T99:99:99Z'];
    for (const badTime of invalidTimestamps) {
      await assert.rejects(
        async () => createRecoverySnapshot(reader, { capturedAt: badTime }),
        (err: any) => err instanceof RecoveryValidationError && err.message.includes('Invalid capturedAt timestamp'),
        `Snapshot rejects capturedAt: ${badTime}`
      );
      await assert.rejects(
        async () => stageRecoverySnapshot(await createRecoverySnapshot(reader), { stagedAt: badTime }),
        (err: any) => err instanceof RecoveryValidationError && err.message.includes('Invalid stagedAt timestamp'),
        `Staging rejects stagedAt: ${badTime}`
      );
    }

    // D: Caller mutation during delayed digest cannot alter validated output
    const baselineSnapshot = await createRecoverySnapshot(reader);
    const mutableEnvelope = JSON.parse(JSON.stringify(baselineSnapshot)); // Deep clone to test caller tampering

    // Create a delayed subtle crypto that waits 20ms during digest
    const delayedSubtle: SubtleCrypto = {
      digest: async (algo: AlgorithmIdentifier, data: BufferSource) => {
        await new Promise((r) => setTimeout(r, 20));
        return globalThis.crypto.subtle.digest(algo, data);
      },
    } as any;

    // Start validation asynchronously
    const validationPromise = validateRecoveryEnvelope(mutableEnvelope, { subtle: delayedSubtle });

    // Mutate the caller-owned input while validation is awaiting digest
    mutableEnvelope.entries[0].rawValue = 'attacker-tampered-content-in-flight';
    mutableEnvelope.capturedAt = 'tampered-time';

    const validatedResult = await validationPromise;
    assert.equal(
      validatedResult.entries[0].rawValue,
      'test',
      'Normalized entry preserved original value captured synchronously before delayed digest'
    );
    assert.notEqual(
      validatedResult.entries[0].rawValue,
      'attacker-tampered-content-in-flight',
      'Did not allow in-flight mutation to substitute raw values'
    );

    // E: Immutability of returned objects (frozen notice, entries, arrays, manifest)
    assert.ok(Object.isFrozen(DEFAULT_SENSITIVITY_NOTICE), 'DEFAULT_SENSITIVITY_NOTICE is frozen');
    assert.ok(Object.isFrozen(baselineSnapshot.entries), 'snapshot.entries array is frozen');
    assert.ok(Object.isFrozen(baselineSnapshot.entries[0]), 'snapshot.entries[0] is frozen');
    assert.ok(Object.isFrozen(baselineSnapshot.manifest), 'snapshot.manifest is frozen');
    assert.ok(Object.isFrozen(baselineSnapshot), 'snapshot is frozen');

    assert.ok(Object.isFrozen(validatedResult.entries), 'validated.entries array is frozen');
    assert.ok(Object.isFrozen(validatedResult.entries[0]), 'validated.entries[0] is frozen');
    assert.ok(Object.isFrozen(validatedResult.manifest), 'validated.manifest is frozen');
    assert.ok(Object.isFrozen(validatedResult), 'validated result is frozen');

    // Attempting to mutate throws in strict mode
    assert.throws(() => {
      (validatedResult.entries as any)[0] = null;
    }, TypeError);

    assert.throws(() => {
      (validatedResult.entries[0] as any).rawValue = 'new-value';
    }, TypeError);

    // F: Staged snapshot is detached from caller mutation
    const stagedResult = await stageRecoverySnapshot(validatedResult);
    assert.ok(Object.isFrozen(stagedResult.rawMap), 'staged.rawMap is frozen');
    assert.ok(Object.isFrozen(stagedResult.stagedEntries), 'staged.stagedEntries is frozen');
    assert.ok(Object.isFrozen(stagedResult.stagedEntries[0]), 'staged.stagedEntries[0] is frozen');
    assert.equal(stagedResult.rawMap.launchpad_app_data_v3, 'test');

    console.log('   ✓ Hardened isolation regressions (bounds, timestamps, mutation resistance, frozen structures) verified.');
  }

  console.log('\n🎉 ALL RECOVERY TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n💥 TEST SUITE FAILED:', err);
  process.exit(1);
});
