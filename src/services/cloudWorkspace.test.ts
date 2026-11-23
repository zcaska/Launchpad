import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { sanitizeAppData, STORAGE_KEY } from '../utils/storage';
import type { AppData } from '../types';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import { activateEconomy, commitTask, settlePastDays } from '../utils/castleEconomy';
import {
  applyRemoteTasks, initialCloudRecord, cloudData, DEFAULT_CLOUD_PROJECT, readCloudRecord, validateCloudProject, writeCloudRecord,
  clearCloudWorkspaceData, editCloudRecord, prepareCloudWrite, reconcileCloudRevision,
  readCloudCache, saveCloudCache, type CloudWorkspace,
  createCloudCacheWriter, readCloudConflictDrafts, removeCloudConflictDraft,
} from './cloudWorkspace';

const project = DEFAULT_CLOUD_PROJECT;
assert.deepEqual(validateCloudProject(project.name, project.url, project.key), project);
assert.throws(() => validateCloudProject('Project', 'https://supabase.co.attacker.test', project.key));
assert.throws(() => validateCloudProject('Project', project.url, 'sb_secret_test'));

let economy = activateEconomy(5000, '2026-11-10');
economy = commitTask(economy, { id: 'castle-task', title: 'Draft', date: '2026-11-10', estimatedValueCents: 2000 });
economy = settlePastDays(economy, '2026-11-11');
const local = sanitizeAppData({
  ...DEFAULT_SEED_DATA,
  quickNotes: [{ id: 'test', text: 'Fixture task', isDone: false, createdAt: 1, subtasks: [{ id: 'step', text: 'First step', isDone: false }] }],
  castleEconomy: economy,
  scratchpadText: 'Fixture note',
  reflections: [{ date: '2026-11-09', questions: ['Question'], answers: ['Answer'], taskTitles: ['Task'] }],
  settings: {
    ...DEFAULT_SEED_DATA.settings,
    openRouter: { ...DEFAULT_SEED_DATA.settings.openRouter, apiKey: 'fixture-secret' },
  },
}, false);
assert.equal(local.scratchpadText, 'Fixture note');
assert.equal(local.reflections?.[0].answers[0], 'Answer');
assert.equal(local.settings.openRouter.apiKey, 'fixture-secret');
assert.deepEqual(Object.keys(cloudData(local)).sort(), [
  'castleEconomy', 'dailyFocus', 'gamification', 'growthHistory', 'quickNotes', 'reflections', 'syncFormat', 'version',
]);
assert.equal('settings' in cloudData(local), false);
assert.equal('scratchpadText' in cloudData(local), false);
assert.equal("googleCalendar" in local.settings, false);
assert.equal("calendarEvents" in local, false);
assert.deepEqual(local.castleEconomy, economy);

function withTitle(device: AppData, text: string): AppData {
  return { ...device, quickNotes: [{ ...local.quickNotes[0], text }] };
}
let row: { revision: string; snapshot: ReturnType<typeof cloudData> | (AppData & { syncFormat?: number }) } | undefined;
const userId = '61000000-0000-4000-8000-000000000001';
const client = createClient(project.url, project.key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/rest/v1/launchpad_workspaces');
      const method = init?.method;
      const data = init?.body ? JSON.parse(String(init.body)) : undefined;
      const revision = url.searchParams.get('revision');
      if (method === 'POST') {
        assert.equal(data.user_id, userId);
        if (row) return Response.json({ code: '23505', message: 'Already exists' }, { status: 409 });
        row = data;
      } else {
        assert.equal(url.searchParams.get('user_id'), `eq.${userId}`);
        if (method === 'PATCH') {
          if (!row || (revision && revision !== `eq.${row.revision}`)) return Response.json([]);
          row = data;
        }
      }
      return Response.json(row && revision !== `neq.${row.revision}` ? [row] : []);
    },
  },
});

