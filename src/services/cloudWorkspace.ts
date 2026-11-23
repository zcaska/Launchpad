import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import { loadAppData, sanitizeAppData } from '../utils/storage';
import { createStorageDraftKey, readStorageDrafts, removeStorageDraft, withStorageLock, writeStorageDraft } from '../utils/storageConflict';

export interface CloudProject {
  name: string;
  url: string;
  key: string;
}

export interface CloudRecord {
  data: AppData;
  revision: string | null;
  dirty: boolean;
  pendingRevision?: string;
  reviewLegacyScope?: boolean;
  // Earlier writes against the same base can still commit after a local edit.
  previousPendingRevisions?: string[];
}

export interface CloudWorkspace {
  project: CloudProject;
  client: SupabaseClient;
  userId: string;
  email?: string;
  initial: CloudRecord;
  cacheBaseline?: string | null;
}

export function editCloudRecord(local: CloudRecord, data: AppData): CloudRecord {
  if (local.data === data) return local;
  if (sameSharedData(local.data, data)) return { ...local, data };
  return queueChangedData(local, data);
}

// PostgreSQL JSONB can reorder object keys. Array order is significant.
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => sameValue(value, b[i]));
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  return keys.length === Object.keys(right).filter(key => right[key] !== undefined).length
    && keys.every(key => sameValue(left[key], right[key]));
}

export function sameSharedData(a: AppData, b: AppData) {
  return sameValue(cloudData(a), cloudData(b));
}

function queueChangedData(local: CloudRecord, data: AppData): CloudRecord {
  const previous = local.previousPendingRevisions;
  return {
    reviewLegacyScope: local.reviewLegacyScope, revision: local.revision, data, dirty: true,
    previousPendingRevisions: local.pendingRevision ? [...(previous ?? []), local.pendingRevision] : previous,
  };
}

export function prepareCloudWrite(local: CloudRecord) {
  // Reuse a token only while its payload is unchanged.
  return { ...local, pendingRevision: local.pendingRevision ?? crypto.randomUUID() };
}

export type CloudAcknowledgement = { action: 'queue' | 'synced'; record: CloudRecord };

type CloudRevisionDecision =
  | CloudAcknowledgement
  | { action: 'superseded' | 'conflict' | 'download' | 'unchanged' };

export function reconcileCloudRevision(
  local: CloudRecord,
  revision: string,
  source: 'remote' | 'response' = 'remote',
): CloudRevisionDecision {
  const earlierWrite = local.previousPendingRevisions?.includes(revision) === true;
  if (local.pendingRevision === revision || earlierWrite) {
    // Only one write can win the compare-and-swap against this base. Every
    // other pending token from that base is settled when we acknowledge it.
    return { action: earlierWrite ? 'queue' : 'synced', record: { data: local.data, revision, dirty: earlierWrite } };
  }
  if (source === 'response') return { action: 'superseded' };
  if (revision !== local.revision) return { action: local.dirty ? 'conflict' : 'download' };
  return { action: 'unchanged' };
}

export const DEFAULT_CLOUD_PROJECT: CloudProject = {
  name: 'LaunchPAD',
  url: 'https://fontqmojtpbtscudmyzq.supabase.co',
  key: 'sb_publishable_zgHXwkq83H4jx20wUJCXzw_acYW1q9Z',
};

export const CLOUD_PROJECTS_KEY = 'launchpad_cloud_projects_v1';
export const ACTIVE_CLOUD_KEY = 'launchpad_active_cloud_v1';
const TABLE = 'launchpad_workspaces';

export function validateCloudProject(name: string, address: string, key: string): CloudProject {
  const url = new URL(address.trim());
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
      || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Enter the HTTPS project URL shown in your Supabase dashboard.');
  }
  const publishableKey = key.trim();
  if (!/^sb_publishable_[\w-]+$/.test(publishableKey)) {
    throw new Error('Enter a publishable key beginning with sb_publishable_.');
  }
  if (!name.trim()) throw new Error('Give the project a name.');
  return { name: name.trim(), url: url.origin, key: publishableKey };
}

export function readCloudProjects(): CloudProject[] {
  try {
    const profiles: CloudProject[] = JSON.parse(localStorage.getItem(CLOUD_PROJECTS_KEY) ?? '[]');
    return [DEFAULT_CLOUD_PROJECT, ...profiles.map(({ name, url, key }) => validateCloudProject(name, url, key))];
  } catch {
    return [DEFAULT_CLOUD_PROJECT];
  }
}

const clients = new Map<string, { key: string; client: Promise<SupabaseClient> }>();

