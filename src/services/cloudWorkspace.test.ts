import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SEED_DATA } from '../data/seedData';
import {
  cloudData, DEFAULT_CLOUD_PROJECT, readCloudRecord, validateCloudProject, writeCloudRecord,
  clearCloudWorkspaceData, type CloudWorkspace,
} from './cloudWorkspace';

const project = DEFAULT_CLOUD_PROJECT;
assert.deepEqual(validateCloudProject(project.name, project.url, project.key), project);
assert.throws(() => validateCloudProject('Project', 'https://supabase.co.attacker.test', project.key));
assert.throws(() => validateCloudProject('Project', project.url, 'sb_secret_test'));

const local = cloudData({
  ...DEFAULT_SEED_DATA,
  scratchpadText: 'Fixture note',
  reflections: [{ date: '2026-11-09', questions: ['Question'], answers: ['Answer'], taskTitles: ['Task'] }],
  settings: {
    ...DEFAULT_SEED_DATA.settings,
    openRouter: { ...DEFAULT_SEED_DATA.settings.openRouter, apiKey: 'fixture-secret' },
    googleCalendar: DEFAULT_SEED_DATA.settings.googleCalendar,
  },
});
assert.equal(local.scratchpadText, 'Fixture note');
assert.equal(local.reflections?.[0].answers[0], 'Answer');
assert.equal(local.settings.openRouter.apiKey, undefined);
assert.equal(local.settings.googleCalendar, undefined);
assert.equal(local.calendarEvents, undefined);

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
assert.equal(await readCloudRecord(client, userId), null);
assert.equal(await writeCloudRecord(workspace, workspace.initial, 'first'), true);
assert.equal(await writeCloudRecord(workspace, workspace.initial, 'duplicate'), false);
const first = await readCloudRecord(client, userId);
assert(first);
assert.equal(first.data.scratchpadText, 'Fixture note');
assert.equal(first.data.reflections?.[0].answers[0], 'Answer');
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