const workspace: CloudWorkspace = {
  project, client, userId, initial: { data: local, revision: null, dirty: true },
};
const cache = new Map<string, string>();
let cacheQuotaExceeded = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => cache.get(key) ?? null,
  get length() { return cache.size; },
  key: (index: number) => [...cache.keys()][index] ?? null,
  removeItem: (key: string) => { cache.delete(key); },
  setItem: (key: string, value: string) => {
    if (cacheQuotaExceeded) throw new DOMException('Fixture storage quota exceeded', 'QuotaExceededError');
    cache.set(key, value);
  },
} });
assert.equal(await readCloudRecord(client, userId), null);
assert.equal(await writeCloudRecord(workspace, workspace.initial, 'first'), true);
assert.equal(await writeCloudRecord(workspace, workspace.initial, 'duplicate'), false);
const first = await readCloudRecord(client, userId);
assert(first);
assert.deepEqual(first.data, cloudData(local));
assert.deepEqual(Object.keys(first.snapshot).sort(), [
  'castleEconomy', 'dailyFocus', 'gamification', 'growthHistory', 'quickNotes', 'reflections', 'syncFormat', 'version',
], 'a new row contains shared tasks and progress');
assert.deepEqual(first.data.castleEconomy, economy, 'castle state, purchases, and ledger sync');
assert.equal('scratchpadText' in first.snapshot, false, 'scratchpad notes stay device-local');
assert.equal('settings' in first.snapshot, false, 'theme and appearance settings stay device-local');
assert.equal(await readCloudRecord(client, userId, 'first'), null);
assert.equal(await writeCloudRecord(workspace, applyRemoteTasks(local, first), 'second'), true);
assert.equal(await writeCloudRecord(workspace, applyRemoteTasks(local, first), 'stale'), false);
assert.equal((await readCloudRecord(client, userId, 'first'))?.revision, 'second');

// Test clearCloudWorkspaceData
const clearedRecord = await clearCloudWorkspaceData(workspace, DEFAULT_SEED_DATA, 'second');
assert.equal(clearedRecord.data.quickNotes.length, 0);
assert.equal(clearedRecord.data.scratchpadText, '');
assert.equal(clearedRecord.dirty, false);
const cloudAfterClear = await readCloudRecord(client, userId);
assert(cloudAfterClear);
assert.equal(cloudAfterClear.data.quickNotes.length, 0);
assert.equal('scratchpadText' in cloudAfterClear.data, false);

console.log('Cloud workspace validation, credential filtering, stale-write protection, and clear-data passed.');

// A later edit must survive both a direct write response and recovery from cache.
const original = { data: local, revision: cloudAfterClear.revision, dirty: true };
const sent = prepareCloudWrite(original);
assert(await writeCloudRecord(workspace, sent, sent.pendingRevision));
const edited = editCloudRecord(sent, withTitle(local, 'Newer device note'));
const newest = editCloudRecord(edited, withTitle(local, 'Latest device note'));
const committed = await readCloudRecord(client, userId);
assert(committed);
saveCloudCache(workspace, newest);
const restored = readCloudCache(project, userId);
assert(restored);
assert.equal(readCloudCache(project, 'different-user'), null);
for (const [device, revision, source] of [
  [restored, committed.revision, 'remote'],
  [newest, sent.pendingRevision, 'response'],
] as const) {
  const acknowledgement = reconcileCloudRevision(device, revision, source);
  assert.equal(acknowledgement.action, 'queue', 'acknowledging the first save must queue the latest edit');
  assert(acknowledgement.action === 'queue');
  assert.equal(acknowledgement.record.revision, sent.pendingRevision);
  assert.equal(acknowledgement.record.dirty, true);
  assert.equal(acknowledgement.record.data.quickNotes[0].text, 'Latest device note');
  assert.equal(acknowledgement.record.pendingRevision, undefined);
}

