import React from 'react';
import { ShieldAlert, Download, X } from 'lucide-react';

export interface BackupReminderToastProps {
  onQuickBackup: () => void;
  onDismiss: () => void;
  daysSinceLastBackup: number;
}

export const BackupReminderToast: React.FC<BackupReminderToastProps> = ({
  onQuickBackup,
  onDismiss,
  daysSinceLastBackup,
}) => {
  return (
    <div
      role="alert"
      className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 dark:border-amber-500/30 px-4 py-2.5 sm:px-6 transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-serene-text-primary dark:text-serene-text-darkPrimary font-medium">
            It has been <span className="font-semibold text-amber-700 dark:text-amber-400">{daysSinceLastBackup} days</span> since your last backup. Keep your hero levels, growth stats, and tasks safe.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onQuickBackup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-serene-primary hover:bg-serene-primary-hover text-white shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-serene-primary/40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Backup (1-Click JSON)</span>
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss backup reminder"
            className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:text-serene-text-darkMuted dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