export function getCloudClient(project: CloudProject) {
  const existing = clients.get(project.url);
  if (existing?.key === project.key) return existing.client;
  const client = import('@supabase/supabase-js').then(async ({ createClient }) => {
    if (existing) await (await existing.client).auth.stopAutoRefresh();
    return createClient(project.url, project.key, { auth: { detectSessionInUrl: false } });
  });
  clients.set(project.url, { key: project.key, client });
  return client;
}

type StoredSnapshot = Pick<AppData, 'version' | 'quickNotes'> & Record<string, unknown>;

export function cloudData(data: AppData) {
  const { lastBackupTimestamp: _backup, ...gamification } = data.gamification;
  return {
    syncFormat: 2 as const, version: data.version, quickNotes: data.quickNotes,
    castleEconomy: data.castleEconomy ?? null, reflections: data.reflections ?? [],
    growthHistory: data.growthHistory, dailyFocus: data.dailyFocus, gamification,
  };
}

function deviceFields(data: AppData) {
  return {
    settings: data.settings, scratchpadText: data.scratchpadText, folders: data.folders,
    links: data.links, learnedPreferences: data.learnedPreferences,
    lastBackupTimestamp: data.gamification.lastBackupTimestamp,
  };
}

function withDeviceFields(data: AppData, fields: ReturnType<typeof deviceFields>): AppData {
  const { lastBackupTimestamp, ...rest } = fields;
  return { ...data, ...rest, gamification: { ...data.gamification, lastBackupTimestamp } };
}

function validateSnapshot(snapshot: unknown): asserts snapshot is StoredSnapshot {
  if (!snapshot || typeof snapshot !== 'object' || !('version' in snapshot)
      || snapshot.version !== DEFAULT_SEED_DATA.version
      || !('quickNotes' in snapshot) || !Array.isArray(snapshot.quickNotes)) {
    throw new Error('This cloud workspace has an unsupported data format.');
  }
}

function decodeDeviceData(snapshot: unknown) {
  validateSnapshot(snapshot);
  return sanitizeAppData(snapshot, false);
}

function cacheKey(project: CloudProject, userId: string) {
  return `launchpad_cloud_cache_v1:${project.url}:${userId}`;
}

export function readCloudCache(project: CloudProject, userId: string): CloudRecord | null {
  try {
    return decodeCloudCache(localStorage.getItem(cacheKey(project, userId)));
  } catch {
    return null;
  }
}

function decodeCloudCache(raw: string | null): CloudRecord | null {
  if (!raw) return null;
  try {
    const record: CloudRecord = JSON.parse(raw);
    const data = decodeDeviceData(record.data);
    const legacyCache = (record as CloudRecord & { cacheFormat?: number }).cacheFormat !== 2;
    if (legacyCache) record.reviewLegacyScope = true;
    // Loading can repair older snapshots. A retry of the repaired payload
    // needs a fresh token just like an edit made by the user.
    if (record.pendingRevision && (legacyCache || !sameSharedData(data, record.data))) {
      return queueChangedData(record, data);
    }
    return { ...record, data };
  } catch {
    return null;
  }
}

function serializeCache(record: CloudRecord) {
  return JSON.stringify({ ...record, cacheFormat: 2 });
}

const cloudDraftPrefix = (workspace: CloudWorkspace) => `${cacheKey(workspace.project, workspace.userId)}:conflict:`;
export function archiveCloudCopy(workspace: CloudWorkspace, data: AppData) {
  return writeStorageDraft(createStorageDraftKey(cloudDraftPrefix(workspace)), data);
}
export const readCloudConflictDrafts = (workspace: CloudWorkspace) => readStorageDrafts(cloudDraftPrefix(workspace), decodeDeviceData);
export const removeCloudConflictDraft = (workspace: CloudWorkspace, key: string) => removeStorageDraft(cloudDraftPrefix(workspace), key);