const recovered = reconcileCloudRevision(newest, committed.revision);
assert(recovered.action === 'queue');
const followUp = prepareCloudWrite(recovered.record);
assert.notEqual(followUp.pendingRevision, sent.pendingRevision);
assert(await writeCloudRecord(workspace, followUp, followUp.pendingRevision));
assert.equal((await readCloudRecord(client, userId))?.data.quickNotes[0].text, 'Latest device note');
const completed = reconcileCloudRevision(followUp, followUp.pendingRevision);
assert(completed.action === 'synced');
assert.equal(completed.record.dirty, false);
assert.equal(completed.record.pendingRevision, undefined);

// A timed-out write may still commit after a retry reads the previous revision.
// Either write can win the compare-and-swap, but only its own snapshot can
// carry its token. An older winner advances the base and queues the latest edit.
const delayed = prepareCloudWrite(editCloudRecord(completed.record, withTitle(local, 'Before timeout')));
const postTimeoutEdit = editCloudRecord(delayed, withTitle(local, 'After timeout'));
const oldRemote = await readCloudRecord(client, userId);
assert(oldRemote);
assert.equal(reconcileCloudRevision(postTimeoutEdit, oldRemote.revision).action, 'unchanged');
const retry = prepareCloudWrite(postTimeoutEdit);
assert.notEqual(retry.pendingRevision, delayed.pendingRevision, 'an edited retry must have its own token');
assert(await writeCloudRecord(workspace, delayed, delayed.pendingRevision));
assert.equal(await writeCloudRecord(workspace, retry, retry.pendingRevision), false);
const winner = await readCloudRecord(client, userId);
assert(winner);
assert.equal(winner.data.quickNotes[0].text, 'Before timeout');
assert.equal(reconcileCloudRevision(retry, winner.revision).action, 'queue');
const anotherEdit = editCloudRecord(retry, withTitle(local, 'Edit after the second attempt'));
const oldestAck = reconcileCloudRevision(anotherEdit, winner.revision);
assert(oldestAck.action === 'queue');
assert.equal(oldestAck.record.data.quickNotes[0].text, 'Edit after the second attempt');
assert.equal(reconcileCloudRevision(oldestAck.record, retry.pendingRevision, 'response').action, 'superseded');

// Two tabs restore the same pending request. The second tab's edited retry
// reaches the server first and closes before the first tab observes its result.
const shared = prepareCloudWrite(editCloudRecord(applyRemoteTasks(local, winner), withTitle(local, 'Tab A')));
saveCloudCache(workspace, shared);
const tabA = readCloudCache(project, userId);
const tabB = readCloudCache(project, userId);
assert(tabA?.pendingRevision && tabB?.pendingRevision);
assert.equal(tabA.pendingRevision, tabB.pendingRevision);
const tabBEdit = editCloudRecord(tabB, withTitle(local, 'Tab B'));
const tabBSave = prepareCloudWrite(tabBEdit);
assert(await writeCloudRecord(workspace, tabBSave, tabBSave.pendingRevision));
assert.equal(await writeCloudRecord(workspace, tabA, tabA.pendingRevision), false);
const tabBRemote = await readCloudRecord(client, userId);
assert(tabBRemote);
assert.equal(tabBRemote.data.quickNotes[0].text, 'Tab B');
assert.notEqual(tabBRemote.revision, tabA.pendingRevision);
assert.equal(reconcileCloudRevision(tabA, tabBRemote.revision).action, 'conflict');
assert.equal(reconcileCloudRevision(applyRemoteTasks(local, winner), tabBRemote.revision).action, 'download');
assert.equal(reconcileCloudRevision(tabBSave, tabBRemote.revision).action, 'synced');

