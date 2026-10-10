import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UploadCloud,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  Filter,
  CheckCircle2,
  BookmarkCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Folder, LinkItem, ParsedBookmark } from '../../types';
import { parseNetscapeBookmarks } from '../../utils/bookmarkParser';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';
import { extractDomain, getFaviconUrl } from '../../utils/favicon';

interface BookmarkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  existingLinks: LinkItem[];
  onImportBookmarks: (newLinks: LinkItem[]) => void;
}

export const BookmarkImportModal: React.FC<BookmarkImportModalProps> = ({
  isOpen,
  onClose,
  folders,
  existingLinks,
  onImportBookmarks,
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setIsDragging(false);
    setFileName('');
    setBookmarks([]);
    setSkipDuplicates(true);
    setSearchFilter('');
    setSelectedFolderFilter('all');
    setIsImporting(false);
    setImportedCount(null);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const processHtmlFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = (e.target?.result as string) || '';
        const result = parseNetscapeBookmarks(content, existingLinks, folders);
        setBookmarks(result.bookmarks);
        setStep('preview');
      } catch (err: any) {
        alert('Could not parse bookmark file: ' + (err?.message || 'Invalid format'));
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processHtmlFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processHtmlFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Toggle selection for a single bookmark
  const toggleBookmarkSelect = (index: number) => {
    setBookmarks(prev =>
      prev.map((b, i) => (i === index ? { ...b, selected: !b.selected } : b))
    );
  };

  // Update target folder for an individual bookmark
  const changeBookmarkFolder = (index: number, folderId: string) => {
    setBookmarks(prev =>
      prev.map((b, i) => (i === index ? { ...b, folderId } : b))
    );
  };

  // Update tags for an individual bookmark
  const changeBookmarkTags = (index: number, tagsStr: string) => {
    const tags = tagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    setBookmarks(prev =>
      prev.map((b, i) => (i === index ? { ...b, tags } : b))
    );
  };

  // Handle bulk select/deselect
  const handleSelectAllVisible = (select: boolean) => {
    const visibleIndices = new Set(filteredBookmarks.map(b => b.originalIndex));
    setBookmarks(prev =>
      prev.map((b, i) => {
        if (visibleIndices.has(i)) {
          if (skipDuplicates && b.isDuplicate && select) {
            // Keep duplicate unselected if skip duplicates is on
            return { ...b, selected: false };
          }
          return { ...b, selected: select };
        }
        return b;
      })
    );
  };

  // Handle skip duplicates toggle
  const handleToggleSkipDuplicates = (skip: boolean) => {
    setSkipDuplicates(skip);
    if (skip) {
      setBookmarks(prev =>
        prev.map(b => (b.isDuplicate ? { ...b, selected: false } : b))
      );
    }
  };

  // Filtered bookmark list for UI
  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .map((b, originalIndex) => ({ ...b, originalIndex }))
      .filter(b => {
        if (selectedFolderFilter !== 'all' && b.folderId !== selectedFolderFilter) {
          return false;
        }
        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          const matchesTitle = b.title.toLowerCase().includes(q);
          const matchesUrl = b.url.toLowerCase().includes(q);
          const matchesTags = b.tags.some(t => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesUrl && !matchesTags) return false;
        }
        return true;
      });
  }, [bookmarks, selectedFolderFilter, searchFilter]);

  // Compute live counts
  const totalCount = bookmarks.length;
  const duplicateCount = bookmarks.filter(b => b.isDuplicate).length;
  const selectedCount = bookmarks.filter(b => b.selected).length;

  // Category counts based on current assigned folders in `bookmarks`
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(b => {
      counts[b.folderId] = (counts[b.folderId] || 0) + 1;
    });
    return counts;
  }, [bookmarks]);

  // Execute batch import
  const handleConfirmImport = () => {
    const toImport = bookmarks.filter(b => b.selected);
    if (toImport.length === 0) {
      alert('Please select at least one bookmark to import.');
      return;
    }

    setIsImporting(true);

    const now = Date.now();
    const newLinks: LinkItem[] = toImport.map((b, idx) => ({
      id: `imported-${now}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      title: b.title || extractDomain(b.url),
      url: b.url,
      description: b.sourceFolder ? `Imported from: ${b.sourceFolder}` : undefined,
      folderId: b.folderId || folders[0]?.id || 'f-misc',
      isFavorite: false,
      tags: b.tags || [],
      createdAt: b.addDate || now,
    }));

    onImportBookmarks(newLinks);
    setImportedCount(newLinks.length);
    setIsImporting(false);

    setTimeout(() => {
      handleModalClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={handleModalClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-4xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                  <BookmarkCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Import Browser Bookmarks
                  </h2>
                  <p className="text-xs text-serene-text-muted">
                    {step === 'upload'
                      ? 'Upload standard HTML bookmarks from Chrome, Firefox, Safari, Edge, or Brave'
                      : `Preview & auto-categorize bookmarks from "${fileName}"`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="p-1.5 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {step === 'upload' ? (
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Dropzone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                    isDragging
                      ? 'border-serene-primary bg-serene-primary-soft/40 dark:bg-serene-primary/10 scale-[0.99]'
                      : 'border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 bg-serene-surfaceAlt-light/30 dark:bg-serene-surfaceAlt-dark/30 hover:bg-serene-surfaceAlt-light/60'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-serene-primary/10 dark:bg-serene-primary/20 flex items-center justify-center text-serene-primary dark:text-serene-primary-dark shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                      Choose a bookmarks HTML file or drag & drop here
                    </h3>
                    <p className="text-xs text-serene-text-muted mt-1">
                      Supports standard Netscape bookmark export files (<code className="font-mono text-serene-primary dark:text-serene-primary-dark">bookmarks.html</code>)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 px-4 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    Browse Local File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Instructions Box */}
                <div className="p-4 rounded-xl border border-serene-border-light dark:border-serene-border-dark bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    <Sparkles className="w-4 h-4 text-serene-primary" />
                    <span>How to export bookmarks from your browser:</span>
                  </div>
                  <ul className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary space-y-1 pl-5 list-disc">
                    <li>
                      <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">Chrome / Brave / Edge:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-serene-surface-dark border text-[10px] font-mono">Ctrl+Shift+O</kbd> (or <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-serene-surface-dark border text-[10px] font-mono">Cmd+Shift+O</kbd>) &rarr; click <span className="font-semibold">&#8942;</span> menu in top right &rarr; <span className="font-semibold">Export bookmarks</span>.
                    </li>
                    <li>
                      <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">Firefox:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-serene-surface-dark border text-[10px] font-mono">Ctrl+Shift+O</kbd> &rarr; click <span className="font-semibold">Import and Backup</span> &rarr; <span className="font-semibold">Export Bookmarks to HTML...</span>
                    </li>
                    <li>
                      <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary">Safari:</strong> Go to <span className="font-semibold">File</span> menu &rarr; <span className="font-semibold">Export Bookmarks...</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Metrics & Filter Bar */}
                <div className="p-4 border-b border-serene-border-light dark:border-serene-border-dark bg-serene-surfaceAlt-light/20 dark:bg-serene-surfaceAlt-dark/20 space-y-3 shrink-0">
                  {/* Summary Metric Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark font-medium border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
                        Total: <strong className="font-bold">{totalCount}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                        New: <strong className="font-bold">{totalCount - duplicateCount}</strong>
                      </span>
                      {duplicateCount > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Duplicates: <strong className="font-bold">{duplicateCount}</strong>
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-serene-primary/10 text-serene-primary dark:text-serene-primary-dark font-medium border border-serene-primary/20">
                        Selected: <strong className="font-bold">{selectedCount}</strong>
                      </span>
                    </div>

                    {/* Duplicate toggle & Select All Buttons */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => handleToggleSkipDuplicates(e.target.checked)}
                          className="rounded border-serene-border-light text-serene-primary focus:ring-serene-primary"
                        />
                        <span>Skip duplicates</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSelectAllVisible(true)}
                        className="px-2 py-1 text-xs rounded bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary transition-colors"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAllVisible(false)}
                        className="px-2 py-1 text-xs rounded bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-secondary hover:text-serene-text-primary transition-colors"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  {/* Category Chips Distribution */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[11px] font-semibold text-serene-text-muted shrink-0 flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Filter Category:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFolderFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                        selectedFolderFilter === 'all'
                          ? 'bg-serene-primary text-white'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40'
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    {folders.map(f => {
                      const count = categoryCounts[f.id] || 0;
                      if (count === 0) return null;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFolderFilter(f.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 ${
                            selectedFolderFilter === f.id
                              ? 'bg-serene-primary text-white'
                              : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40'
                          }`}
                        >
                          <span>{f.name}</span>
                          <span className="opacity-70">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search bar inside preview */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter parsed bookmarks by title, URL, or tag..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-lg placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
                    />
                  </div>
                </div>

                {/* Bookmarks Preview List */}
                <div className="flex-1 overflow-y-auto divide-y divide-serene-border-light dark:divide-serene-border-dark">
                  {filteredBookmarks.length === 0 ? (
                    <div className="p-12 text-center text-serene-text-muted text-xs">
                      No bookmarks match current filters.
                    </div>
                  ) : (
                    filteredBookmarks.map((item) => (
                      <div
                        key={`${item.originalIndex}-${item.url}`}
                        className={`p-3 sm:px-4 sm:py-3 flex items-center gap-3 transition-colors ${
                          item.selected
                            ? 'bg-serene-primary-soft/15 dark:bg-serene-primary/5'
                            : 'opacity-70 bg-transparent'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleBookmarkSelect(item.originalIndex)}
                          className="shrink-0 text-serene-primary dark:text-serene-primary-dark"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-serene-text-muted" />
                          )}
                        </button>

                        {/* Favicon */}
                        <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={getFaviconUrl(item.url)}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              // Hide broken image icon
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Title & URL */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                              {item.title}
                            </span>
                            {item.isDuplicate && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                                Existing Duplicate
                              </span>
                            )}
                            {item.confidence && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                  item.confidence === 'high'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {item.matchedRule || `${item.confidence} rule`}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-serene-text-muted truncate flex items-center gap-1 mt-0.5">
                            <span className="truncate">{item.url}</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-serene-text-muted hover:text-serene-primary shrink-0"
                              title="Open link in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        {/* Folder Select Dropdown */}
                        <div className="shrink-0 w-36 sm:w-44">
                          <select
                            value={item.folderId}
                            onChange={(e) => changeBookmarkFolder(item.originalIndex, e.target.value)}
                            className="w-full text-xs py-1 px-2 rounded-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-1 focus:ring-serene-primary"
                          >
                            {folders.map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Tags Editor */}
                        <div className="shrink-0 hidden md:block w-36">
                          <input
                            type="text"
                            value={item.tags?.join(', ') || ''}
                            onChange={(e) => changeBookmarkTags(item.originalIndex, e.target.value)}
                            placeholder="tags (comma sep)"
                            className="w-full text-xs py-1 px-2 rounded-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-serene-border-light dark:border-serene-border-dark bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 flex items-center justify-between shrink-0">
              {step === 'preview' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-3 py-1.5 text-xs text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary dark:hover:text-serene-text-darkPrimary rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    &larr; Choose Different File
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-3.5 py-2 text-xs font-semibold text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={selectedCount === 0 || isImporting}
                      className="px-4 py-2 bg-serene-primary hover:bg-serene-primary-hover disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      {importedCount !== null ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Imported {importedCount} Bookmarks!</span>
                        </>
                      ) : isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Import {selectedCount} Bookmarks</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 text-xs font-semibold text-serene-text-secondary hover:text-serene-text-primary dark:text-serene-text-darkSecondary rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
