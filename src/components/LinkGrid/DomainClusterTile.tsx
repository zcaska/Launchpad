import React, { useState } from 'react';
import { Layers, Globe, Star, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { DomainGroup } from '../../utils/domainCluster';
import { LinkItem, Folder } from '../../types';

interface DomainClusterTileProps {
  group: DomainGroup;
  folders: Folder[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (linkId: string, targetFolderId: string) => void;
  onLinkClick: (link: LinkItem) => void;
  openInNewTab?: boolean;
}

export const DomainClusterTile: React.FC<DomainClusterTileProps> = ({
  group,
  onToggleFavorite,
  onEdit,
  onDelete,
  onLinkClick,
  openInNewTab = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col">
      {/* The Compact Domain Tile */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-200 border cursor-pointer ${
          isExpanded
            ? 'bg-serene-primary/10 dark:bg-serene-primary/20 border-serene-primary text-serene-primary dark:text-serene-primary-dark shadow-xs scale-105'
            : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 shadow-subtle hover:shadow-card'
        } hover:scale-105 active:scale-95`}
        title={`${group.displayName} (${group.links.length} bookmarks) - Click to view sub-pages`}
      >
        {!imgError && group.faviconUrl ? (
          <img
            src={group.faviconUrl}
            alt=""
            className="w-6 h-6 object-contain pointer-events-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe className="w-5 h-5 text-serene-text-muted" />
        )}

        {/* Multi-item badge */}
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-serene-primary text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs border border-white dark:border-serene-surface-dark">
          {group.links.length}
        </span>
      </button>

      {/* Inline Sub-Folder Tray */}
      {isExpanded && (
        <div className="col-span-full w-full my-3 p-3 sm:p-4 bg-serene-surfaceAlt-light/90 dark:bg-serene-surfaceAlt-dark/90 border border-serene-border-light dark:border-serene-border-dark rounded-2xl animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-serene-primary dark:text-serene-primary-dark">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                {group.displayName} Repositories & Sub-pages
              </h4>
              <span className="text-[10px] font-mono text-serene-text-muted">
                ({group.links.length} items)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline cursor-pointer"
            >
              Close Tray
            </button>
          </div>

          <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-2.5">
            {group.links.map((link) => (
              <div
                key={link.id}
                className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 shadow-2xs hover:shadow-subtle transition-all"
              >
                <a
                  href={link.url}
                  target={openInNewTab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={() => onLinkClick(link)}
                  className="min-w-0 flex-1 flex items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark truncate">
                      {link.title}
                    </div>
                    {link.description && (
                      <p className="text-[10px] text-serene-text-muted truncate mt-0.5">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-serene-text-muted group-hover:text-serene-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                </a>

                <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-serene-border-light/40 dark:border-serene-border-dark/40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(link.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      link.isFavorite ? 'text-amber-500' : 'text-serene-text-muted hover:text-amber-500'
                    }`}
                    title={link.isFavorite ? 'Starred' : 'Star'}
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(link);
                    }}
                    className="p-1 text-serene-text-muted hover:text-serene-primary rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(link.id);
                    }}
                    className="p-1 text-serene-text-muted hover:text-rose-500 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
