import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Link as LinkIcon, Tag, Globe } from 'lucide-react';
import { LinkItem, Folder } from '../../types';
import { extractDomain, formatUrl } from '../../utils/favicon';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

interface AddEditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (linkData: Omit<LinkItem, 'id' | 'createdAt'>, linkId?: string) => void;
  editingLink?: LinkItem | null;
  folders: Folder[];
  defaultFolderId?: string;
  onOpenAddFolder?: () => void;
}

export const AddEditLinkModal: React.FC<AddEditLinkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLink,
  folders,
  defaultFolderId,
  onOpenAddFolder
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState(defaultFolderId || (folders[0]?.id ?? ''));
  const [tagsInput, setTagsInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (editingLink) {
      setUrl(editingLink.url);
      setTitle(editingLink.title);
      setDescription(editingLink.description || '');
      setFolderId(editingLink.folderId);
      setTagsInput(editingLink.tags ? editingLink.tags.join(', ') : '');
      setIsFavorite(editingLink.isFavorite);
    } else {
      setUrl('');
      setTitle('');
      setDescription('');
      setFolderId(defaultFolderId || (folders[0]?.id ?? ''));
      setTagsInput('');
      setIsFavorite(false);
    }
  }, [editingLink, isOpen, defaultFolderId, folders]);

  // Auto-fill title from domain if title is empty
  const handleUrlBlur = () => {
    if (url && !title) {
      const domain = extractDomain(url);
      const capitalized = domain.charAt(0).toUpperCase() + domain.slice(1);
      setTitle(capitalized);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const formatted = formatUrl(url);
    const finalTitle = title.trim() || extractDomain(url);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    onSave(
      {
        url: formatted,
        title: finalTitle,
        description: description.trim(),
        folderId: folderId || folders[0]?.id || 'default',
        tags,
        isFavorite,
      },
      editingLink ? editingLink.id : undefined
    );

    onClose();
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
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-10"
          >
        {/* Header */}
        <div className="p-4 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              {editingLink ? 'Edit Resource' : 'Add New Resource'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* URL */}
          <div>
            <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary mb-1.5">
              URL / Web Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-2.5 text-serene-text-muted" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com or canvas.edu"
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary mb-1.5">
              Title / Resource Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics 101 Lecture Notes"
              className="w-full px-3 py-2 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
            />
          </div>

          {/* Folder & Star Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Folder / Category
                </label>
                {onOpenAddFolder && (
                  <button
                    type="button"
                    onClick={onOpenAddFolder}
                    className="text-[11px] text-serene-primary dark:text-serene-primary-dark hover:underline"
                  >
                    + New
                  </button>
                )}
              </div>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-1 focus:ring-serene-primary"
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary mb-1.5">
                Pin to Favorites
              </label>
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  isFavorite
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
                    : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary dark:text-serene-text-darkSecondary'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-serene-text-muted'}`} />
                <span>{isFavorite ? 'Starred Favorite' : 'Not Starred'}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note or reminder about this link"
              className="w-full px-3 py-2 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary mb-1.5">
              Tags (comma-separated)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-2.5 text-serene-text-muted" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Study, Syllabus, Urgent, Project"
                className="w-full pl-9 pr-3 py-2 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-serene-border-light dark:border-serene-border-dark flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-lg hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white rounded-lg shadow-sm transition-colors"
            >
              {editingLink ? 'Update Link' : 'Add Link'}
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
