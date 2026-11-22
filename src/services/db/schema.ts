/**
 * LaunchPad IndexedDB Schema & Constants (Stage 2A)
 */

export const LAUNCHPAD_DB_VERSION = 1;
export const DEFAULT_DB_PREFIX = 'launchpad_';

export const STORES = {
  TASKS: 'tasks',
  EVIDENCE: 'evidence',
  REVIEW_DRAFTS: 'review_drafts',
  REFLECTIONS: 'reflections',
  OUTBOX: 'outbox',
  MUTATION_RECEIPTS: 'mutation_receipts',
  DELETION_FENCES: 'deletion_fences',
  CONFLICTS: 'conflicts',
  MIGRATION_MANIFESTS: 'migration_manifests',
  OWNER_SYNC_STATE: 'owner_sync_state',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export const ALL_STORE_NAMES: readonly StoreName[] = Object.freeze(Object.values(STORES));

/**
 * Derives the isolated, owner-specific IndexedDB database name.
 */
export function getDatabaseName(ownerId: string, prefix: string = DEFAULT_DB_PREFIX): string {
  return `${prefix}${ownerId}`;
}

/**
 * Initializes or upgrades the IndexedDB schema stores and indexes.
 */
export function upgradeDatabaseSchema(db: IDBDatabase, _oldVersion: number, _newVersion: number | null): void {
  // 1. Tasks store
  if (!db.objectStoreNames.contains(STORES.TASKS)) {
    const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
    taskStore.createIndex('by_lifecycle', 'lifecycle', { unique: false });
    taskStore.createIndex('by_planned_day', 'planned_day', { unique: false });
    taskStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 2. Evidence store (append-only with semantic uniqueness index)
  if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
    const evidenceStore = db.createObjectStore(STORES.EVIDENCE, { keyPath: 'event_id' });
    evidenceStore.createIndex('by_semantic_key', 'semantic_key', { unique: true });
    evidenceStore.createIndex('by_local_day', 'local_day', { unique: false });
    evidenceStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 3. Review drafts store (keyed by day_key)
  if (!db.objectStoreNames.contains(STORES.REVIEW_DRAFTS)) {
    const draftStore = db.createObjectStore(STORES.REVIEW_DRAFTS, { keyPath: 'day_key' });
    draftStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 4. Permanent reflections store (unique by day_key)
  if (!db.objectStoreNames.contains(STORES.REFLECTIONS)) {
    const reflectionStore = db.createObjectStore(STORES.REFLECTIONS, { keyPath: 'id' });
    reflectionStore.createIndex('by_day_key', 'day_key', { unique: true });
    reflectionStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 5. Durable outbox store (ordered causally by persistent monotonic enqueue ordinal)
  if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
    const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'mutation_id' });
    outboxStore.createIndex('by_owner_ordinal', ['owner_id', 'enqueue_ordinal'], { unique: true });
    outboxStore.createIndex('by_status', 'status', { unique: false });
    outboxStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 6. Mutation receipts store (keyed by mutation_id)
  if (!db.objectStoreNames.contains(STORES.MUTATION_RECEIPTS)) {
    const receiptStore = db.createObjectStore(STORES.MUTATION_RECEIPTS, { keyPath: 'mutation_id' });
    receiptStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 7. Deletion fences store (composite key `${entity_type}:${entity_id}`)
  if (!db.objectStoreNames.contains(STORES.DELETION_FENCES)) {
    const fenceStore = db.createObjectStore(STORES.DELETION_FENCES, { keyPath: 'id' });
    fenceStore.createIndex('by_owner_id', 'owner_id', { unique: false });
    fenceStore.createIndex('by_entity', ['entity_type', 'entity_id'], { unique: true });
  }

  // 8. Conflicts store
  if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
    const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'conflict_id' });
    conflictStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 9. Migration manifests store
  if (!db.objectStoreNames.contains(STORES.MIGRATION_MANIFESTS)) {
    const manifestStore = db.createObjectStore(STORES.MIGRATION_MANIFESTS, { keyPath: 'manifest_id' });
    manifestStore.createIndex('by_owner_id', 'owner_id', { unique: false });
  }

  // 10. Owner sync state store (persistent monotonic sequence counter)
  if (!db.objectStoreNames.contains(STORES.OWNER_SYNC_STATE)) {
    db.createObjectStore(STORES.OWNER_SYNC_STATE, { keyPath: 'owner_id' });
  }
}
