import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Pencil, Link2, FolderInput, Copy, Trash2, ExternalLink, Check, X } from 'lucide-react';
import { LinkItem, Folder } from '../../types';
import { FaviconImage } from '../Common/FaviconImage';
import { useSidebarDnd } from './SidebarDnd';

export interface BookmarkRowProps {
  link: LinkItem;
  folders: Folder[];
  indentPx: number;
  isCollapsed: boolean;
  onRename: (id: string, title: string) => void;
  onChangeUrl: (id: string, url: string) => string | null; // returns error text or null
  onMove: (id: string, folderId: string) => void;
  onDropLink: (dragId: string, anchorId: string, position: 'before' | 'after') => void;
  onDelete: (id: string) => void;
  onRowClick?: () => void;
}

const isValidUrl = (v: string) => {
  try {
    const u = new URL(/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);
    return !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
};

export const BookmarkRow: React.FC<BookmarkRowProps> = ({
  link, folders, indentPx, isCollapsed,
  onRename, onChangeUrl, onMove, onDropLink, onDelete, onRowClick,
}) => {
  const { drag, drop, setDrag, setDrop } = useSidebarDnd();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<'name' | 'url' | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const startEdit = (kind: 'name' | 'url') => {
    setDraft(kind === 'name' ? link.title : link.url);
    setError(null);
    setEditing(kind);
    setMenuOpen(false);
  };

  const commit = () => {
    const value = draft.trim();
    if (editing === 'name') {
      if (!value) { setError('Name cannot be empty'); return; }
      if (value !== link.title) onRename(link.id, value);
    } else if (editing === 'url') {
      if (!value) { setError('URL cannot be empty'); return; }
      if (!isValidUrl(value)) { setError('Enter a valid URL'); return; }
      const err = onChangeUrl(link.id, value);
      if (err) { setError(err); return; }
    }
    setEditing(null);
    setError(null);
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1400); }
    catch { /* clipboard blocked; ignore */ }
    setMenuOpen(false);
  };

  const isDragging = drag?.kind === 'link' && drag.id === link.id;
  const dropPos = drop?.kind === 'link' && drop.id === link.id ? drop.position : null;

  if (isCollapsed) return null;

  return (
    <div
      ref={wrapRef}
      className={`relative group transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${dropPos === 'inside' ? 'bg-serene-primary/10 rounded-lg' : ''}`}
      draggable={editing === null}
      onDragStart={(e) => {
        e.stopPropagation();
        setDrag({ kind: 'link', id: link.id });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', link.id);
      }}
      onDragEnd={() => { setDrag(null); setDrop(null); }}
      onDragOver={(e) => {
        if (drag?.kind !== 'link' || drag.id === link.id) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
        setDrop({ kind: 'link', id: link.id, position: pos });
      }}
      onDrop={(e) => {
        if (drag?.kind !== 'link' || drag.id === link.id) return;
        e.preventDefault();
        e.stopPropagation();
        // The tree owns the sibling list, so it resolves before/after into an insert index.
        const pos = drop?.position === 'before' ? 'before' : 'after';
        onDropLink(drag.id, link.id, pos);
        setDrag(null); setDrop(null);
      }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
    >
      {dropPos && (
        <span className={`absolute left-2 right-2 h-0.5 bg-serene-primary rounded-full z-10 ${dropPos === 'before' ? '-top-px' : '-bottom-px'}`} />
      )}

      {/* Editable forms replace the link row so rename/URL never touch the other field */}
      {editing ? (
        <div className="py-1 pr-2 rounded-lg bg-white dark:bg-serene-surface-dark border border-serene-primary/40 px-1.5" style={{ paddingLeft: indentPx }}>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                if (e.key === 'Escape') { e.preventDefault(); setEditing(null); setError(null); }
              }}
              aria-label={editing === 'name' ? 'Bookmark name' : 'Bookmark URL'}
              className="flex-1 min-w-0 bg-transparent text-[11px] outline-none text-serene-text-primary dark:text-serene-text-darkPrimary"
            />
            <button onClick={commit} aria-label="Save" className="p-0.5 rounded text-emerald-600 hover:bg-emerald-500/10">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => { setEditing(null); setError(null); }} aria-label="Cancel" className="p-0.5 rounded text-serene-text-muted hover:bg-black/5">
              <X className="w-3 h-3" />
            </button>
          </div>
          {error && <p className="text-[10px] text-rose-600 mt-0.5">{error}</p>}
        </div>
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          style={{ paddingLeft: `${indentPx}px` }}
          className="w-full flex items-center gap-2 py-1 pr-2.5 rounded-lg text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light/80 dark:hover:bg-serene-surfaceAlt-dark/80 font-medium transition-colors select-none"
          title={`${link.title}\n${link.url}`}
          onClick={(e) => { e.stopPropagation(); onRowClick?.(); }}
        >
          <div className="w-3.5 h-3.5 rounded shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FaviconImage url={link.url} alt="" size={32}
              className="w-3.5 h-3.5 object-contain pointer-events-none"
              iconClassName="w-2.5 h-2.5 text-serene-text-secondary dark:text-serene-text-darkSecondary" />
          </div>
          <span className="flex-1 truncate">{link.title}</span>
          {link.isFavorite && <StarDot />}
          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          {/* Three-dot: keeps touch users out of the right-click-only path */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label={`Actions for ${link.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-0.5 rounded text-serene-text-muted hover:text-serene-text-primary transition-opacity shrink-0"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </a>
      )}

      {menuOpen && !editing && (
        <div role="menu"
          className="absolute left-2 top-full mt-0.5 z-50 w-44 py-1 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-modal text-[11px]">
          <MenuBtn onClick={() => startEdit('name')}><Pencil className="w-3 h-3" /> Rename</MenuBtn>
          <MenuBtn onClick={() => startEdit('url')}><Link2 className="w-3 h-3" /> Edit URL</MenuBtn>
          <MenuBtn onClick={copyUrl}><Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy URL'}</MenuBtn>
          <div className="my-1 h-px bg-serene-border-light dark:bg-serene-border-dark" />
          <div className="px-3 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-serene-text-muted">Move to</div>
          <div className="max-h-36 overflow-y-auto">
            {folders.map((f) => (
              <button key={f.id} type="button" role="menuitem"
                onClick={() => { onMove(link.id, f.id); setMenuOpen(false); }}
                className={`w-full px-3 py-1 flex items-center gap-2 text-left truncate ${
                  f.id === link.folderId ? 'text-serene-primary font-semibold' : 'hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                }`}>
                <FolderInput className="w-3 h-3 shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
          <div className="my-1 h-px bg-serene-border-light dark:bg-serene-border-dark" />
          <MenuBtn danger onClick={() => { setMenuOpen(false); onDelete(link.id); }}>
            <Trash2 className="w-3 h-3" /> Delete
          </MenuBtn>
        </div>
      )}
    </div>
  );
};

/** Menu button used by the contextual menu. */
const MenuBtn: React.FC<{ onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({ onClick, danger, children }) => (
  <button type="button" role="menuitem" onClick={onClick}
    className={`w-full px-3 py-1.5 flex items-center gap-2 text-left ${danger ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'}`}>
    {children}
  </button>
);

const StarDot = () => (
  <svg className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);