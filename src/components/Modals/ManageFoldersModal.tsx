import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  SlidersHorizontal,
  ChevronDown,
  Eye,
  EyeOff,
  FolderTree
} from 'lucide-react';
import { Folder, FolderColor, LinkItem } from '../../types';
import { FOLDER_ICONS, FOLDER_COLOR_MAP, getFolderIcon } from '../../utils/icons';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';
import { 
  getFlattenedFolderHierarchy, 
  formatFolderHierarchyName,
  hideFolderWithSubfolders,
  hideFolderWithoutSubfolders,
  unhideFolderWithSubfolders,
  unhideFolderWithoutSubfolders,
  deleteFolderWithSubfolders,
  deleteFolderWithoutSubfolders
} from '../../utils/folderTree';
import { FolderActionDialog, FolderActionMode } from './FolderActionDialog';

interface ManageFoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  links?: LinkItem[];
  onSaveFolders: (folders: Folder[]) => void;
  onSaveFoldersAndLinks?: (folders: Folder[], links: LinkItem[]) => void;
}

const AVAILABLE_COLORS: FolderColor[] = [
  'forest',
  'emerald',
  'slate',
  'amber',
  'sky',
  'indigo',
  'rose',
  'purple',
];

const AVAILABLE_ICONS = Object.keys(FOLDER_ICONS);

