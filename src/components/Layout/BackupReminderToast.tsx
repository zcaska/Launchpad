import React from 'react';
import {
  DownloadSimple as Download,
  X
} from '@phosphor-icons/react';

export interface BackupReminderToastProps {
  onQuickBackup: () => void;
  onDismiss: () => void;
}

export const BackupReminderToast: React.FC<BackupReminderToastProps> = ({
  onQuickBackup,
  onDismiss,
}) => {
  return (
    <div
      role="alert"
      className="group fixed bottom-4 left-4 z-[80]"
    >
      <div className="relative">
        <button
            onClick={onQuickBackup}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-serene-primary px-3 py-1.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-serene-primary-hover focus:outline-hidden focus:ring-2 focus:ring-serene-primary/40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
        </button>
        <button
            onClick={onDismiss}
            aria-label="Dismiss backup reminder"
            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-serene-border-light bg-serene-surface-light text-serene-text-primary shadow-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary transition-opacity cursor-pointer [@media(hover:none)]:opacity-100"
          >
            <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
