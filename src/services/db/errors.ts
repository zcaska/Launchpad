/**
 * LaunchPad Database Error Hierarchy (Stage 2A)
 */

export class DatabaseError extends Error {
  constructor(public readonly code: string, message: string, public readonly cause?: unknown) {
    super(`[DatabaseError:${code}] ${message}`);
    this.name = 'DatabaseError';
  }
}

export class DatabaseClosedError extends DatabaseError {
  constructor(message: string = 'Database connection has been closed.') {
    super('DATABASE_CLOSED', message);
    this.name = 'DatabaseClosedError';
  }
}

export class DatabaseBlockedError extends DatabaseError {
  constructor(message: string = 'Database opening, upgrade, or deletion was blocked by other open connections.') {
    super('DATABASE_BLOCKED', message);
    this.name = 'DatabaseBlockedError';
  }
}

export class OwnerMismatchError extends DatabaseError {
  constructor(expectedOwner: string, actualOwner: string) {
    super(
      'OWNER_MISMATCH',
      `Record owner_id "${actualOwner}" does not match database ownerId "${expectedOwner}". Cross-owner mutations are prohibited.`
    );
    this.name = 'OwnerMismatchError';
  }
}

export class RevisionConflictError extends DatabaseError {
  constructor(expectedRevision: number, currentRevision: number, entityId: string) {
    super(
      'REVISION_CONFLICT',
      `Optimistic revision conflict on entity "${entityId}": expected revision ${expectedRevision}, current revision is ${currentRevision}.`
    );
    this.name = 'RevisionConflictError';
  }
}

export class TombstoneConflictError extends DatabaseError {
  constructor(entityType: string, entityId: string) {
    super(
      'TOMBSTONE_ACTIVE',
      `Cannot create or update ${entityType} "${entityId}": a persistent deletion tombstone is active.`
    );
    this.name = 'TombstoneConflictError';
  }
}

export class MutationConflictError extends DatabaseError {
  constructor(mutationId: string) {
    super(
      'MUTATION_CONFLICT',
      `Mutation "${mutationId}" has already been committed with a different request payload. Reusing mutation IDs for different operations is prohibited.`
    );
    this.name = 'MutationConflictError';
  }
}

export class SemanticConflictError extends DatabaseError {
  constructor(message: string) {
    super('SEMANTIC_CONFLICT', message);
    this.name = 'SemanticConflictError';
  }
}

export class EntityNotFoundError extends DatabaseError {
  constructor(entityType: string, entityId: string) {
    super('ENTITY_NOT_FOUND', `${entityType} with id "${entityId}" was not found.`);
    this.name = 'EntityNotFoundError';
  }
}
