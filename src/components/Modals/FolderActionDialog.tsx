import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { EyeOff, Eye, Trash2, X, FolderTree, AlertTriangle } from 'lucide-react';
import { Folder } from '../../types';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

export type FolderActionMode = 'hide' | 'unhide' | 'delete';

export interface FolderActionDialogProps {
  isOpen: boolean;
  mode: FolderActionMode;
  folder: Folder | null;
  childCount: number;
  linkCount: number;
  onClose: () => void;
  onConfirmWithOptions: (withSubfolders: boolean) => void;
}

export const FolderActionDialog: React.FC<FolderActionDialogProps> = ({
  isOpen,
  mode,
  folder,
  childCount,
  linkCount,
  onClose,
  onConfirmWithOptions,
}) => {
  const [mounted, setMounted] = useState(false);
  const [cachedFolder, setCachedFolder] = useState<Folder | null>(folder);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (folder) {
      setCachedFolder(folder);
    }
  }, [folder]);

  if (!mounted || typeof document === 'undefined') return null;

  const activeFolder = folder || cachedFolder;
  const hasSubfolders = childCount > 0;

  const getDialogDetails = () => {
    const folderName = activeFolder?.name || 'Folder';

    switch (mode) {
      case 'hide':
        return {
          icon: EyeOff,
          iconColor: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
          title: `Hide "${folderName}"`,
          description: hasSubfolders
            ? `This folder contains ${childCount} subfolder(s) and ${linkCount} bookmark(s). How would you like to hide it?`
            : `Hide this folder from the sidebar navigation and dashboard overview? You can unhide it anytime from Manage Folders.`,
          optionWithoutLabel: 'Hide folder only (keep subfolders visible)',
          optionWithoutDesc: 'Subfolders will be promoted up to the parent level and remain accessible in the sidebar.',
          optionWithLabel: 'Hide folder and all subfolders',
          optionWithDesc: `This folder and all ${childCount} subfolder(s) will be hidden from sidebar navigation.`,
          singleConfirmLabel: 'Hide Folder',
          confirmVariant: 'amber',
        };
      case 'unhide':
        return {
          icon: Eye,
          iconColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
          title: `Unhide "${folderName}"`,
          description: hasSubfolders
            ? `This folder has ${childCount} subfolder(s). How would you like to unhide it?`
            : `Restore this folder back to your sidebar navigation and dashboard overview?`,
          optionWithoutLabel: 'Unhide folder only',
          optionWithoutDesc: 'Restores this folder to the sidebar without changing its subfolders.',
          optionWithLabel: 'Unhide folder and all subfolders',
          optionWithDesc: `Restores this folder and all ${childCount} nested subfolder(s) back to the sidebar.`,
          singleConfirmLabel: 'Unhide Folder',
          confirmVariant: 'emerald',
        };
      case 'delete':
      default:
        return {
          icon: Trash2,
          iconColor: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
          title: `Delete "${folderName}"`,
          description: hasSubfolders
            ? `This folder contains ${childCount} subfolder(s) and ${linkCount} bookmark(s). How would you like to delete it?`
            : `Delete this folder? Existing bookmarks will be safely preserved in your parent or general folder.`,
          optionWithoutLabel: 'Delete folder only (keep subfolders & links)',
          optionWithoutDesc: 'Subfolders are promoted to parent level. Direct bookmarks are safely moved to the parent folder.',
          optionWithLabel: 'Delete folder and all subfolders (Cascade)',
          optionWithDesc: `Permanently deletes this folder, all ${childCount} subfolder(s), and their bookmarks.`,
          singleConfirmLabel: 'Delete Folder',
          confirmVariant: 'rose',
        };
    }
  };

  const details = getDialogDetails();
  const Icon = details.icon;

  return createPortal(
    <AnimatePresence>
      {isOpen && activeFolder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Modal Content Window */}
          <motion.div
            role="dialog"
            aria-modal="true"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-[101] flex flex-col p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${details.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-tight">
                    {details.title}
                  </h3>
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-0.5">
                    Folder Management Option
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed mb-4">
              {details.description}
            </p>

            {/* If folder has subfolders: offer Choice 1 (without subfolders) and Choice 2 (with subfolders) */}
            {hasSubfolders ? (
              <div className="space-y-2.5 my-2">
                {/* Option A: Without subfolders (promote) */}
                <button
                  type="button"
                  onClick={() => onConfirmWithOptions(false)}
                  className="w-full text-left p-3.5 rounded-xl border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 dark:hover:border-serene-primary/50 hover:bg-serene-surfaceAlt-light/60 dark:hover:bg-serene-surfaceAlt-dark/60 transition-all group"
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-serene-text-primary dark:text-serene-text-darkPrimary group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark">
                    <FolderTree className="w-4 h-4 text-serene-primary shrink-0" />
                    <span>{details.optionWithoutLabel}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-serene-primary/10 text-serene-primary ml-auto">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-serene-text-muted mt-1 pl-6 leading-normal">
                    {details.optionWithoutDesc}
                  </p>
                </button>

                {/* Option B: With subfolders (cascade) */}
                <button
                  type="button"
                  onClick={() => onConfirmWithOptions(true)}
                  className={`w-full text-left p-3.5 rounded-xl border border-serene-border-light dark:border-serene-border-dark hover:bg-serene-surfaceAlt-light/60 dark:hover:bg-serene-surfaceAlt-dark/60 transition-all group ${
                    mode === 'delete'
                      ? 'hover:border-rose-500/50 hover:bg-rose-500/5'
                      : 'hover:border-amber-500/50 hover:bg-amber-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-serene-text-primary dark:text-serene-text-darkPrimary">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        mode === 'delete' ? 'text-rose-500' : 'text-amber-500'
                      }`}
                    />
                    <span>{details.optionWithLabel}</span>
                  </div>
                  <p className="text-[11px] text-serene-text-muted mt-1 pl-6 leading-normal">
                    {details.optionWithDesc}
                  </p>
                </button>
              </div>
            ) : (
              /* Single confirmation button if no subfolders */
              <div className="mt-2 mb-3">
                <button
                  type="button"
                  onClick={() => onConfirmWithOptions(false)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
                    mode === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : mode === 'hide'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {details.singleConfirmLabel}
                </button>
              </div>
            )}

            {/* Footer Cancel */}
            <div className="flex justify-end mt-3 pt-3 border-t border-serene-border-light dark:border-serene-border-dark">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
