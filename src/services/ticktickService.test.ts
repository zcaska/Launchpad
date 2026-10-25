import {
  DEFAULT_TICKTICK_PROXY,
  validateToken,
  getProjects,
  getProjectTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from './ticktickService';
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

async function runTests() {
  console.log('--- Testing ticktickService.ts ---');

  // Test 1: DEFAULT_TICKTICK_PROXY constant
  assertEqual(DEFAULT_TICKTICK_PROXY, '/api/ticktick', 'DEFAULT_TICKTICK_PROXY defaults to /api/ticktick');

  // Test 2: validateToken with empty token fails
  {
    const res = await validateToken('');
    assertEqual(res.success, false, 'validateToken fails for empty string');
    assert(Boolean(res.error), 'validateToken returns error description on empty token');
  }

  // Setup mock global fetch
  const originalFetch = globalThis.fetch;
  let lastFetchUrl = '';
  let lastFetchOptions: any = null;

  try {
    // Test 3: validateToken with mocked successful response
    globalThis.fetch = (async (url: string | URL | Request, options?: any) => {
      lastFetchUrl = String(url);
      lastFetchOptions = options;

      if (lastFetchUrl.includes('/open/v1/user/profile') || lastFetchUrl.includes('/user/profile')) {
        if (options?.headers?.Authorization === 'Bearer valid_token') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ username: 'ticktick_user', email: 'user@example.com' }),
          } as Response;
        }
        return {
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as Response;
      }

      if (lastFetchUrl.includes('/project/proj_1/data')) {
        if (options?.headers?.Authorization === 'Bearer valid_token') {
          const sampleTasks: TickTickTask[] = [
            { id: 'task_1', projectId: 'proj_1', title: 'Task 1', priority: 0, status: 0 },
            { id: 'task_2', projectId: 'proj_1', title: 'Task 2', priority: 3, status: 2 },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => ({ tasks: sampleTasks }),
          } as Response;
        }
      }

      if (lastFetchUrl.includes('/project/') && lastFetchUrl.includes('/complete') && options?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (lastFetchUrl.includes('/project/') && options?.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (lastFetchUrl.endsWith('/open/v1/project') || lastFetchUrl.endsWith('/project')) {
        if (options?.headers?.Authorization === 'Bearer valid_token') {
          const sampleProjects: TickTickProject[] = [
            { id: 'proj_1', name: 'Inbox', color: '#ff0000' },
            { id: 'proj_2', name: 'Work', color: '#00ff00' },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => sampleProjects,
          } as Response;
        }
      }

      if (lastFetchUrl.endsWith('/task') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'new_task_id', ...body }),
        } as Response;
      }

      if (lastFetchUrl.includes('/task/') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...body }),
        } as Response;
      }

      if (lastFetchUrl.includes('/complete') && options?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      if (options?.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        text: async () => 'Not found',
      } as Response;
    }) as any;

    // Test 4: validateToken success
    {
      const res = await validateToken('valid_token');
      assertEqual(res.success, true, 'validateToken succeeds with valid token');
      assertEqual(res.username, 'ticktick_user', 'validateToken returns username');
    }

    // Test 5: validateToken failure (401)
    {
      const res = await validateToken('invalid_token');
      assertEqual(res.success, false, 'validateToken fails with invalid token');
    }

    // Test 6: getProjects
    {
      const projects = await getProjects('valid_token');
      assertEqual(projects.length, 2, 'getProjects returns project list');
      assertEqual(projects[0].name, 'Inbox', 'getProjects first item is Inbox');
      assert(lastFetchUrl.startsWith(DEFAULT_TICKTICK_PROXY), 'getProjects uses DEFAULT_TICKTICK_PROXY');
    }

    // Test 7: getProjectTasks
    {
      const tasks = await getProjectTasks('valid_token', 'proj_1');
      assertEqual(tasks.length, 2, 'getProjectTasks returns tasks');
      assertEqual(tasks[0].title, 'Task 1', 'getProjectTasks task title matches');
    }

    // Test 8: createTask
    {
      const created = await createTask('valid_token', {
        projectId: 'proj_1',
        title: 'New Created Task',
        priority: 1,
      });
      assertEqual(created.id, 'new_task_id', 'createTask returns created task with id');
      assertEqual(created.title, 'New Created Task', 'createTask returned task title matches');
      assertEqual(lastFetchOptions?.method, 'POST', 'createTask uses POST');
    }

    // Test 9: updateTask
    {
      const updated = await updateTask('valid_token', {
        id: 'task_1',
        projectId: 'proj_1',
        title: 'Updated Task 1',
      });
      assertEqual(updated.title, 'Updated Task 1', 'updateTask returns updated title');
      assertEqual(lastFetchOptions?.method, 'POST', 'updateTask uses POST');
    }

    // Test 10: completeTask
    {
      await completeTask('valid_token', 'proj_1', 'task_1');
      assert(lastFetchUrl.includes('/project/proj_1/task/task_1/complete'), 'completeTask calls correct endpoint');
      assertEqual(lastFetchOptions?.method, 'POST', 'completeTask uses POST');
    }

    // Test 11: deleteTask
    {
      await deleteTask('valid_token', 'proj_1', 'task_1');
      assert(lastFetchUrl.includes('/project/proj_1/task/task_1'), 'deleteTask calls correct endpoint');
      assertEqual(lastFetchOptions?.method, 'DELETE', 'deleteTask uses DELETE');
    }

    // Test 12: Custom proxyUrl support
    {
      const customProxy = 'https://custom-proxy.internal/ticktick';
      await getProjects('valid_token', customProxy);
      assert(lastFetchUrl.startsWith(customProxy), 'Uses custom proxyUrl when provided');
    }

  } finally {
    globalThis.fetch = originalFetch;
  }

  if (failures > 0) {
    console.error(`\nTest suite finished with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log(`\nAll tests passed successfully!`);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
