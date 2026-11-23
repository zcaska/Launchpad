import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import { activateEconomy, commitTask, settlePastDays } from '../utils/castleEconomy';
import {
  cloudData, DEFAULT_CLOUD_PROJECT, readCloudRecord, validateCloudProject, writeCloudRecord,
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
const local = cloudData({
  ...DEFAULT_SEED_DATA,
  castleEconomy: economy,
  scratchpadText: 'Fixture note',
  reflections: [{ date: '2026-11-09', questions: ['Question'], answers: ['Answer'], taskTitles: ['Task'] }],
  settings: {
    ...DEFAULT_SEED_DATA.settings,
    openRouter: { ...DEFAULT_SEED_DATA.settings.openRouter, apiKey: 'fixture-secret' },
  },
});
assert.equal(local.scratchpadText, 'Fixture note');
assert.equal(local.reflections?.[0].answers[0], 'Answer');
assert.equal(local.settings.openRouter.apiKey, undefined);
assert.equal("googleCalendar" in local.settings, false);
assert.equal("calendarEvents" in local, false);
assert.deepEqual(local.castleEconomy, economy);

let row: { revision: string; snapshot: typeof local } | undefined;
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
assert.equal(first.data.scratchpadText, 'Fixture note');
assert.equal(first.data.reflections?.[0].answers[0], 'Answer');
assert.deepEqual(first.data.castleEconomy, economy, 'cloud write/read preserves castle ledger and commitments');
assert.equal(await readCloudRecord(client, userId, 'first'), null);
assert.equal(await writeCloudRecord(workspace, first, 'second'), true);
assert.equal(await writeCloudRecord(workspace, first, 'stale'), false);
assert.equal((await readCloudRecord(client, userId, 'first'))?.revision, 'second');

// Test clearCloudWorkspaceData
const clearedRecord = await clearCloudWorkspaceData(workspace, DEFAULT_SEED_DATA, 'second');
assert.equal(clearedRecord.data.quickNotes.length, 0);
assert.equal(clearedRecord.data.scratchpadText, '');
assert.equal(clearedRecord.dirty, false);
const cloudAfterClear = await readCloudRecord(client, userId);
assert(cloudAfterClear);
assert.equal(cloudAfterClear.data.quickNotes.length, 0);
assert.equal(cloudAfterClear.data.scratchpadText, '');

console.log('Cloud workspace validation, credential filtering, stale-write protection, and clear-data passed.');

// A later edit must survive both a direct write response and recovery from cache.
const original = { data: local, revision: cloudAfterClear.revision, dirty: true };
const sent = prepareCloudWrite(original);
assert(await writeCloudRecord(workspace, sent, sent.pendingRevision));
const edited = editCloudRecord(sent, { ...local, scratchpadText: 'Newer device note' });
const newest = editCloudRecord(edited, { ...local, scratchpadText: 'Latest device note' });
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
  assert.equal(acknowledgement.record.data.scratchpadText, 'Latest device note');
  assert.equal(acknowledgement.record.pendingRevision, undefined);
}

const recovered = reconcileCloudRevision(newest, committed.revision);
assert(recovered.action === 'queue');
const followUp = prepareCloudWrite(recovered.record);
assert.notEqual(followUp.pendingRevision, sent.pendingRevision);
assert(await writeCloudRecord(workspace, followUp, followUp.pendingRevision));
assert.equal((await readCloudRecord(client, userId))?.data.scratchpadText, 'Latest device note');
const completed = reconcileCloudRevision(followUp, followUp.pendingRevision);
assert(completed.action === 'synced');
assert.equal(completed.record.dirty, false);
assert.equal(completed.record.pendingRevision, undefined);

// A timed-out write may still commit after a retry reads the previous revision.
// Either write can win the compare-and-swap, but only its own snapshot can
// carry its token. An older winner advances the base and queues the latest edit.
const delayed = prepareCloudWrite(editCloudRecord(completed.record, { ...local, scratchpadText: 'Before timeout' }));
const postTimeoutEdit = editCloudRecord(delayed, { ...local, scratchpadText: 'After timeout' });
const oldRemote = await readCloudRecord(client, userId);
assert(oldRemote);
assert.equal(reconcileCloudRevision(postTimeoutEdit, oldRemote.revision).action, 'unchanged');
const retry = prepareCloudWrite(postTimeoutEdit);
assert.notEqual(retry.pendingRevision, delayed.pendingRevision, 'an edited retry must have its own token');
assert(await writeCloudRecord(workspace, delayed, delayed.pendingRevision));
assert.equal(await writeCloudRecord(workspace, retry, retry.pendingRevision), false);
const winner = await readCloudRecord(client, userId);
assert(winner);
assert.equal(winner.data.scratchpadText, 'Before timeout');
assert.equal(reconcileCloudRevision(retry, winner.revision).action, 'queue');
const anotherEdit = editCloudRecord(retry, { ...local, scratchpadText: 'Edit after the second attempt' });
const oldestAck = reconcileCloudRevision(anotherEdit, winner.revision);
assert(oldestAck.action === 'queue');
assert.equal(oldestAck.record.data.scratchpadText, 'Edit after the second attempt');
assert.equal(reconcileCloudRevision(oldestAck.record, retry.pendingRevision, 'response').action, 'superseded');