// If a legacy snapshot needs repair on load, its old token still identifies
// the pre-repair payload. A retry of the repaired copy gets a fresh token.
saveCloudCache(workspace, { ...shared, data: {
  ...shared.data, quickNotes: [{ ...shared.data.quickNotes[0], id: '' }],
} });
const repaired = readCloudCache(project, userId);
assert(repaired?.data.quickNotes[0].id);
assert.notEqual(prepareCloudWrite(repaired).pendingRevision, shared.pendingRevision);
assert.equal(reconcileCloudRevision(repaired, shared.pendingRevision).action, 'queue');

assert.equal(reconcileCloudRevision(newest, 'another-device').action, 'conflict');
assert.equal(reconcileCloudRevision(followUp, sent.pendingRevision, 'response').action, 'superseded');
assert.equal(reconcileCloudRevision(completed.record, sent.pendingRevision, 'response').action, 'superseded');

// Older clients retained a pending token only while the data still matched its write.
const legacy = { data: local, revision: 'prior', pendingRevision: 'legacy-save', dirty: true };
const legacyAck = reconcileCloudRevision(legacy, 'legacy-save');
assert(legacyAck.action === 'synced');
assert.equal(legacyAck.record.dirty, false);
assert.equal(reconcileCloudRevision(original, original.revision).action, 'unchanged');
console.log('Cloud revision recovery, queued edits, uncertain retries and superseded acknowledgements passed.');

saveCloudCache(workspace, applyRemoteTasks(local, tabBRemote));
const offlineEdit = prepareCloudWrite(editCloudRecord(applyRemoteTasks(local, tabBRemote), withTitle(local, 'Edit during quota failure')));
cacheQuotaExceeded = true;
assert.equal(saveCloudCache(workspace, offlineEdit), false, 'Quota errors must report a failed offline save');
assert.equal(readCloudCache(project, userId)?.data.quickNotes[0].text, 'Tab B', 'The last durable snapshot remains available');
assert(await writeCloudRecord(workspace, offlineEdit, offlineEdit.pendingRevision));
const onlineCopy = await readCloudRecord(client, userId);
assert.equal(onlineCopy?.data.quickNotes[0].text, 'Edit during quota failure', 'The newest edit still reaches the cloud');
const offlineAck = reconcileCloudRevision(offlineEdit, offlineEdit.pendingRevision, 'response');
assert(offlineAck.action === 'synced');
assert.equal(saveCloudCache(workspace, offlineAck.record), false, 'Remote acknowledgement does not imply a durable offline copy');
cacheQuotaExceeded = false;
assert.equal(saveCloudCache(workspace, offlineAck.record), true);
assert.equal(readCloudCache(project, userId)?.data.quickNotes[0].text, 'Edit during quota failure');
console.log('Offline cache failure signals, online saves and cache recovery passed.');

// Offline tabs can close before their writes reach the server. The older
// cache writer's edited branch must live in its own recovery slot.
const offlineWorkspace = { ...workspace, initial: offlineAck.record };
const offlineTabA = createCloudCacheWriter(offlineWorkspace);
const offlineTabB = createCloudCacheWriter(offlineWorkspace);
const offlineA = editCloudRecord(offlineAck.record, withTitle(local, 'Offline tab A only'));
const offlineB = editCloudRecord(offlineAck.record, withTitle(local, 'Offline tab B only'));
assert.equal(await offlineTabA.saveLocked(offlineA), 'saved');
assert.equal(await offlineTabB.saveLocked(offlineB), 'conflict');
assert.equal(readCloudCache(project, userId)?.data.quickNotes[0].text, 'Offline tab A only');
const [offlineDraft] = readCloudConflictDrafts(offlineWorkspace);
assert.equal(offlineDraft?.data.quickNotes[0].text, 'Offline tab B only');
assert.deepEqual(readCloudConflictDrafts({ ...offlineWorkspace, userId: 'other-user' }), []);
removeCloudConflictDraft(offlineWorkspace, offlineDraft.key);
assert.deepEqual(readCloudConflictDrafts(offlineWorkspace), []);
console.log('Offline tabs preserve separate conflicting edits on the same device.');

