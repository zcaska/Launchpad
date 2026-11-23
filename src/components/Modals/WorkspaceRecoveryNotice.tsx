import { useEffect, useState } from 'react';
import {
  readCloudConflictDrafts,
  removeCloudConflictDraft,
  type CloudWorkspace,
} from '../../services/cloudWorkspace';
import { exportDataAsJson, readLocalConflictDrafts, removeLocalConflictDraft } from '../../utils/storage';
import type { AppData } from '../../types';

const action = 'min-h-9 rounded px-2 font-semibold underline underline-offset-2';

export function WorkspaceRecoveryNotice({ workspace, conflict, data }: {
  workspace: CloudWorkspace | null;
  conflict: boolean;
  data: AppData;
}) {
  const [drafts, setDrafts] = useState<ReturnType<typeof readLocalConflictDrafts>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setDrafts(workspace ? readCloudConflictDrafts(workspace) : readLocalConflictDrafts());
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [workspace, conflict]);

  if (!conflict && !drafts.length) return null;

  const removeDraft = (key: string) => {
    if (!window.confirm('Remove this recovery copy from this browser? Keep an exported backup if you still need it.')) return;
    try {
      if (workspace) removeCloudConflictDraft(workspace, key);
      else removeLocalConflictDraft(key);
      setDrafts(current => current.filter(draft => draft.key !== key));
      setError('');
    } catch {
      setError('This browser could not remove the recovery copy.');
    }
  };

  return (
    <div className="max-h-[32dvh] shrink-0 overflow-auto border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm">
      {conflict && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="alert">
            {workspace
              ? 'Another tab saved a different offline copy. Export this tab’s work before reloading.'
              : 'Another tab saved a newer workspace. Export this tab’s work, then reload to continue with the latest copy.'}
          </p>
          <button type="button" className={action} onClick={() => exportDataAsJson(data)}>Export this tab</button>
        </div>
      )}
      {drafts.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold">Recovery copies ({drafts.length})</summary>
          <p className="py-1">Export a copy before removing it. You can restore the file from Settings.</p>
          <ul>
            {drafts.map(draft => (
              <li key={draft.key} className="flex flex-wrap items-center gap-x-2">
                <time dateTime={new Date(draft.savedAt).toISOString()}>{new Date(draft.savedAt).toLocaleString()}</time>
                <button type="button" className={action} onClick={() => exportDataAsJson(draft.data)}>Export copy</button>
                <button type="button" className={action} onClick={() => removeDraft(draft.key)}>Remove copy</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
