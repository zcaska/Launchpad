import React, { useState, useRef, useEffect } from 'react';
import { FolderInput } from 'lucide-react';
import { Folder } from '../../types';

interface MoveToFolderMenuProps {
  folders: Folder[];
  currentFolderId?: string;
  onMove: (targetFolderId: string) => void;
}

/**
 * Folder picker for a single bookmark. The tiles already receive folders +
 * onMoveFolder from App; this just surfaces them in the UI.
 */
export const MoveToFolderMenu: React.FC<MoveToFolderMenuProps> = ({
  folders,
  currentFolderId,
  onMove,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (folders.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Move to another folder"
        className="text-serene-text-secondary hover:text-serene-primary flex items-center gap-1 font-medium"
      >
        <FolderInput className="w-3 h-3" />
        <span>Move</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-50 w-48 max-h-56 overflow-y-auto bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-modal py-1 text-[11px] animate-scaleIn">
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onMove(f.id);
              }}
              className={`w-full px-3 py-1.5 flex items-center gap-2 text-left truncate hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark ${
                f.id === currentFolderId
                  ? 'text-serene-primary dark:text-serene-primary-dark font-semibold'
                  : 'text-serene-text-secondary dark:text-serene-text-darkSecondary'
              }`}
            >
              <FolderInput className="w-3 h-3 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};