/** Each mounted workspace compares against exactly the cache it opened. */
export function createCloudCacheWriter(workspace: CloudWorkspace) {
  const key = cacheKey(workspace.project, workspace.userId);
  let draftKey = createStorageDraftKey(cloudDraftPrefix(workspace));
  let baseline = workspace.cacheBaseline;
  if (baseline === undefined) {
    try { baseline = localStorage.getItem(key); } catch { /* Online use can continue. */ }
  }
  let savedDeviceData = workspace.initial.data;
  let savedRevision = workspace.initial.revision;
  let mergedDeviceData: AppData | undefined;
  let replacingDeviceData = false;
  let hasDraft = false;
  const preserve = (record: CloudRecord): 'conflict' | 'failed' => {
    const saved = writeStorageDraft(draftKey, record.data);
    hasDraft ||= saved;
    return saved ? 'conflict' : 'failed';
  };
  const save = (record: CloudRecord): 'saved' | 'conflict' | 'failed' => {
    try {
      const latest = localStorage.getItem(key);
      let serialized = serializeCache(record);
      if (baseline === undefined) baseline = latest;
      if (latest === serialized || latest === baseline) {
        let nextMergedData: AppData | undefined;
        if (mergedDeviceData && latest === baseline && !replacingDeviceData) {
          const fields = deviceFields(record.data);
          const saved = deviceFields(savedDeviceData);
          const cached = deviceFields(mergedDeviceData);
          for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
            if (sameValue(cached[key], saved[key])) continue;
            if (!sameValue(fields[key], saved[key]) && !sameValue(fields[key], cached[key])) return preserve(record);
            Object.assign(fields, { [key]: cached[key] });
          }
          const merged = withDeviceFields(record.data, fields);
          serialized = serializeCache({ ...record, data: merged });
          nextMergedData = merged;
        }
        if (latest !== serialized) localStorage.setItem(key, serialized);
        mergedDeviceData = nextMergedData;
        baseline = serialized;
        savedDeviceData = record.data;
        savedRevision = record.revision;
        if (hasDraft) {
          removeCloudConflictDraft(workspace, draftKey);
          hasDraft = false;
        }
        replacingDeviceData = false;
        return 'saved';
      }
      // A stale clean tab or a tab that only opened an existing shared
      // pending record has no edits of its own to archive.
      if (record === workspace.initial) return 'saved';
      if (!record.dirty && !replacingDeviceData) {
        if (sameValue(deviceFields(savedDeviceData), deviceFields(record.data))) {
          const otherTab = decodeCloudCache(latest);
          // Another tab changed only device data on our base. Keep those
          // fields and let an acknowledged task download advance its cache.
          if (otherTab && !otherTab.dirty && otherTab.revision === savedRevision && record.revision !== savedRevision) {
            const merged = { ...record, data: withDeviceFields(record.data, deviceFields(otherTab.data)) };
            const mergedBaseline = serializeCache(merged);
            localStorage.setItem(key, mergedBaseline);
            baseline = mergedBaseline;
            savedDeviceData = record.data;
            savedRevision = record.revision;
            mergedDeviceData = merged.data;
          }
          return 'saved';
        }
      }
      return preserve(record);
    } catch {
      return 'failed';
    }
  };
  const saveLocked = (record: CloudRecord, isCurrent = () => true) =>
    withStorageLock(key, () => isCurrent() ? save(record) : undefined)
      .catch(() => isCurrent() ? preserve(record) : undefined);
  const beginReplacement = () => {
    if (hasDraft) {
      draftKey = createStorageDraftKey(cloudDraftPrefix(workspace));
      hasDraft = false;
    }
    replacingDeviceData = true;
  };
  return { save, saveLocked, beginReplacement };
}

export function saveCloudCache(workspace: CloudWorkspace, record: CloudRecord): boolean {
  try {
    localStorage.setItem(cacheKey(workspace.project, workspace.userId), serializeCache(record));
    return true;
  } catch {
    return false;
  }
}

export async function readCloudRecord(client: SupabaseClient, userId: string, unchangedRevision?: string) {
  const query = client.from(TABLE).select('revision,snapshot').eq('user_id', userId);
  if (unchangedRevision) query.neq('revision', unchangedRevision);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(10000)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  validateSnapshot(data.snapshot);
  const snapshot = data.snapshot;
  if (snapshot.syncFormat !== undefined && (snapshot.syncFormat !== 2
    || !('castleEconomy' in snapshot) || !Array.isArray(snapshot.reflections)
    || !snapshot.dailyFocus || !snapshot.gamification || !snapshot.growthHistory)) {
    throw new Error('This cloud workspace has an unsupported progress format.');
  }
  return { data: cloudData(sanitizeAppData(snapshot, false)), revision: String(data.revision), snapshot };
}

export type RemoteRecord = NonNullable<Awaited<ReturnType<typeof readCloudRecord>>>;

