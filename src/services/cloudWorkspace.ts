import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import { sanitizeAppData } from '../utils/storage';

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
}

export interface CloudWorkspace {
  project: CloudProject;
  client: SupabaseClient;
  userId: string;
  email?: string;
  initial: CloudRecord;
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

// Copy only durable workspace fields. Provider credentials and caches stay on this device.
export function cloudData(data: AppData): AppData {
  const { theme, clockFormat, showQuotes, openInNewTab, compactView, daySchedule,
    activeMode, confettiStyle, pet } = data.settings;
  return {
    version: data.version,
    quickNotes: data.quickNotes,
    scratchpadText: data.scratchpadText,
    dailyFocus: data.dailyFocus,
    learnedPreferences: data.learnedPreferences,
    gamification: data.gamification,
    growthHistory: data.growthHistory,
    reflections: data.reflections,
    settings: {
      theme, clockFormat, showQuotes, openInNewTab, compactView, daySchedule,
      activeMode, confettiStyle, pet,
      openRouter: { ...DEFAULT_SEED_DATA.settings.openRouter, apiKey: undefined },
    },
  };
}

function decodeSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object' || !('version' in snapshot)
      || snapshot.version !== DEFAULT_SEED_DATA.version
      || !('quickNotes' in snapshot) || !Array.isArray(snapshot.quickNotes)) {
    throw new Error('This cloud workspace has an unsupported data format.');
  }
  return cloudData(sanitizeAppData(snapshot, false));
}

function cacheKey(project: CloudProject, userId: string) {
  return `launchpad_cloud_cache_v1:${project.url}:${userId}`;
}

function readCache(project: CloudProject, userId: string): CloudRecord | null {
  try {
    const raw = localStorage.getItem(cacheKey(project, userId));
    if (!raw) return null;
    const record: CloudRecord = JSON.parse(raw);
    return { ...record, data: decodeSnapshot(record.data) };
  } catch {
    return null;
  }
}

export function saveCloudCache(workspace: CloudWorkspace, record: CloudRecord) {
  try {
    localStorage.setItem(cacheKey(workspace.project, workspace.userId), JSON.stringify(record));
  } catch {
    // Ignore in non-browser or quota-restricted environments
  }
}

export async function readCloudRecord(client: SupabaseClient, userId: string, unchangedRevision?: string) {
  const query = client.from(TABLE).select('revision,snapshot').eq('user_id', userId);
  if (unchangedRevision) query.neq('revision', unchangedRevision);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(10000)).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { data: decodeSnapshot(data.snapshot), revision: data.revision, dirty: false } : null;
}

export async function openCloudWorkspace(project: CloudProject, copyLocal?: AppData): Promise<CloudWorkspace | null> {
  const client = await getCloudClient(project);
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (!session) return null;
  const userId = session.user.id;
  const cached = readCache(project, userId);
  const initial = cached ?? await readCloudRecord(client, userId) ?? {
    data: cloudData(copyLocal ?? DEFAULT_SEED_DATA), revision: null, dirty: true,
  };
  return { project, client, userId, email: session.user.email, initial };
}

// Compare-and-swap prevents stale devices from overwriting newer edits.
export async function writeCloudRecord(workspace: CloudWorkspace, record: CloudRecord, nextRevision: string) {
  const row = { snapshot: record.data, revision: nextRevision };
  const table = workspace.client.from(TABLE);
  const query = record.revision
    ? table.update(row).eq('user_id', workspace.userId).eq('revision', record.revision)
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
  const nextData = cloudData(clearedData);
  const row = { snapshot: nextData, revision: nextRevision };
  const table = workspace.client.from(TABLE);

  let updatedRevision: string | undefined;

  // Try conditional update if current revision provided
  if (currentRevision) {
    const { data, error } = await table
      .update(row)
      .eq('user_id', workspace.userId)
      .eq('revision', currentRevision)
      .select('revision')
      .abortSignal(AbortSignal.timeout(10000))
      .maybeSingle();
    if (!error && data?.revision) {
      updatedRevision = data.revision;
    }
  }

  // If conditional update was not performed or didn't match, force update by user_id
  if (!updatedRevision) {
    const { data, error } = await table
      .update(row)
      .eq('user_id', workspace.userId)
      .select('revision')
      .abortSignal(AbortSignal.timeout(10000))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.revision) {
      updatedRevision = data.revision;
    }
  }

  // If no record existed yet for this user in the table, insert it
  if (!updatedRevision) {
    const { data, error } = await table
      .insert({ ...row, user_id: workspace.userId })
      .select('revision')
      .abortSignal(AbortSignal.timeout(10000))
      .single();
    if (error) throw new Error(error.message);
    updatedRevision = data.revision;
  }

  const record: CloudRecord = {
    data: nextData,
    revision: updatedRevision ?? nextRevision,
    dirty: false,
  };
  saveCloudCache(workspace, record);
  return record;
}
