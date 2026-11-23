import { useState } from 'react';
import { importDataFromJson, restoreImportedBackupWithLock, restoreRollingBackupWithLock, STORAGE_BACKUP_KEY, STORAGE_KEY } from '../../utils/storage';

export function findDamagedData(storage: Pick<Storage, 'getItem'>): string | null {
  for (const key of [STORAGE_KEY, 'launchpad_app_data_v2', 'launchpad_app_data_v1', STORAGE_BACKUP_KEY, 'launchpad_app_data_backup']) {
    const value = storage.getItem(key);
    if (value !== null) return value;
  }
  return null;
}

/** Recovery never clears data; replacement only happens after the user selects a valid backup. */
export function StorageRecovery({ onRecovered, hasRollingBackup = false }: { onRecovered: () => void; hasRollingBackup?: boolean }) {
  const [error, setError] = useState('');
  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = importDataFromJson(await file.text(), false);
      if (!await restoreImportedBackupWithLock(restored)) throw new Error('The backup could not be saved on this device.');
      onRecovered();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this backup.'); }
  };
  const restoreLocal = async () => {
    try {
      if (!await restoreRollingBackupWithLock()) throw new Error('The recovery copy could not be saved on this device.');
      onRecovered();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not restore the recovery copy.'); }
  };
  const download = () => {
    try {
      const damaged = findDamagedData(localStorage);
      if (damaged === null) throw new Error('No damaged data was found on this device.');
      const blob = new Blob([damaged], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'launchpad-damaged-data.json'; link.click();
      URL.revokeObjectURL(url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not download the data.'); }
  };
  return <main className="mx-auto max-w-xl space-y-4 p-6 text-serene-text-primary dark:text-serene-text-darkPrimary">
    <h1 className="text-xl font-bold">LaunchPAD could not open your saved data</h1>
    <p>Your saved data has not been cleared. Download the damaged copy for safekeeping, or choose a previously exported LaunchPAD backup to restore.</p>
    {hasRollingBackup && <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"><p>A recovery copy is available. It may be older than your latest changes.</p><button type="button" onClick={restoreLocal} className="rounded-lg bg-amber-900 px-4 py-2 font-semibold text-white">Restore recovery copy</button></div>}
    <button type="button" onClick={download} className="rounded-lg border border-serene-border-light px-4 py-2 dark:border-serene-border-dark">Download damaged data</button>
    <label className="block font-semibold">Choose backup<input type="file" accept=".json,application/json" className="mt-2 block text-sm" onChange={event => void restore(event.target.files?.[0])} /></label>
    {error && <p role="alert" className="text-rose-600">{error}</p>}
  </main>;
}