export function applyRemoteData(device: AppData, remote: RemoteRecord): CloudRecord {
  // Legacy rows have no authority over fields outside their client's scope.
  // Format 2 represents every shared field, including a cleared castle.
  const shared = remote.data;
  const snapshot = remote.snapshot;
  const data: AppData = {
    ...device, quickNotes: shared.quickNotes,
    castleEconomy: 'castleEconomy' in snapshot ? shared.castleEconomy ?? undefined : device.castleEconomy,
    reflections: 'reflections' in snapshot ? shared.reflections : device.reflections,
    dailyFocus: 'dailyFocus' in snapshot ? shared.dailyFocus : device.dailyFocus,
    growthHistory: 'growthHistory' in snapshot ? shared.growthHistory : device.growthHistory,
    gamification: 'gamification' in snapshot
      ? { ...shared.gamification, lastBackupTimestamp: device.gamification.lastBackupTimestamp }
      : device.gamification,
  };
  return { data, revision: remote.revision, dirty: false };
}

export const applyRemoteTasks = applyRemoteData;

export function migrateCloudScope(local: CloudRecord, remote: RemoteRecord): CloudRecord | 'conflict' {
  const downloaded = applyRemoteData(local.data, remote);
  // The old cache might have independently edited progress at the same revision.
  if (!sameSharedData(local.data, { ...downloaded.data, quickNotes: local.data.quickNotes })) return 'conflict';
  if (local.dirty && local.revision !== remote.revision && !local.previousPendingRevisions?.includes(remote.revision)
      && !sameValue(local.data.quickNotes, remote.data.quickNotes)) return 'conflict';
  const data = local.dirty ? local.data : downloaded.data;
  return { data, revision: remote.revision, dirty: remote.snapshot.syncFormat !== 2 || !sameSharedData(data, downloaded.data) };
}

export function initialCloudRecord(remote: RemoteRecord | null, copyLocal?: AppData): CloudRecord {
  let settings = DEFAULT_SEED_DATA.settings;
  try {
    const device = copyLocal ?? loadAppData(false);
    settings = { ...device.settings, openRouter: DEFAULT_SEED_DATA.settings.openRouter };
  } catch {
    // A damaged local workspace can be recovered separately from this account.
  }
  const device = { ...DEFAULT_SEED_DATA, settings };
  if (remote) return applyRemoteData(device, remote);
  const data = copyLocal ? withDeviceFields(copyLocal, deviceFields(device)) : device;
  return { data, revision: null, dirty: true };
}

export async function openCloudWorkspace(project: CloudProject, copyLocal?: AppData): Promise<CloudWorkspace | null> {
  const client = await getCloudClient(project);
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (!session) return null;
  const userId = session.user.id;
  let cacheBaseline: string | null = null;
  try { cacheBaseline = localStorage.getItem(cacheKey(project, userId)); } catch { /* Online use can continue. */ }
  const cached = decodeCloudCache(cacheBaseline);
  if (cacheBaseline !== null && !cached) {
    throw new Error('The saved copy on this browser could not be read. It has been kept for recovery.');
  }
  const initial = cached ?? initialCloudRecord(await readCloudRecord(client, userId), copyLocal);
  return { project, client, userId, email: session.user.email, initial, cacheBaseline };
}

// Compare-and-swap prevents stale devices from overwriting newer edits.
export async function writeCloudRecord(workspace: CloudWorkspace, record: CloudRecord, nextRevision: string, base?: RemoteRecord | null) {
  if (base && record.revision !== base.revision) return false;
  return writeSnapshot(workspace, cloudData(record.data), record.revision, nextRevision);
}

async function writeSnapshot(workspace: CloudWorkspace, snapshot: StoredSnapshot, revision: string | null, nextRevision: string) {
  const row = { snapshot, revision: nextRevision };
  const table = workspace.client.from(TABLE);
  const query = revision
    ? table.update(row).eq('user_id', workspace.userId).eq('revision', revision)
    : table.insert({ ...row, user_id: workspace.userId });
  const { data, error } = await query.select('revision').abortSignal(AbortSignal.timeout(10000)).maybeSingle();
  if (error?.code === '23505') return false;
  if (error) throw new Error(error.message);
  return data?.revision === nextRevision;
}

// Clears all data in the cloud workspace record while keeping user account & auth session active.
export async function clearCloudWorkspaceData(
  workspace: CloudWorkspace,
  clearedData: AppData,
  currentRevision?: string | null
): Promise<CloudRecord> {
  const nextRevision = crypto.randomUUID();
  const base = await readCloudRecord(workspace.client, workspace.userId);
  if (currentRevision !== undefined && currentRevision !== (base?.revision ?? null)) {
    throw new Error('The workspace changed on another device. Sync and try clearing again.');
  }
  const record = { data: clearedData, revision: base?.revision ?? null, dirty: false };
  if (!await writeSnapshot(workspace, cloudData(clearedData), record.revision, nextRevision)) {
    throw new Error('The workspace changed on another device. Sync and try clearing again.');
  }
  return { ...record, revision: nextRevision };
}