// Two devices keep independent preferences through first sign-in, edits, and later downloads.
const oldDevice = { ...local, settings: { ...local.settings, theme: 'dark' as const } };
row = { revision: 'before-upgrade', snapshot: oldDevice };
const oldRow = await readCloudRecord(client, userId);
assert(oldRow);
const deviceSettings = { ...DEFAULT_SEED_DATA.settings, theme: 'light' as const };
const deviceLocal = { ...local, settings: { ...local.settings, theme: deviceSettings.theme } };
cache.set(STORAGE_KEY, JSON.stringify(deviceLocal));
const fresh = initialCloudRecord(oldRow);
assert.equal(fresh.data.settings.theme, 'light');
assert.equal(fresh.data.settings.openRouter.apiKey, deviceSettings.openRouter.apiKey);
assert.deepEqual(fresh.data.castleEconomy, economy, 'pre-upgrade history is recoverable on first open');
const phone = { ...fresh.data, settings: { ...deviceSettings, compactView: !deviceSettings.compactView }, scratchpadText: 'Private phone note' };
const localEdit = editCloudRecord(fresh, phone);
assert.equal(localEdit.dirty, false);
assert.equal(localEdit.revision, oldRow.revision);
const queued = prepareCloudWrite(editCloudRecord(localEdit, withTitle(phone, 'Phone task')));
const duringWrite = editCloudRecord(queued, { ...queued.data, scratchpadText: 'Typing while saving' });
assert.equal(duringWrite.pendingRevision, queued.pendingRevision);
assert(await writeCloudRecord(workspace, queued, queued.pendingRevision, oldRow));
const remoteEdit = await readCloudRecord(client, userId);
assert(remoteEdit);
assert.equal(remoteEdit.snapshot.syncFormat, 2, 'CAS writes update snapshot to Format 2');
assert.equal('settings' in remoteEdit.snapshot, false, 'settings are not synced to cloud in Format 2');
assert.equal('scratchpadText' in remoteEdit.snapshot, false, 'scratchpad is not synced to cloud in Format 2');
assert.deepEqual(remoteEdit.snapshot.castleEconomy, economy, 'castle state, purchases, and ledger are synced in Format 2');
const desktop = applyRemoteTasks(local, remoteEdit);
assert.equal(desktop.data.quickNotes[0].text, 'Phone task');
assert.equal(desktop.data.settings, local.settings, 'desktop settings (theme) remain untouched');
assert.equal(desktop.data.scratchpadText, local.scratchpadText, 'desktop scratchpad remains untouched');
assert.deepEqual(desktop.data.castleEconomy, economy, 'desktop receives synced castle economy');
const restoreOwn = reconcileCloudRevision(duringWrite, queued.pendingRevision);
assert(restoreOwn.action === 'synced' && restoreOwn.record.data.scratchpadText === 'Typing while saving');
const emptyAccount = initialCloudRecord(null);
assert.deepEqual(emptyAccount.data.quickNotes, []);
const copied = initialCloudRecord(null, deviceLocal).data;
assert.deepEqual(copied.quickNotes, local.quickNotes);
assert.deepEqual(copied.castleEconomy, local.castleEconomy, 'copy local includes castle state, purchases, and ledger');
assert.equal(copied.scratchpadText, '', 'scratchpad starts fresh on the new cloud account');
assert.equal(copied.settings.openRouter.apiKey, DEFAULT_SEED_DATA.settings.openRouter.apiKey);
assert.equal(emptyAccount.data.settings.theme, 'light');
assert.equal(emptyAccount.data.castleEconomy, undefined);
cache.set(STORAGE_KEY, '{unreadable');
assert.equal(initialCloudRecord(oldRow).data.settings.theme, DEFAULT_SEED_DATA.settings.theme);
assert.equal(cache.get(STORAGE_KEY), '{unreadable', 'opening a cloud account preserves a damaged local workspace for recovery');

