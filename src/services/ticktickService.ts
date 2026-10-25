import type { TickTickProject, TickTickTask } from '../types/ticktick';

export const DEFAULT_TICKTICK_PROXY = '/api/ticktick';

/**
 * Normalizes proxy URL and endpoint path into a cleanly joined URL.
 */
function buildUrl(proxyUrl: string | undefined, endpoint: string): string {
  const base = (proxyUrl || DEFAULT_TICKTICK_PROXY).replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Validates a TickTick OAuth access token by querying user profile.
 */
export async function validateToken(
  token: string,
  proxyUrl?: string
): Promise<{ success: boolean; username?: string; error?: string }> {
  if (!token || !token.trim()) {
    return { success: false, error: 'Access token cannot be empty' };
  }

  try {
    const url = buildUrl(proxyUrl, '/open/v1/user/profile');
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `Failed to validate token: HTTP ${res.status} ${errText}`.trim(),
      };
    }

    const data = await res.json();
    return {
      success: true,
      username: data?.username || data?.email || 'User',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while validating token',
    };
  }
}

/**
 * Retrieves the user's projects.
 */
export async function getProjects(
  token: string,
  proxyUrl?: string
): Promise<TickTickProject[]> {
  const url = buildUrl(proxyUrl, '/open/v1/project');
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch projects: HTTP ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Retrieves tasks for a given project.
 */
export async function getProjectTasks(
  token: string,
  projectId: string,
  proxyUrl?: string
): Promise<TickTickTask[]> {
  const url = buildUrl(proxyUrl, `/open/v1/project/${encodeURIComponent(projectId)}/data`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch project tasks: HTTP ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data?.tasks || [];
}

/**
 * Creates a new task in TickTick.
 */
export async function createTask(
  token: string,
  task: Partial<TickTickTask>,
  proxyUrl?: string
): Promise<TickTickTask> {
  const url = buildUrl(proxyUrl, '/open/v1/task');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to create task: HTTP ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Updates an existing task in TickTick.
 */
export async function updateTask(
  token: string,
  task: Partial<TickTickTask> & { id: string },
  proxyUrl?: string
): Promise<TickTickTask> {
  const url = buildUrl(proxyUrl, `/open/v1/task/${encodeURIComponent(task.id)}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to update task: HTTP ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Marks a task as complete.
 */
export async function completeTask(
  token: string,
  projectId: string,
  taskId: string,
  proxyUrl?: string
): Promise<void> {
  const url = buildUrl(
    proxyUrl,
    `/open/v1/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`
  );
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to complete task: HTTP ${res.status} ${errText}`);
  }
}

/**
 * Deletes a task.
 */
export async function deleteTask(
  token: string,
  projectId: string,
  taskId: string,
  proxyUrl?: string
): Promise<void> {
  const url = buildUrl(
    proxyUrl,
    `/open/v1/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
  );
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to delete task: HTTP ${res.status} ${errText}`);
  }
}
