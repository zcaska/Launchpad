import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import {
  cloudData, readCloudRecord, saveCloudCache, writeCloudRecord,
  type CloudRecord, type CloudWorkspace,
} from './cloudWorkspace';

export function useCloudSync(workspace: CloudWorkspace | null, data: AppData, onDownload: (data: AppData) => void) {
  const current = useRef(workspace?.initial);
  const lastAppData = useRef(data);
  const active = useRef(false);
  const inFlight = useRef(false);
  const syncRequested = useRef(false);
  const conflictRef = useRef<CloudRecord | null>(null);
  const [conflict, setConflict] = useState<CloudRecord | null>(null);
  const [status, setStatus] = useState('Checking cloud workspace…');
  const [cacheError, setCacheError] = useState(false);

  const persist = useCallback((record: CloudRecord) => {
    current.current = record;
    if (!workspace) return;
    try {
      saveCloudCache(workspace, record);
      setCacheError(false);
    } catch {
      setCacheError(true);
    }
  }, [workspace]);

  useEffect(() => {
    if (!workspace || !current.current) return;
    if (data !== lastAppData.current) {
      lastAppData.current = data;
      persist({ data: cloudData(data), revision: current.current.revision, dirty: true });
      if (!conflictRef.current) setStatus('Device changes queued.');
    } else {
      persist(current.current);
    }
  }, [data, persist, workspace]);

  const sync = useCallback(async () => {
    if (!workspace || !active.current || conflictRef.current || !current.current) return;
    if (inFlight.current) {
      syncRequested.current = true;
      return;
    }
    if (!navigator.onLine) {
      setStatus('Offline. Changes are queued on this device.');
      return;
    }
    inFlight.current = true;
    try {
      const starting = current.current;
      const unchangedRevision = starting.dirty ? undefined : starting.revision ?? undefined;
      const remote = await readCloudRecord(workspace.client, workspace.userId, unchangedRevision);
      if (!active.current) return;
      const local = current.current;
      if (!local) return;
      const remoteRevision = remote?.revision ?? null;
      if (remote && local.pendingRevision === remoteRevision) {
        // Recover from a write that committed but whose response was lost.
        persist({ ...local, revision: remoteRevision, dirty: false, pendingRevision: undefined });
      } else if (remote && local.revision !== remoteRevision) {
        if (local.dirty) {
          conflictRef.current = remote;
          setConflict(remote);
          setStatus('Cloud and device both have changes.');
          return;
        }
        lastAppData.current = remote.data;
        persist(remote);
        onDownload(remote.data);
      } else if (!remote && local.revision && !unchangedRevision) {
        throw new Error('The cloud workspace is missing. Your device copy is available for export.');
      } else if (local.dirty) {
        setStatus('Saving to Supabase…');
        const nextRevision = crypto.randomUUID();
        const pending = { ...local, pendingRevision: nextRevision };
        persist(pending);
        const written = await writeCloudRecord(workspace, local, nextRevision);
        if (!active.current) return;
        if (!written) {
          setStatus('Cloud changed during this save. Checking again…');
          return;
        }
        const latest = current.current ?? pending;
        const dirty = latest !== pending;
        persist({ ...latest, revision: nextRevision, dirty, pendingRevision: undefined });
        if (dirty) {
          setStatus('Device changes queued.');
          return;
        }
      }
      setStatus('Synced with Supabase');
    } catch (error) {
      if (active.current) {
        const message = error instanceof Error ? error.message : 'Connection failed.';
        setStatus(`Sync paused. ${message}`);
      }
    } finally {
      inFlight.current = false;
      if (syncRequested.current && active.current) {
        syncRequested.current = false;
        queueMicrotask(() => void sync());
      }
    }
  }, [workspace, persist, onDownload]);

  useEffect(() => {
    if (!workspace) return;
    active.current = true;
    void sync();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, 12000);
    const onOffline = () => setStatus('Offline. Changes are queued on this device.');
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('offline', onOffline);
    const channel = workspace.client.channel(`launchpad:${workspace.userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'launchpad_workspaces',
        filter: `user_id=eq.${workspace.userId}`,
      }, () => { void sync(); })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') void sync();
      });
    return () => {
      active.current = false;
      void workspace.client.removeChannel(channel);
      window.clearInterval(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('offline', onOffline);
    };
  }, [sync, workspace]);

  useEffect(() => {
    if (!workspace || !current.current?.dirty) return;
    const timer = window.setTimeout(() => void sync(), 650);
    return () => window.clearTimeout(timer);
  }, [data, sync, workspace]);

  const resolve = (keepDevice: boolean) => {
    const remote = conflictRef.current;
    const local = current.current;
    if (!remote || !local) return;
    conflictRef.current = null;
    setConflict(null);
    if (keepDevice) {
      persist({ data: local.data, revision: remote.revision, dirty: true });
      void sync();
    } else {
      lastAppData.current = remote.data;
      persist(remote);
      onDownload(remote.data);
      setStatus('Using the cloud copy');
    }
  };

  const saveOnLeave = (next: AppData) => {
    if (!workspace || !current.current) return;
    active.current = false;
    const record = { data: cloudData(next), revision: current.current.revision, dirty: true };
    current.current = record;
    saveCloudCache(workspace, record);
  };

  const resumeAfterLeave = () => {
    active.current = true;
    void sync();
  };

  return { status, cacheError, conflict: Boolean(conflict), resolve, sync, saveOnLeave, resumeAfterLeave };
}