// Two tabs restore the same pending request. The second tab's edited retry
// reaches the server first and closes before the first tab observes its result.
const shared = prepareCloudWrite(editCloudRecord(winner, { ...winner.data, scratchpadText: 'Tab A' }));
saveCloudCache(workspace, shared);
const tabA = readCloudCache(project, userId);
const tabB = readCloudCache(project, userId);
assert(tabA?.pendingRevision && tabB?.pendingRevision);
assert.equal(tabA.pendingRevision, tabB.pendingRevision);
const tabBEdit = editCloudRecord(tabB, { ...local, scratchpadText: 'Tab B' });
const tabBSave = prepareCloudWrite(tabBEdit);
assert(await writeCloudRecord(workspace, tabBSave, tabBSave.pendingRevision));
assert.equal(await writeCloudRecord(workspace, tabA, tabA.pendingRevision), false);
const tabBRemote = await readCloudRecord(client, userId);
assert(tabBRemote);
assert.equal(tabBRemote.data.scratchpadText, 'Tab B');
assert.notEqual(tabBRemote.revision, tabA.pendingRevision);
assert.equal(reconcileCloudRevision(tabA, tabBRemote.revision).action, 'conflict');
assert.equal(reconcileCloudRevision(winner, tabBRemote.revision).action, 'download');
assert.equal(reconcileCloudRevision(tabBSave, tabBRemote.revision).action, 'synced');

// If a legacy snapshot needs repair on load, its old token still identifies
// the pre-repair payload. A retry of the repaired copy gets a fresh token.
saveCloudCache(workspace, { ...shared, data: {
  ...shared.data, dailyFocus: { ...shared.data.dailyFocus, date: '' },
} });
const repaired = readCloudCache(project, userId);
assert(repaired?.data.dailyFocus.date);
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

saveCloudCache(workspace, tabBRemote);
const offlineEdit = prepareCloudWrite(editCloudRecord(tabBRemote, { ...local, scratchpadText: 'Edit during quota failure' }));
cacheQuotaExceeded = true;
assert.equal(saveCloudCache(workspace, offlineEdit), false, 'Quota errors must report a failed offline save');
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, 'Tab B', 'The last durable snapshot remains available');
assert(await writeCloudRecord(workspace, offlineEdit, offlineEdit.pendingRevision));
const onlineCopy = await readCloudRecord(client, userId);
assert.equal(onlineCopy?.data.scratchpadText, 'Edit during quota failure', 'The newest edit still reaches the cloud');
const offlineAck = reconcileCloudRevision(offlineEdit, offlineEdit.pendingRevision, 'response');
assert(offlineAck.action === 'synced');
assert.equal(saveCloudCache(workspace, offlineAck.record), false, 'Remote acknowledgement does not imply a durable offline copy');
cacheQuotaExceeded = false;
assert.equal(saveCloudCache(workspace, offlineAck.record), true);
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, 'Edit during quota failure');
console.log('Offline cache failure signals, online saves and cache recovery passed.');

// Offline tabs can close before their writes reach the server. The older
// cache writer's edited branch must live in its own recovery slot.
const offlineWorkspace = { ...workspace, initial: offlineAck.record };
const offlineTabA = createCloudCacheWriter(offlineWorkspace);
const offlineTabB = createCloudCacheWriter(offlineWorkspace);
const offlineA = editCloudRecord(offlineAck.record, { ...local, scratchpadText: 'Offline tab A only' });
const offlineB = editCloudRecord(offlineAck.record, { ...local, scratchpadText: 'Offline tab B only' });
assert.equal(await offlineTabA.saveLocked(offlineA), 'saved');
assert.equal(await offlineTabB.saveLocked(offlineB), 'conflict');
assert.equal(readCloudCache(project, userId)?.data.scratchpadText, 'Offline tab A only');
const [offlineDraft] = readCloudConflictDrafts(offlineWorkspace);
assert.equal(offlineDraft?.data.scratchpadText, 'Offline tab B only');
assert.deepEqual(readCloudConflictDrafts({ ...offlineWorkspace, userId: 'other-user' }), []);
removeCloudConflictDraft(offlineWorkspace, offlineDraft.key);
assert.deepEqual(readCloudConflictDrafts(offlineWorkspace), []);
console.log('Offline tabs preserve separate conflicting edits on the same device.');
