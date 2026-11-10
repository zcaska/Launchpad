import { useState, type FormEvent } from 'react';
import {
  CLOUD_PROJECTS_KEY, DEFAULT_CLOUD_PROJECT, getCloudClient, openCloudWorkspace, readCloudProjects,
  validateCloudProject, type CloudWorkspace,
} from '../../services/cloudWorkspace';
import type { useCloudSync } from '../../services/useCloudSync';
import { flushAppDataSave, loadAppData } from '../../utils/storage';

const field = 'w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm dark:border-stone-700';
const button = 'rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800 disabled:opacity-50';
const primary = 'rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

export function CloudWorkspaceSettings({ workspace, onSwitch, sync }: {
  workspace: CloudWorkspace | null;
  onSwitch: (workspace: CloudWorkspace | null) => void;
  sync: ReturnType<typeof useCloudSync>;
}) {
  const [projects, setProjects] = useState(readCloudProjects);
  const [selected, setSelected] = useState(workspace?.project.url ?? DEFAULT_CLOUD_PROJECT.url);
  const [projectForm, setProjectForm] = useState<'add' | 'edit' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [copyLocal, setCopyLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const project = projects.find((item) => item.url === selected) ?? DEFAULT_CLOUD_PROJECT;

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const next = validateCloudProject(String(values.get('name')), String(values.get('url')), String(values.get('key')));
      const editing = projectForm === 'edit';
      if (projects.some((item) => item.url === next.url && (!editing || item.url !== project.url))) {
        throw new Error('This project is already configured.');
      }
      const updated = editing
        ? projects.map((item) => item.url === project.url ? next : item)
        : [...projects, next];
      localStorage.setItem(CLOUD_PROJECTS_KEY, JSON.stringify(updated.slice(1)));
      setProjects(updated);
      setSelected(next.url);
      setProjectForm(null);
      setMessage(editing ? 'Project connection updated.' : 'Project added. Install the LaunchPAD migration there before opening its workspace.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this project.');
    }
  };

  const connect = async (action: 'resume' | 'sign-in' | 'sign-up') => {
    setBusy(true);
    setMessage('');
    let authenticated = false;
    try {
      const client = await getCloudClient(project);
      if (action === 'sign-up') {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then return here and sign in.');
          setPassword('');
          return;
        }
        authenticated = true;
      } else if (action === 'sign-in') {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        authenticated = true;
      }
      flushAppDataSave();
      const next = await openCloudWorkspace(project, copyLocal ? loadAppData() : undefined);
      if (!next) {
        setMessage(authenticated
          ? 'Signed in, but this browser could not restore the session. Check that site storage is enabled and try again.'
          : 'Sign in to this Supabase project first.');
        return;
      }
      setPassword('');
      onSwitch(next);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Please try again.';
      const stage = authenticated ? 'Signed in, but the workspace could not be opened'
        : action === 'resume' ? 'Could not resume the workspace'
        : action === 'sign-up' ? 'Account creation failed' : 'Sign-in failed';
      setMessage(/failed to fetch|network request failed/i.test(detail)
        ? `${stage}: this device could not reach the cloud service. Check its internet connection and try again.`
        : `${stage}: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!workspace) return;
    setBusy(true);
    try {
      const { error } = await workspace.client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      onSwitch(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="cloud-sync-title" className="space-y-3 rounded-xl border border-stone-300 p-4 dark:border-stone-700">
      <h3 id="cloud-sync-title" className="font-bold">Supabase cloud workspaces</h3>
      <p className="text-sm">Open the same project with the same account on each device to sync tasks, notes, preferences, and progress.</p>
      {message && (projectForm || workspace?.project.url === project.url) && <p role="alert" className="break-words rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">{message}</p>}
      {workspace && (
        <div className="space-y-2 rounded-lg bg-teal-500/10 p-3 text-sm">
          <p className="break-words font-semibold">{workspace.project.name} · {workspace.email}</p>
          <p role="status">{sync.status}</p>
          {sync.cacheError && <p role="alert">The offline copy could not be saved. Export a backup before leaving this workspace.</p>}
          {sync.conflict && (
            <>
              <p>Export a backup if you want to keep both versions. Choose which copy to continue with.</p>
              <div className="flex flex-wrap gap-2">
                <button className={button} type="button" onClick={() => sync.resolve(true)}>Upload this device’s copy</button>
                <button className={button} type="button" onClick={() => sync.resolve(false)}>Use the cloud copy</button>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={button} type="button" onClick={() => void sync.sync()} disabled={sync.conflict}>Sync now</button>
            <button className={button} type="button" onClick={() => onSwitch(null)} disabled={busy}>Switch to local workspace</button>
            <button className={button} type="button" onClick={() => void signOut()} disabled={busy}>Sign out of this device</button>
          </div>
        </div>
      )}
      <label className="block space-y-1 text-sm">
        <span>Supabase project</span>
        <select className={field} disabled={busy || Boolean(projectForm)} value={selected} onChange={(event) => {
          setSelected(event.target.value);
          setPassword('');
          setMessage('');
        }}>
          {projects.map((item) => <option key={item.url} value={item.url}>{item.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button className={button} type="button" disabled={busy} onClick={() => setProjectForm(projectForm ? null : 'add')} aria-expanded={Boolean(projectForm)}>
          {projectForm ? 'Cancel project setup' : 'Add another project'}
        </button>
        {!projectForm && project.url !== DEFAULT_CLOUD_PROJECT.url && project.url !== workspace?.project.url && (
          <button className={button} type="button" disabled={busy} onClick={() => setProjectForm('edit')}>Edit project connection</button>
        )}
      </div>
      {projectForm && (
        <form className="grid gap-2" onSubmit={addProject}>
          <label>Project name<input className={field} name="name" defaultValue={projectForm === 'edit' ? project.name : ''} required /></label>
          <label>Project URL<input className={field} name="url" type="url" defaultValue={projectForm === 'edit' ? project.url : ''} placeholder="https://project-ref.supabase.co" required /></label>
          <label>Publishable API key<input className={field} name="key" defaultValue={projectForm === 'edit' ? project.key : ''} placeholder="sb_publishable_…" required /></label>
          <button className={primary} type="submit">Save project</button>
        </form>
      )}
      {!projectForm && workspace?.project.url !== project.url && (
        <form className="grid gap-2" onSubmit={(event) => {
          event.preventDefault();
          void connect('sign-in');
        }}>
          <label className="text-sm">Email<input className={field} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></label>
          <label className="text-sm">Password<input className={field} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={copyLocal} onChange={(event) => setCopyLocal(event.target.checked)} disabled={busy} />
            Copy my local workspace into this cloud account if it has no workspace yet
          </label>
          {message && <p role="alert" className="break-words rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button className={primary} type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Sign in'}</button>
            <button className={button} type="submit" disabled={busy} onClick={(event) => {
              if (!event.currentTarget.form?.reportValidity()) return;
              event.preventDefault();
              void connect('sign-up');
            }}>Create account</button>
            <button className={button} type="button" disabled={busy} onClick={() => void connect('resume')}>Resume saved session</button>
          </div>
        </form>
      )}
    </section>
  );
}
