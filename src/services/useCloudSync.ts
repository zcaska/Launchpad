import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../types';
import {
  applyRemoteData, archiveCloudCopy, editCloudRecord, migrateCloudScope, prepareCloudWrite, reconcileCloudRevision, sameSharedData, sameValue,
  readCloudRecord, createCloudCacheWriter, writeCloudRecord, clearCloudWorkspaceData,
  type CloudAcknowledgement, type CloudRecord, type CloudWorkspace, type RemoteRecord,
} from './cloudWorkspace';

export function useCloudSync(workspace: CloudWorkspace | null, data: AppData, onDownload: (data: AppData, tasksChanged: boolean) => void) {
  const current = useRef(workspace?.initial);
  const lastAppData = useRef(data);
  const active = useRef(false);
  const inFlight = useRef(false);
  const syncRequested = useRef(false);
  const conflictRef = useRef<RemoteRecord | null>(null);
  const [conflict, setConflict] = useState<RemoteRecord | null>(null);
  const [status, setStatus] = useState('Checking cloud workspace…');
  const [cacheError, setCacheError] = useState(false);
  const [cacheConflict, setCacheConflict] = useState(false);
  const cacheWriteFailed = useRef(false);
  const cachePending = useRef<CloudRecord | undefined>(undefined);
  const cacheWriter = useMemo(() => workspace ? createCloudCacheWriter(workspace) : null, [workspace]);

  const persist = useCallback((record: CloudRecord) => {
    current.current = record;
    if (!cacheWriter) return;
    cachePending.current = record;
    return cacheWriter.saveLocked(record, () => current.current === record).then(result => {
      if (!result) return;
      if (record !== current.current) return;
      cachePending.current = result === 'failed' ? record : undefined;
      const failed = result === 'failed';
      cacheWriteFailed.current = failed;
      setCacheError(failed);
      setCacheConflict(result === 'conflict');
    });
  }, [cacheWriter]);

  useEffect(() => {
    if (!cacheWriter) return;
    const flush = () => {
      const pending = cachePending.current;
      if (pending && pending === current.current) cacheWriter.save(pending);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, [cacheWriter]);

  useLayoutEffect(() => {
    if (!workspace || !current.current) return;
    if (data !== lastAppData.current) {
      lastAppData.current = data;
      const next = editCloudRecord(current.current, data);
      persist(next);
      if (next.dirty && !conflictRef.current) setStatus('Device changes queued.');
    } else {
      persist(current.current);
    }
  }, [data, persist, workspace]);

  const acceptRecord = useCallback((record: CloudRecord, local: CloudRecord) => {
    persist(record);
    if (!sameSharedData(local.data, record.data)) {
      onDownload(record.data, !sameValue(local.data.quickNotes, record.data.quickNotes));
    }
  }, [onDownload, persist]);

  const sync = useCallback(async () => {
    if (!workspace || !active.current || !current.current) return;
    if (cacheWriteFailed.current) persist(current.current);
    if (conflictRef.current) return;
    if (inFlight.current) {
      syncRequested.current = true;
      return;
    }
    if (!navigator.onLine) {
      setStatus('Offline. Reconnect to sync changes.');
      return;
    }
    inFlight.current = true;
    const finishSave = (acknowledgement: CloudAcknowledgement) => {
      persist(acknowledgement.record);
      if (acknowledgement.action === 'queue') {
        syncRequested.current = true;
        setStatus('Device changes queued.');
      } else {
        setStatus('Synced with Supabase');
      }
    };
    try {
      const starting = current.current;
      const unchangedRevision = starting.dirty || starting.reviewLegacyScope ? undefined : starting.revision ?? undefined;
      const remote = await readCloudRecord(workspace.client, workspace.userId, unchangedRevision);
      if (!active.current) return;
      const local = current.current;
      if (!local) return;
      if (local.revision !== starting.revision) {
        syncRequested.current = true;
        return;
      }
      if (remote) {
        const migrated = local.reviewLegacyScope ? migrateCloudScope(local, remote) : undefined;
        if (migrated && migrated !== 'conflict') {
          acceptRecord(migrated, local);
          syncRequested.current = migrated.dirty;
          setStatus(migrated.dirty ? 'Device changes queued.' : 'Synced with Supabase');
          return;
        }
        const decision = migrated === 'conflict' ? { action: 'conflict' as const } : reconcileCloudRevision(local, remote.revision);
        if ('record' in decision) {
          finishSave(decision);
          return;
        }
        if (decision.action === 'conflict') {
          const downloaded = applyRemoteData(local.data, remote);
          if (!migrated && sameSharedData(local.data, downloaded.data) && remote.snapshot.syncFormat === 2) {
            finishSave({ action: 'synced', record: downloaded });
            return;
          }
          conflictRef.current = remote;
          setConflict(remote);
          setStatus('Cloud and device both have changes.');
          return;
        }
        if (decision.action === 'download') {
          acceptRecord(applyRemoteData(local.data, remote), local);
        }
      } else if (local.revision && !unchangedRevision) {
        throw new Error('The cloud workspace is missing. Your device copy is available for export.');
      }
      if (local.dirty) {
        setStatus('Saving to Supabase…');
        const pending = prepareCloudWrite(local);
        await persist(pending);
        if (!active.current) return;
        const written = await writeCloudRecord(workspace, pending, pending.pendingRevision, remote ?? undefined);
        if (!active.current || !current.current) return;
        const decision = reconcileCloudRevision(current.current, pending.pendingRevision, 'response');
        if (decision.action === 'superseded') return;
        if (!written) {
          syncRequested.current = true;
          setStatus('Cloud changed during this save. Checking again…');
          return;
        }
        if ('record' in decision) finishSave(decision);
        return;
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
  }, [workspace, persist, acceptRecord]);

  useEffect(() => {
    if (!workspace) return;
    active.current = true;
    void sync();
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const timer = window.setInterval(syncWhenVisible, 12000);
    const onOffline = () => setStatus('Offline. Reconnect to sync changes.');
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', syncWhenVisible);
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
      document.removeEventListener('visibilitychange', syncWhenVisible);
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
    if (!remote || !local || !workspace) return;
    const cloud = applyRemoteData(local.data, remote);
    if (!archiveCloudCopy(workspace, keepDevice ? cloud.data : local.data)) {
      setStatus('Could not save the other copy for recovery. Free device storage and try again.');
      return;
    }
    conflictRef.current = null;
    setConflict(null);
    if (keepDevice) {
      persist({ data: local.data, revision: remote.revision, dirty: true });
      void sync();
    } else {
      acceptRecord(cloud, local);
      setStatus('Using the cloud copy');
    }
  };

  const saveOnLeave = (next: AppData) => {
    if (!workspace || !current.current) return;
    active.current = false;
    const record = editCloudRecord(current.current, next);
    current.current = record;
    // Exiting can interrupt an asynchronous lock request, so compare the
    // current baseline synchronously and archive a conflicting branch.
    cacheWriter?.save(record);
  };

  const resumeAfterLeave = () => {
    active.current = true;
    void sync();
  };

  const clearCloud = useCallback(async (cleared: AppData) => {
    if (!workspace) return;
    const record = await clearCloudWorkspaceData(workspace, cleared, current.current?.revision);
    cacheWriter?.beginReplacement();
    persist(record);
    lastAppData.current = cleared;
    conflictRef.current = null;
    setConflict(null);
    setStatus('Cloud workspace data cleared');
  }, [cacheWriter, persist, workspace]);

  return { status, cacheError, cacheConflict, conflict: Boolean(conflict), resolve, sync, saveOnLeave, resumeAfterLeave, clearCloud };
}