export const ManageFoldersModal: React.FC<ManageFoldersModalProps> = ({
  isOpen,
  onClose,
  folders,
  links = [],
  onSaveFolders,
  onSaveFoldersAndLinks,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'hidden'>('active');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('forest');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');
  const [editingIconFolderId, setEditingIconFolderId] = useState<string | null>(null);

  // Dialog state for hide/unhide/delete
  const [actionFolder, setActionFolder] = useState<Folder | null>(null);
  const [actionMode, setActionMode] = useState<FolderActionMode>('hide');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);

  const activeFolders = folders.filter((f) => !f.isHidden);
  const hiddenFolders = folders.filter((f) => f.isHidden);

  const openActionDialog = (folder: Folder, mode: FolderActionMode) => {
    setActionFolder(folder);
    setActionMode(mode);
    setIsActionDialogOpen(true);
  };

  const handleConfirmFolderAction = (withSubfolders: boolean) => {
    if (!actionFolder) return;

    if (actionMode === 'hide') {
      const updated = withSubfolders
        ? hideFolderWithSubfolders(folders, actionFolder.id)
        : hideFolderWithoutSubfolders(folders, actionFolder.id);
      onSaveFolders(updated);
    } else if (actionMode === 'unhide') {
      const updated = withSubfolders
        ? unhideFolderWithSubfolders(folders, actionFolder.id)
        : unhideFolderWithoutSubfolders(folders, actionFolder.id);
      onSaveFolders(updated);
    } else if (actionMode === 'delete') {
      if (folders.length <= 1) {
        alert('You must have at least one folder.');
        setIsActionDialogOpen(false);
        setActionFolder(null);
        return;
      }
      const res = withSubfolders
        ? deleteFolderWithSubfolders(folders, links, actionFolder.id)
        : deleteFolderWithoutSubfolders(folders, links, actionFolder.id);
      if (onSaveFoldersAndLinks) {
        onSaveFoldersAndLinks(res.updatedFolders, res.updatedLinks);
      } else {
        onSaveFolders(res.updatedFolders);
      }
    }

    setIsActionDialogOpen(false);
    setActionFolder(null);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      description: newFolderDesc.trim(),
      color: newFolderColor,
      icon: newFolderIcon,
      parentId: newFolderParentId ? newFolderParentId : undefined,
      order: folders.length + 1,
      isCollapsed: false,
      isHidden: false,
    };

    onSaveFolders([...folders, newFolder]);
    setNewFolderName('');
    setNewFolderDesc('');
    setNewFolderColor('forest');
    setNewFolderIcon('Folder');
    setNewFolderParentId('');
  };

  const handleUpdateFolder = (id: string, updates: Partial<Folder>) => {
    onSaveFolders(
      folders.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose} 
          />
          <motion.div 
            role="dialog"
            aria-modal="true"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
        {/* Header */}
        <div className="p-4 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Manage Folders & Icon Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Create New Folder Form */}
          <form onSubmit={handleCreateFolder} className="p-4 bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-3.5">
            <div className="text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span>Create New Folder</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                  Folder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Research, Side Projects"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="e.g. Papers, articles & notes"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
                />
              </div>
            </div>

            {/* Parent Folder selection (for nesting up to 5 levels) */}
            <div>
              <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                Parent Folder (Optional — nest up to 5 levels)
              </label>
              <select
                value={newFolderParentId}
                onChange={(e) => setNewFolderParentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-1 focus:ring-serene-primary"
              >
                <option value="">None (Top-Level Root Folder)</option>
                {getFlattenedFolderHierarchy(folders).map(({ folder, displayName, level }) => (
                  <option key={folder.id} value={folder.id} disabled={level >= 4}>
                    {displayName} {level >= 4 ? '(Max 5 levels)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Icon Library Grid for New Folder */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Choose Folder Icon ({AVAILABLE_ICONS.length} available)
                </label>
                <span className="text-[10px] text-serene-text-muted">
                  Selected: <strong className="text-serene-primary dark:text-serene-primary-dark">{newFolderIcon}</strong>
                </span>
              </div>
              
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-1.5 p-2 bg-white dark:bg-serene-surface-dark rounded-xl border border-serene-border-light dark:border-serene-border-dark max-h-32 overflow-y-auto">
                {AVAILABLE_ICONS.map((iconName) => {
                  const IconComp = FOLDER_ICONS[iconName];
                  const isSelected = newFolderIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewFolderIcon(iconName)}
                      title={iconName}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-serene-primary text-white shadow-2xs scale-105 ring-2 ring-serene-primary/30'
                          : 'text-serene-text-secondary hover:text-serene-text-primary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                Color Accent
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVAILABLE_COLORS.map((c) => {
                  const info = FOLDER_COLOR_MAP[c];
                  const isSelected = newFolderColor === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${info.dot} ${
                        isSelected ? 'ring-2 ring-offset-2 ring-serene-primary dark:ring-offset-serene-surface-dark scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Folder</span>
            </button>
          </form>

          {/* Folders Management Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-serene-border-light dark:border-serene-border-dark pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-serene-primary text-white shadow-2xs'
                    : 'text-serene-text-secondary hover:text-serene-text-primary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Active Folders ({activeFolders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hidden')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'hidden'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-serene-text-secondary hover:text-serene-text-primary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hidden Folders ({hiddenFolders.length})</span>
              </button>
            </div>

            {/* TAB 1: ACTIVE FOLDERS */}
            {activeTab === 'active' && (
              <div className="space-y-2">
                {activeFolders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-serene-text-muted bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-xl border border-dashed border-serene-border-light dark:border-serene-border-dark">
                    No active folders found. Create one above!
                  </div>
                ) : (
                  activeFolders.map((folder) => {
                    const IconComp = getFolderIcon(folder.icon);
                    const colorInfo = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.forest;
                    const isPickingIcon = editingIconFolderId === folder.id;
                    const childCount = folders.filter((f) => f.parentId === folder.id).length;

                    return (
                      <div
                        key={folder.id}
                        className="p-3 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Clickable Icon button to change icon */}
                            <button
                              type="button"
                              onClick={() => setEditingIconFolderId(isPickingIcon ? null : folder.id)}
                              title="Click to change icon"
                              className={`p-2 rounded-lg border ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text} shrink-0 hover:scale-105 transition-transform flex items-center gap-1`}
                            >
                              <IconComp className="w-4 h-4" />
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={folder.name}
                                onChange={(e) => handleUpdateFolder(folder.id, { name: e.target.value })}
                                className="text-xs font-semibold bg-transparent text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:bg-serene-surfaceAlt-light dark:focus:bg-serene-surfaceAlt-dark px-1.5 py-0.5 rounded border border-transparent focus:border-serene-border-light dark:focus:border-serene-border-dark w-full"
                              />
                              <div className="flex items-center gap-2 px-1.5">
                                {folder.parentId && (
                                  <span className="text-[10px] text-serene-text-muted truncate">
                                    ↳ in {formatFolderHierarchyName(folder, folders)}
                                  </span>
                                )}
                                {childCount > 0 && (
                                  <span className="text-[10px] text-serene-primary dark:text-serene-primary-dark font-mono">
                                    ({childCount} subfolder{childCount > 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Color picker & Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1">
                              {AVAILABLE_COLORS.map((c) => {
                                const info = FOLDER_COLOR_MAP[c];
                                const isSelected = folder.color === c;
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleUpdateFolder(folder.id, { color: c })}
                                    className={`w-4 h-4 rounded-full transition-all ${info.dot} ${
                                      isSelected ? 'scale-125 ring-1 ring-offset-1 ring-black/40' : 'opacity-40 hover:opacity-80'
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Hide folder action button */}
                            <button
                              type="button"
                              onClick={() => openActionDialog(folder, 'hide')}
                              title="Hide folder (with or without subfolders)"
                              className="p-1.5 text-serene-text-muted hover:text-amber-500 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors ml-1"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete folder action button */}
                            <button
                              type="button"
                              onClick={() => openActionDialog(folder, 'delete')}
                              title="Delete Folder (with or without subfolders)"
                              className="p-1.5 text-serene-text-muted hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Icon Picker */}
                        {isPickingIcon && (
                          <div className="pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 animate-fadeIn">
                            <div className="text-[10px] text-serene-text-muted mb-1.5 font-medium">
                              Select new icon for {folder.name}:
                            </div>
                            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-1.5 p-2 bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 rounded-xl max-h-28 overflow-y-auto">
                              {AVAILABLE_ICONS.map((iconName) => {
                                const ItemIcon = FOLDER_ICONS[iconName];
                                const isItemSel = folder.icon === iconName;
                                return (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateFolder(folder.id, { icon: iconName });
                                      setEditingIconFolderId(null);
                                    }}
                                    title={iconName}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                                      isItemSel
                                        ? 'bg-serene-primary text-white shadow-2xs scale-105'
                                        : 'text-serene-text-secondary hover:text-serene-text-primary hover:bg-white dark:hover:bg-serene-surface-dark'
                                    }`}
                                  >
                                    <ItemIcon className="w-3.5 h-3.5" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: HIDDEN FOLDERS */}
            {activeTab === 'hidden' && (
              <div className="space-y-2">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300">
                  Hidden folders are excluded from your sidebar navigation and dashboard overview. You can unhide them at any time below.
                </div>

                {hiddenFolders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-serene-text-muted bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-xl border border-dashed border-serene-border-light dark:border-serene-border-dark">
                    No folders are currently hidden.
                  </div>
                ) : (
                  hiddenFolders.map((folder) => {
                    const IconComp = getFolderIcon(folder.icon);
                    const colorInfo = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.forest;
                    const childCount = folders.filter((f) => f.parentId === folder.id).length;

                    return (
                      <div
                        key={folder.id}
                        className="p-3 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl flex items-center justify-between gap-3 shadow-2xs opacity-85 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg border ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text} shrink-0`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                                {folder.name}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                                Hidden
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-serene-text-muted">
                              {folder.parentId && (
                                <span className="truncate">↳ in {formatFolderHierarchyName(folder, folders)}</span>
                              )}
                              {childCount > 0 && (
                                <span className="font-mono">({childCount} subfolder{childCount > 1 ? 's' : ''})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Unhide and Delete buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openActionDialog(folder, 'unhide')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="Unhide this folder"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Unhide</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openActionDialog(folder, 'delete')}
                            className="p-1.5 text-serene-text-muted hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete this folder permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-serene-border-light dark:border-serene-border-dark flex justify-end bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
          </motion.div>

          {/* Folder Action Dialog for Hide / Unhide / Delete */}
          <FolderActionDialog
            isOpen={isActionDialogOpen}
            mode={actionMode}
            folder={actionFolder}
            childCount={actionFolder ? folders.filter((f) => f.parentId === actionFolder.id).length : 0}
            linkCount={actionFolder ? links.filter((l) => l.folderId === actionFolder.id).length : 0}
            onClose={() => {
              setIsActionDialogOpen(false);
              setActionFolder(null);
            }}
            onConfirmWithOptions={handleConfirmFolderAction}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
