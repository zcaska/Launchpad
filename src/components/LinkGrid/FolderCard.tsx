import React from 'react';
import { Plus, ArrowRight, Globe } from 'lucide-react';
import { Folder, LinkItem } from '../../types';
import { getFolderIcon, FOLDER_COLOR_MAP } from '../../utils/icons';
import { getFaviconUrl } from '../../utils/favicon';

interface FolderCardProps {
  folder: Folder;
  links: LinkItem[];
  onOpenFolder: (folderId: string) => void;
  onAddLinkToFolder: (folderId: string) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  links,
  onOpenFolder,
  onAddLinkToFolder,
}) => {
  const IconComponent = getFolderIcon(folder.icon);
  const colorInfo = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.forest;

  // Up to 4 preview links for mini favicons
  const previewLinks = links.slice(0, 4);

  return (
    <div
      onClick={() => onOpenFolder(folder.id)}
      className="group relative bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:border-serene-primary/50 dark:hover:border-serene-primary/50 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px]"
    >
      {/* Top Header: Boxy Folder Icon + Count Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Boxy Icon Squircle */}
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors">
              {folder.name}
            </h3>
            <span className="text-[11px] font-mono text-serene-text-muted">
              {links.length} {links.length === 1 ? 'bookmark' : 'bookmarks'}
            </span>
          </div>
        </div>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddLinkToFolder(folder.id);
          }}
          title={`Quick add link to ${folder.name}`}
          className="p-1.5 text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark rounded-lg hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark opacity-0 group-hover:opacity-100 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      {folder.description && (
        <p className="my-2.5 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary line-clamp-2 leading-relaxed">
          {folder.description}
        </p>
      )}

      {/* Bottom Row: Mini Favicons Preview Stack & Open Arrow */}
      <div className="pt-3 border-t border-serene-border-light/50 dark:border-serene-border-dark/50 flex items-center justify-between gap-2 mt-auto">
        {/* Favicons Stack */}
        <div className="flex items-center gap-1.5 min-w-0">
          {previewLinks.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
              {previewLinks.map((link) => {
                const favUrl = getFaviconUrl(link.url, 32);
                return (
                  <div
                    key={link.id}
                    title={link.title}
                    className="w-6 h-6 rounded-md bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark flex items-center justify-center overflow-hidden shadow-2xs shrink-0"
                  >
                    {favUrl ? (
                      <img
                        src={favUrl}
                        alt=""
                        className="w-3.5 h-3.5 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-3 h-3 text-serene-text-muted" />
                    )}
                  </div>
                );
              })}
              {links.length > 4 && (
                <span className="text-[10px] font-mono text-serene-text-muted pl-2.5">
                  +{links.length - 4}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-serene-text-muted italic">Empty folder</span>
          )}
        </div>

        {/* Explore Hint */}
        <div className="flex items-center gap-1 text-xs font-semibold text-serene-primary dark:text-serene-primary-dark group-hover:translate-x-0.5 transition-transform shrink-0">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
