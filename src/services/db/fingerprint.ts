/**
 * Deterministic Mutation Request Fingerprinting (Stage 2A)
 *
 * Computes a canonical SHA-256 digest of a structured mutation request BEFORE
 * entering an IndexedDB transaction. Ensures identical requests can be safely
 * replayed idempotently, while altered payloads with the same mutation ID are rejected.
 *
 * Requirements:
 * - Reject undefined, functions, symbols, non-finite numbers, and circular references.
 * - Canonical key sorting for objects.
 * - Structured object serialization (no ambiguous delimiter concatenation).
 * - No weak silent non-cryptographic fallback for mutation identity.
 * - No async crypto executed inside IDB transactions.
 */

import { EntityType, MutationOperation } from '../../domain/types';
import { DomainValidationError } from '../../domain/validation';
import { DatabaseError } from './errors';

/**
 * Serializes any JavaScript value into a deterministically sorted canonical JSON string.
 * Strictly rejects non-serializable, non-finite, undefined, and circular values.
 */
export function canonicalJsonString(val: unknown, seen = new WeakSet<object>()): string {
  if (val === null) {
    return 'null';
  }

  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (typeof val === 'string') {
    return JSON.stringify(val);
  }

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new DomainValidationError('payload', `Non-finite number (${val}) cannot be serialized to JSON`);
    }
    return Object.is(val, -0) ? '-0' : JSON.stringify(val);
  }

  if (typeof val === 'undefined') {
    throw new DomainValidationError('payload', 'Undefined values cannot be serialized in mutation payload');
  }

  if (typeof val === 'function' || typeof val === 'symbol') {
    throw new DomainValidationError('payload', `${typeof val} values cannot be serialized in mutation payload`);
  }

  if (typeof val === 'object') {
    if (seen.has(val)) {
      throw new DomainValidationError('payload', 'Circular reference detected in mutation payload');
    }
    seen.add(val);

    if (Array.isArray(val)) {
      const elements = val.map((item) => canonicalJsonString(item, seen));
      seen.delete(val);
      return `[${elements.join(',')}]`;
    }

    const keys = Object.keys(val as Record<string, any>).sort();
    const entries = keys.map((key) => {
      const propVal = (val as Record<string, any>)[key];
      if (propVal === undefined) {
        throw new DomainValidationError('payload', `Undefined property "${key}" cannot be serialized in payload`);
      }
      return `${JSON.stringify(key)}:${canonicalJsonString(propVal, seen)}`;
    });
    seen.delete(val);
    return `{${entries.join(',')}}`;
  }

  throw new DomainValidationError('payload', `Unsupported value type: ${typeof val}`);
}

export interface CanonicalMutationStructure {
  readonly entity_id: string;
  readonly entity_type: EntityType;
  readonly expected_revision: number;
  readonly mutation_id: string;
  readonly operation: MutationOperation;
  readonly owner_id: string;
  readonly payload: unknown;
}

/**
 * Computes the deterministic SHA-256 hex digest for a structured mutation request.
 */
export async function computeMutationFingerprint(
  mutationId: string,
  ownerId: string,
  entityType: EntityType,
  entityId: string,
  operation: MutationOperation,
  expectedRevision: number,
  payload: unknown,
  subtle?: SubtleCrypto
): Promise<string> {
  const cryptoSubtle =
    subtle ?? (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined);

  if (!cryptoSubtle || typeof cryptoSubtle.digest !== 'function') {
    throw new DatabaseError(
      'CRYPTO_UNAVAILABLE',
      'Web Crypto API (subtle.digest) is required for mutation fingerprinting. No non-cryptographic fallback is permitted.'
    );
  }

  const structuredRequest: CanonicalMutationStructure = {
    entity_id: entityId,
    entity_type: entityType,
    expected_revision: expectedRevision,
    mutation_id: mutationId,
    operation,
    owner_id: ownerId,
    payload,
  };

  const canonicalString = canonicalJsonString(structuredRequest);
  const bytes = new TextEncoder().encode(canonicalString);
  const buffer = await cryptoSubtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