saveCloudCache(workspace, desktop);
const cleanWorkspace = { ...workspace, initial: desktop };
const firstWriter = createCloudCacheWriter(cleanWorkspace);
const secondWriter = createCloudCacheWriter(cleanWorkspace);
const firstDraft = editCloudRecord(desktop, { ...desktop.data, scratchpadText: 'First tab private note' });
const secondDraft = editCloudRecord(desktop, { ...desktop.data, scratchpadText: 'Second tab private note' });
assert.equal(firstDraft.dirty, false);
assert.equal(await firstWriter.saveLocked(firstDraft), 'saved');
assert.equal(await secondWriter.saveLocked(secondDraft), 'conflict');
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, 'First tab private note');
assert.equal(readCloudConflictDrafts(cleanWorkspace)[0].data.scratchpadText, 'Second tab private note');
const newDownload = applyRemoteTasks(desktop.data, { ...remoteEdit, revision: 'new-download', data: cloudData(withTitle(local, 'New task title')) });
assert.equal(secondWriter.save(newDownload), 'saved');
const mergedCache = readCloudCache(project, userId);
assert.equal(mergedCache?.data.quickNotes[0].text, 'New task title');
assert.equal(mergedCache?.data.scratchpadText, 'First tab private note', 'download preserves another tab’s local-only edit');
const personalEdit = editCloudRecord(newDownload, { ...newDownload.data, settings: deviceSettings });
assert.equal(secondWriter.save(personalEdit), 'saved', 'independent settings edits continue after a download');
const taskEdit = editCloudRecord(personalEdit, withTitle(personalEdit.data, 'Later task title'));
assert.equal(secondWriter.save(taskEdit), 'saved');
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, 'First tab private note');
assert.equal(readCloudCache(project, userId)?.data.quickNotes[0].text, 'Later task title');
const overlappingEdit = editCloudRecord(taskEdit, { ...taskEdit.data, scratchpadText: 'Both tabs edited this note' });
assert.equal(secondWriter.save(overlappingEdit), 'conflict');
secondWriter.beginReplacement();
assert.equal(secondWriter.save({ data: DEFAULT_SEED_DATA, revision: 'cleared', dirty: false }), 'saved');
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, '', 'confirmed clear removes rebased private fields');
assert.equal(readCloudConflictDrafts(cleanWorkspace)[0].data.scratchpadText, 'Both tabs edited this note', 'clear preserves the independent recovery copy');
const staleNote = editCloudRecord(firstDraft, { ...firstDraft.data, scratchpadText: 'Earlier unsaved note' });
assert.equal(firstWriter.save(staleNote), 'conflict');
firstWriter.beginReplacement();
assert.equal(firstWriter.save({ data: DEFAULT_SEED_DATA, revision: 'stale-clear', dirty: false }), 'conflict');
assert.deepEqual(readCloudConflictDrafts(cleanWorkspace).map(draft => draft.data.scratchpadText).sort(),
  ['', 'Both tabs edited this note', 'Earlier unsaved note'], 'stale clear creates a separate recovery draft');
assert.equal(readCloudCache(project, userId)?.revision, 'cleared', 'stale clear leaves the latest primary untouched');
await assert.rejects(clearCloudWorkspaceData(workspace, DEFAULT_SEED_DATA, 'stale'), /changed on another device/);
assert.deepEqual((await readCloudRecord(client, userId))?.snapshot.castleEconomy, economy);
await clearCloudWorkspaceData(workspace, DEFAULT_SEED_DATA, remoteEdit.revision);
assert.deepEqual((await readCloudRecord(client, userId))?.snapshot, cloudData(DEFAULT_SEED_DATA), 'explicit clear removes archived legacy history');
console.log('Task and progress sync, device-local settings, legacy history, explicit clear, and private offline drafts passed.');
