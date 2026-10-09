import React, { useState, useRef } from 'react';
import { Star, MoreVertical, Edit2, Trash2, Globe } from 'lucide-react';
import { LinkItem, Folder } from '../../types';
import { getFaviconUrl, extractDomain } from '../../utils/favicon';

interface FaviconTileProps {
  link: LinkItem;
  folders: Folder[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (linkId: string, targetFolderId: string) => void;
  onLinkClick: (link: LinkItem) => void;
  openInNewTab?: boolean;
}

export const FaviconTile: React.FC<FaviconTileProps> = ({
  link,
  onToggleFavorite,
  onEdit,
  onDelete,
  onLinkClick,
  openInNewTab = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [alignH, setAlignH] = useState<'left' | 'center' | 'right'>('center');
  const [alignV, setAlignV] = useState<'top' | 'bottom'>('top');
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const faviconUrl = getFaviconUrl(link.url, 48);
  const domain = extractDomain(link.url);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Check horizontal boundary
      if (rect.left < 300) {
        setAlignH('left');
      } else if (window.innerWidth - rect.right < 270) {
        setAlignH('right');
      } else {
        setAlignH('center');
      }

      // Check vertical boundary (if near top of screen, flip below)
      if (rect.top < 200) {
        setAlignV('bottom');
      } else {
        setAlignV('top');
      }
    }

    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowMenu(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    onLinkClick(link);
    if (!openInNewTab) {
      e.preventDefault();
      window.location.href = link.url;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 44x44px Squircle Tile */}
      <a
        href={link.url}
        target={openInNewTab ? '_blank' : '_self'}
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-200 border ${
          link.isFavorite
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 shadow-xs'
            : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 dark:hover:border-serene-primary/50 shadow-subtle hover:shadow-card'
        } hover:scale-105 active:scale-95`}
        title={link.title}
      >
        {!imgError && faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-6 h-6 object-contain pointer-events-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe className="w-5 h-5 text-serene-text-muted" />
        )}

        {/* Favorite indicator pip */}
        {link.isFavorite && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
        )}
      </a>

      {/* Floating Progressive Disclosure Preview Card with Clamped Alignment */}
      {isHovered && (
        <div 
          className={`absolute z-50 w-64 p-3 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal animate-fadeIn pointer-events-auto ${
            alignV === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            alignH === 'left' 
              ? 'left-0' 
              : alignH === 'right' 
              ? 'right-0' 
              : 'left-1/2 -translate-x-1/2'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug line-clamp-2">
                {link.title}
              </h4>
              <p className="text-[10px] font-mono text-serene-text-muted mt-0.5 truncate">
                {domain}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(link.id);
                }}
                className={`p-1 rounded-md transition-colors ${
                  link.isFavorite ? 'text-amber-500' : 'text-serene-text-muted hover:text-amber-500'
                }`}
                title={link.isFavorite ? 'Unfavorite' : 'Favorite'}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-serene-text-muted hover:text-serene-text-primary rounded-md"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {link.description && (
            <p className="text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1.5 line-clamp-2 leading-relaxed">
              {link.description}
            </p>
          )}

          {link.tags && link.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {link.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Quick Menu Options */}
          {showMenu && (
            <div className="mt-2 pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 flex items-center justify-between text-[10px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(link);
                  setIsHovered(false);
                }}
                className="text-serene-text-secondary hover:text-serene-primary flex items-center gap-1 font-medium"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(link.id);
                  setIsHovered(false);
                }}
                className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Tooltip caret with adaptive positioning */}
          <div 
            className={`absolute w-2 h-2 bg-white dark:bg-serene-surface-dark ${
              alignV === 'top' 
                ? 'top-full -mt-px border-r border-b border-serene-border-light dark:border-serene-border-dark rotate-45' 
                : 'bottom-full -mb-px border-l border-t border-serene-border-light dark:border-serene-border-dark rotate-45'
            } ${
              alignH === 'left' 
                ? 'left-5' 
                : alignH === 'right' 
                ? 'right-5' 
                : 'left-1/2 -translate-x-1/2'
            }`} 
          />
        </div>
      )}
    </div>
  );
};
