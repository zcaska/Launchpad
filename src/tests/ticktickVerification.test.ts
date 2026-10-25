import {
  validateToken,
  getProjects,
  getProjectTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from '../services/ticktickService';
import {
  mapQuickNoteToTickTick,
  mapTickTickToQuickNote,
  reconcileTasks,
} from '../utils/ticktickSync';
import type { QuickNote, TickTickSettings } from '../types';
import type { TickTickProject, TickTickTask } from '../types/ticktick';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion FAILED: ${message} (expected ${expected}, got ${actual})`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('\n=== RUNNING TICKTICK END-TO-END VERIFICATION TEST SUITE ===\n');

async function runVerification() {
  const originalFetch = globalThis.fetch;

  // In-memory mock server state for TickTick API
  let mockServerProjects: TickTickProject[] = [
    { id: 'proj_inbox', name: 'Inbox', sortOrder: 0 },
    { id: 'proj_work', name: 'Work Projects', color: '#4CAF50', sortOrder: 1 },
    { id: 'proj_personal', name: 'Personal Life', color: '#2196F3', sortOrder: 2 },
  ];

  let mockServerTasks: Map<string, TickTickTask> = new Map([
    [
      'task_init_1',
      {
        id: 'task_init_1',
        projectId: 'proj_work',
        title: 'Complete architecture review',
        content: 'Review the two-way sync RFC',
        priority: 5,
        status: 0,
        dueDate: '2026-10-30T18:00:00.000Z',
        createdTime: '2026-10-25T10:00:00.000Z',
        modifiedTime: '2026-10-25T12:00:00.000Z',
      },
    ],
  ]);

  let currentToken = 'valid_oauth_token_123';
  let shouldFailNetwork = false;
  let lastRequest: { method: string; url: string; body?: any; headers?: any } = {
    method: '',
    url: '',
  };

  // Mock global fetch simulating TickTick REST API endpoints
  globalThis.fetch = (async (urlInput: string | URL | Request, options?: any) => {
    const url = String(urlInput);
    const method = options?.method || 'GET';
    const authHeader = options?.headers?.Authorization || '';
    const body = options?.body ? JSON.parse(options.body) : undefined;

    lastRequest = { method, url, body, headers: options?.headers };

    if (shouldFailNetwork) {
      throw new Error('Network offline or DNS resolution failed');
    }

    // Check Auth
    if (!authHeader.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== currentToken) {
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid or expired OAuth token',
        json: async () => ({ error: 'unauthorized' }),
      } as Response;
    }

    // Profile endpoint
    if (url.includes('/open/v1/user/profile') || url.includes('/user/profile')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ username: 'launchpad_tester', email: 'tester@launchpad.dev' }),
      } as Response;
    }

    // Projects list endpoint
    if (url.endsWith('/open/v1/project') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => mockServerProjects,
      } as Response;
    }

    // Project tasks endpoint: /open/v1/project/{id}/data
    const projectDataMatch = url.match(/\/open\/v1\/project\/([^/]+)\/data/);
    if (projectDataMatch && method === 'GET') {
      const projId = decodeURIComponent(projectDataMatch[1]);
      const tasks = Array.from(mockServerTasks.values()).filter((t) => t.projectId === projId);
      return {
        ok: true,
        status: 200,
        json: async () => ({ tasks }),
      } as Response;
    }

    // Complete task: /open/v1/project/{projId}/task/{taskId}/complete
    const completeMatch = url.match(/\/open\/v1\/project\/([^/]+)\/task\/([^/]+)\/complete/);
    if (completeMatch && method === 'POST') {
      const taskId = decodeURIComponent(completeMatch[2]);
      const task = mockServerTasks.get(taskId);
      if (task) {
        task.status = 2;
        task.modifiedTime = new Date().toISOString();
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    }

    // Delete task: /open/v1/project/{projId}/task/{taskId}
    const deleteMatch = url.match(/\/open\/v1\/project\/([^/]+)\/task\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const taskId = decodeURIComponent(deleteMatch[2]);
      mockServerTasks.delete(taskId);
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    }

    // Update task: /open/v1/task/{taskId}
    const updateMatch = url.match(/\/open\/v1\/task\/([^/]+)$/);
    if (updateMatch && method === 'POST') {
      const taskId = decodeURIComponent(updateMatch[1]);
      const existing = mockServerTasks.get(taskId) || { id: taskId, projectId: 'proj_inbox', title: '', priority: 0, status: 0 };
      const updated = { ...existing, ...body, modifiedTime: new Date().toISOString() };
      mockServerTasks.set(taskId, updated);
      return {
        ok: true,
        status: 200,
        json: async () => updated,
      } as Response;
    }

    // Create task: /open/v1/task
    if (url.endsWith('/open/v1/task') && method === 'POST') {
      const newId = `tt_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const created: TickTickTask = {
        id: newId,
        projectId: body.projectId || 'proj_inbox',
        title: body.title || 'Untitled',
        content: body.content,
        priority: body.priority || 0,
        status: body.status || 0,
        dueDate: body.dueDate,
        items: body.items,
        createdTime: new Date().toISOString(),
        modifiedTime: new Date().toISOString(),
      };
      mockServerTasks.set(newId, created);
      return {
        ok: true,
        status: 200,
        json: async () => created,
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      text: async () => 'Not Found',
      json: async () => ({ error: 'not found' }),
    } as Response;
  }) as typeof fetch;

  try {
    // =========================================================================
    // 1. Token Validation and Project Discovery via ticktickService
    // =========================================================================
    console.log('--- 1. Token Validation & Project Discovery ---');
    {
      // 1.1 Empty or whitespace token
      const emptyRes = await validateToken('   ');
      assertEqual(emptyRes.success, false, 'Validation fails on whitespace token');
      assert(Boolean(emptyRes.error), 'Provides error message on empty token');

      // 1.2 Invalid / expired token
      const invalidRes = await validateToken('expired_or_corrupt_token');
      assertEqual(invalidRes.success, false, 'Validation fails on invalid token');
      assert(invalidRes.error?.includes('401') === true, 'Error message indicates 401 Unauthorized');

      // 1.3 Valid token
      const validRes = await validateToken('valid_oauth_token_123');
      assertEqual(validRes.success, true, 'Validation succeeds on valid token');
      assertEqual(validRes.username, 'launchpad_tester', 'Extracts correct username');

      // 1.4 Project discovery
      const projects = await getProjects('valid_oauth_token_123');
      assertEqual(projects.length, 3, 'Discovered 3 projects');
      assertEqual(projects[0].name, 'Inbox', 'Discovered Inbox project');
      assertEqual(projects[1].name, 'Work Projects', 'Discovered Work project');
      assertEqual(projects[2].name, 'Personal Life', 'Discovered Personal project');

      // 1.5 Fetch project tasks
      const workTasks = await getProjectTasks('valid_oauth_token_123', 'proj_work');
      assertEqual(workTasks.length, 1, 'Found initial task in Work project');
      assertEqual(workTasks[0].title, 'Complete architecture review', 'Initial task title matches');
    }

    // =========================================================================
    // 2. Mapping Local QuickNote to TickTick Schema
    // =========================================================================
    console.log('\n--- 2. Schema Mapping (QuickNote <-> TickTick) ---');
    {
      const localNote: QuickNote = {
        id: 'note_launchpad_1',
        text: 'Prepare sprint demo presentation',
        description: 'Include slides on TickTick sync architecture and verification',
        isDone: false,
        createdAt: 1730000000000,
        deadline: '2026-10-31',
        priority: 'high',
        subtasks: [
          { id: 'sub_1', text: 'Draft overview slide', isDone: true },
          { id: 'sub_2', text: 'Record sync demo video', isDone: false },
        ],
        source: 'local',
      };

      const mappedPayload = mapQuickNoteToTickTick(localNote, 'proj_work');

      assertEqual(mappedPayload.title, 'Prepare sprint demo presentation', 'Title mapped accurately');
      assertEqual(
        mappedPayload.content,
        'Include slides on TickTick sync architecture and verification',
        'Content / description mapped accurately'
      );
      assertEqual(mappedPayload.status, 0, 'Status is 0 when isDone is false');
      assertEqual(mappedPayload.priority, 5, 'Priority high mapped to TickTick 5');
      assertEqual(mappedPayload.projectId, 'proj_work', 'Project ID mapped correctly');
      assert(Boolean(mappedPayload.dueDate?.startsWith('2026-10-31')), 'Due date formatted to ISO string');
      assertEqual(mappedPayload.items?.length, 2, 'Mapped both subtasks to items');
      assertEqual(mappedPayload.items?.[0].status, 1, 'Completed subtask mapped to item status 1');
      assertEqual(mappedPayload.items?.[1].status, 0, 'Incomplete subtask mapped to item status 0');

      // Test reverse mapping (TickTickTask -> QuickNote)
      const remoteTask: TickTickTask = {
        id: 'tt_remote_888',
        projectId: 'proj_work',
        title: 'Review pull request #42',
        content: 'Check test coverage and typescript build',
        priority: 3,
        status: 2,
        dueDate: '2026-11-05T09:00:00.000Z',
        items: [
          { id: 'item_a', title: 'Unit tests passing', status: 1 },
          { id: 'item_b', title: 'Lint check', status: 1 },
        ],
        createdTime: '2026-10-25T11:00:00.000Z',
        modifiedTime: '2026-10-25T11:30:00.000Z',
      };

      const mappedNote = mapTickTickToQuickNote(remoteTask);
      assertEqual(mappedNote.id, 'tt_tt_remote_888', 'ID formatted as tt_<id>');
      assertEqual(mappedNote.text, 'Review pull request #42', 'Text mapped from title');
      assertEqual(mappedNote.description, 'Check test coverage and typescript build', 'Description mapped');
      assertEqual(mappedNote.isDone, true, 'isDone mapped to true from status 2');
      assertEqual(mappedNote.priority, 'medium', 'Priority 3 mapped to medium');
      assertEqual(mappedNote.deadline, '2026-11-05', 'Deadline formatted as YYYY-MM-DD');
      assertEqual(mappedNote.source, 'ticktick', 'Source set to ticktick');
      assertEqual(mappedNote.syncStatus, 'synced', 'SyncStatus set to synced');
      assertEqual(mappedNote.subtasks?.length, 2, 'Both items mapped to subtasks');
      assertEqual(mappedNote.subtasks?.[0].isDone, true, 'Subtask status 1 mapped to isDone true');
    }

    // =========================================================================
    // 3. Optimistic Push Simulation (Create, Toggle, Delete)
    // =========================================================================
    console.log('\n--- 3. Optimistic Push Simulation ---');
    {
      let localNotes: QuickNote[] = [
        {
          id: 'note_opt_1',
          text: 'Design UI for sync settings modal',
          description: 'Add OAuth token field and project selector',
          isDone: false,
          createdAt: Date.now(),
          priority: 'urgent',
          deadline: '2026-11-01',
          subtasks: [{ id: 's1', text: 'Mockup', isDone: false }],
          source: 'local',
          syncStatus: 'pending',
        },
      ];

      // 3.1 Push Task Creation
      const noteToCreate = localNotes[0];
      const createPayload = mapQuickNoteToTickTick(noteToCreate, 'proj_work');
      const createdRemote = await createTask('valid_oauth_token_123', createPayload);

      assert(Boolean(createdRemote.id), 'TickTick returned an ID for created task');
      assertEqual(createdRemote.title, 'Design UI for sync settings modal', 'Remote task has correct title');

      // Update local note state as syncManager does
      localNotes = localNotes.map((n) =>
        n.id === noteToCreate.id
          ? {
              ...n,
              ticktickTaskId: createdRemote.id,
              ticktickProjectId: 'proj_work',
              syncStatus: 'synced' as const,
            }
          : n
      );

      assertEqual(localNotes[0].syncStatus, 'synced', 'Local note syncStatus marked synced');
      assertEqual(localNotes[0].ticktickTaskId, createdRemote.id, 'Local note linked to remote taskId');

      // 3.2 Push Task Completion Toggle (false -> true)
      localNotes = localNotes.map((n) => (n.id === noteToCreate.id ? { ...n, isDone: true } : n));
      const noteToggled = localNotes[0];

      if (noteToggled.isDone && noteToggled.ticktickTaskId) {
        await completeTask(
          'valid_oauth_token_123',
          noteToggled.ticktickProjectId || 'proj_work',
          noteToggled.ticktickTaskId
        );
      }

      assertEqual(lastRequest.method, 'POST', 'completeTask issued POST method');
      assert(
        lastRequest.url.includes(`/project/proj_work/task/${noteToggled.ticktickTaskId}/complete`),
        'completeTask targeted correct URL'
      );
      const remoteStateAfterComplete = mockServerTasks.get(noteToggled.ticktickTaskId!);
      assertEqual(remoteStateAfterComplete?.status, 2, 'Remote task status is updated to 2 (completed)');

      // 3.3 Push Task Completion Toggle (true -> false)
      localNotes = localNotes.map((n) => (n.id === noteToCreate.id ? { ...n, isDone: false } : n));
      const noteUnchecked = localNotes[0];

      const updatePayload = mapQuickNoteToTickTick(noteUnchecked, 'proj_work');
      await updateTask('valid_oauth_token_123', {
        ...updatePayload,
        id: noteUnchecked.ticktickTaskId!,
      });

      assertEqual(lastRequest.method, 'POST', 'updateTask issued POST method');
      assert(
        lastRequest.url.endsWith(`/open/v1/task/${noteUnchecked.ticktickTaskId}`),
        'updateTask targeted /open/v1/task/{id}'
      );
      const remoteStateAfterUncomplete = mockServerTasks.get(noteUnchecked.ticktickTaskId!);
      assertEqual(remoteStateAfterUncomplete?.status, 0, 'Remote task status reopened to 0');

      // 3.4 Push Task Deletion
      await deleteTask(
        'valid_oauth_token_123',
        noteUnchecked.ticktickProjectId || 'proj_work',
        noteUnchecked.ticktickTaskId!
      );
      assertEqual(lastRequest.method, 'DELETE', 'deleteTask issued DELETE method');
      assert(
        lastRequest.url.endsWith(`/project/proj_work/task/${noteUnchecked.ticktickTaskId}`),
        'deleteTask targeted /project/{projId}/task/{taskId}'
      );
      assertEqual(mockServerTasks.has(noteUnchecked.ticktickTaskId!), false, 'Remote task deleted from server');
    }

    // =========================================================================
    // 4. Bidirectional Reconciliation Pull
    // =========================================================================
    console.log('\n--- 4. Bidirectional Reconciliation Pull ---');
    {
      const localOnlyNote: QuickNote = {
        id: 'note_pure_local',
        text: 'Local brainstorm note (never synced)',
        description: 'Keep on device only',
        isDone: false,
        createdAt: 1730000100000,
        source: 'local',
      };

      const gcalEventNote: QuickNote = {
        id: 'note_gcal_sync',
        text: 'Weekly Team Standup',
        description: 'Google Meet link',
        isDone: false,
        createdAt: 1730000200000,
        source: 'google_calendar',
        eventId: 'gcal_event_998877',
      };

      const existingSyncedNote: QuickNote = {
        id: 'note_synced_existing',
        text: 'Refactor database models',
        description: 'Drafting plan',
        isDone: false,
        createdAt: 1730000300000,
        priority: 'low',
        source: 'ticktick',
        ticktickTaskId: 'task_init_1',
        ticktickProjectId: 'proj_work',
        syncStatus: 'synced',
      };

      const startingNotes: QuickNote[] = [localOnlyNote, gcalEventNote, existingSyncedNote];

      // Simulate remote changes on server
      // 1) task_init_1 updated remotely (title updated, completed remotely, high priority)
      // 2) A brand-new remote task added on TickTick mobile app
      const remoteTasksFromTickTick: TickTickTask[] = [
        {
          id: 'task_init_1',
          projectId: 'proj_work',
          title: 'Refactor database models (Completed in PR #8)',
          content: 'Drafting plan - executed & approved',
          priority: 5,
          status: 2,
          dueDate: '2026-10-31T15:00:00.000Z',
          modifiedTime: '2026-10-25T14:00:00.000Z',
          items: [{ id: 'sub_item_1', title: 'Migration scripts', status: 1 }],
        },
        {
          id: 'task_remote_new_2',
          projectId: 'proj_work',
          title: 'Organize team offsite venue',
          content: 'Check downtown options',
          priority: 3,
          status: 0,
          dueDate: '2026-11-15T12:00:00.000Z',
          createdTime: '2026-10-25T13:00:00.000Z',
          modifiedTime: '2026-10-25T13:30:00.000Z',
        },
      ];

      const reconciledNotes = reconcileTasks(startingNotes, remoteTasksFromTickTick, 'proj_work');

      assertEqual(reconciledNotes.length, 4, 'Reconciled list contains 4 notes (2 untouched + 1 updated + 1 imported)');

      // 4.1 Preserve local-only note
      const reconciledLocal = reconciledNotes.find((n) => n.id === 'note_pure_local');
      assert(Boolean(reconciledLocal), 'Local-only note preserved');
      assertEqual(reconciledLocal?.text, 'Local brainstorm note (never synced)', 'Local note text untouched');
      assertEqual(reconciledLocal?.source, 'local', 'Local note source is still local');
      assertEqual(reconciledLocal?.ticktickTaskId, undefined, 'Local note has no ticktickTaskId');

      // 4.2 Preserve Google Calendar task
      const reconciledGcal = reconciledNotes.find((n) => n.id === 'note_gcal_sync');
      assert(Boolean(reconciledGcal), 'Google Calendar note preserved');
      assertEqual(reconciledGcal?.text, 'Weekly Team Standup', 'GCal note text untouched');
      assertEqual(reconciledGcal?.source, 'google_calendar', 'GCal note source is still google_calendar');
      assertEqual(reconciledGcal?.eventId, 'gcal_event_998877', 'GCal eventId preserved intact');

      // 4.3 Existing synced note updated with remote changes
      const updatedSynced = reconciledNotes.find((n) => n.id === 'note_synced_existing');
      assert(Boolean(updatedSynced), 'Existing synced note located in reconciled output');
      assertEqual(
        updatedSynced?.text,
        'Refactor database models (Completed in PR #8)',
        'Synced note text updated from remote'
      );
      assertEqual(
        updatedSynced?.description,
        'Drafting plan - executed & approved',
        'Synced note description updated from remote'
      );
      assertEqual(updatedSynced?.isDone, true, 'Synced note isDone updated to true from remote status 2');
      assertEqual(updatedSynced?.priority, 'high', 'Synced note priority updated to high from remote priority 5');
      assertEqual(updatedSynced?.deadline, '2026-10-31', 'Synced note deadline updated to YYYY-MM-DD');
      assertEqual(updatedSynced?.subtasks?.length, 1, 'Synced note subtasks populated from remote items');
      assertEqual(updatedSynced?.subtasks?.[0].isDone, true, 'Synced note subtask marked done');
      assertEqual(updatedSynced?.syncStatus, 'synced', 'Synced note syncStatus remains synced');

      // 4.4 Newly discovered remote task added to local state
      const newlyDiscovered = reconciledNotes.find((n) => n.ticktickTaskId === 'task_remote_new_2');
      assert(Boolean(newlyDiscovered), 'New remote task added to local notes');
      assertEqual(newlyDiscovered?.id, 'tt_task_remote_new_2', 'New note id formatted with tt_ prefix');
      assertEqual(newlyDiscovered?.text, 'Organize team offsite venue', 'New note title mapped accurately');
      assertEqual(newlyDiscovered?.source, 'ticktick', 'New note source marked ticktick');
      assertEqual(newlyDiscovered?.isDone, false, 'New note isDone matches remote status 0');
      assertEqual(newlyDiscovered?.priority, 'medium', 'New note priority matches remote priority 3');
      assertEqual(newlyDiscovered?.deadline, '2026-11-15', 'New note deadline mapped to YYYY-MM-DD');
      assertEqual(newlyDiscovered?.syncStatus, 'synced', 'New note syncStatus is synced');

      // 4.5 Ensure missing remote task doesn't delete existing note
      const emptyReconcile = reconcileTasks(startingNotes, [], 'proj_work');
      assertEqual(emptyReconcile.length, 3, 'Empty remote response preserves all 3 existing local notes');

      // 4.6 Verify task completed in TickTick (excluded from active task list) becomes isDone: true
      const activeTaskInLaunchPad: QuickNote = {
        id: 'note_checked_in_ticktick',
        text: 'Task checked on phone in TickTick',
        isDone: false,
        createdAt: 2500,
        source: 'ticktick',
        ticktickTaskId: 'task_checked_remote',
        ticktickProjectId: 'proj_work',
        syncStatus: 'synced',
      };
      // TickTick omits completed tasks from GET /project/{id}/data
      const activeTasksFromTickTick: TickTickTask[] = [];
      const afterTickTickCompleted = reconcileTasks([activeTaskInLaunchPad], activeTasksFromTickTick, 'proj_work');
      assertEqual(afterTickTickCompleted[0].isDone, true, 'Task checked in TickTick updates to isDone true in LaunchPad');
      assertEqual(afterTickTickCompleted[0].syncStatus, 'synced', 'Task syncStatus is synced');
    }

    // =========================================================================
    // 5. Error Handling & Token Expiry Recovery Simulation
    // =========================================================================
    console.log('\n--- 5. Error Handling & Token Expiry Recovery ---');
    {
      let simulatedSettings: TickTickSettings = {
        enabled: true,
        accessToken: 'valid_oauth_token_123',
        selectedProjectId: 'proj_work',
        autoSyncIntervalMinutes: 5,
        lastError: undefined,
      };

      // 5.1 Simulate Token Expiry (Server begins returning 401)
      currentToken = 'token_has_been_revoked';
      let errorEncountered = '';

      try {
        await getProjectTasks(simulatedSettings.accessToken, simulatedSettings.selectedProjectId);
      } catch (err: any) {
        errorEncountered = err.message;
        simulatedSettings.lastError = err.message;
      }

      assert(errorEncountered.includes('401'), 'Error caught when token expired with HTTP 401');
      assertEqual(
        simulatedSettings.lastError?.includes('401'),
        true,
        'simulatedSettings recorded lastError with 401'
      );

      // 5.2 Simulate Token Recovery (User refreshes or enters a new valid token)
      const freshToken = 'refreshed_oauth_token_555';
      currentToken = freshToken; // Server now accepts refreshed_oauth_token_555
      simulatedSettings = {
        ...simulatedSettings,
        accessToken: freshToken,
        lastError: undefined,
      };

      const recoveredTasks = await getProjectTasks(
        simulatedSettings.accessToken,
        simulatedSettings.selectedProjectId
      );
      assert(Array.isArray(recoveredTasks), 'Successfully fetched tasks after token refresh');
      assertEqual(simulatedSettings.lastError, undefined, 'lastError cleared upon token recovery');

      // 5.3 Simulate Network Offline / DNS Failure
      shouldFailNetwork = true;
      let networkErrorCaught = false;

      try {
        await getProjectTasks(simulatedSettings.accessToken, simulatedSettings.selectedProjectId);
      } catch (err: any) {
        networkErrorCaught = true;
        simulatedSettings.lastError = err.message;
      }

      assertEqual(networkErrorCaught, true, 'Network disconnection caught gracefully without unhandled exception');
      assert(
        simulatedSettings.lastError?.includes('offline') === true,
        'Network error message preserved in settings'
      );

      // Restore network
      shouldFailNetwork = false;
      const networkRestoredTasks = await getProjectTasks(
        simulatedSettings.accessToken,
        simulatedSettings.selectedProjectId
      );
      assert(Array.isArray(networkRestoredTasks), 'Sync resumes smoothly once network is restored');
    }

  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('\n=======================================');
  if (failures === 0) {
    console.log('🎉 ALL TICKTICK VERIFICATION TESTS PASSED SUCCESSFULLY! (0 failures)\n');
    process.exit(0);
  } else {
    console.error(`💥 ${failures} TEST(S) FAILED!\n`);
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Unhandled exception during verification test suite:', err);
  process.exit(1);
});
