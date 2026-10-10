import React from 'react';
import { motion } from 'motion/react';
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
    <motion.div
      onClick={() => onOpenFolder(folder.id)}
      whileHover={{ y: -3, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.985 }}
      className="group relative bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:border-serene-primary/50 dark:hover:border-serene-primary/50 cursor-pointer flex flex-col justify-between min-h-[175px]"
    >
      {/* Top Section: Structured Grid for Icon, Title, Counts & Actions */}
      <div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {/* 1. Clean Folder Icon (Aligned with visual harmony) */}
          <div className={`w-8 h-8 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colorInfo.text}`}>
            <IconComponent className="w-6 h-6 stroke-[2.2]" />
          </div>

          {/* 2. Folder Name & Bookmark Count */}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors truncate leading-tight">
              {folder.name}
            </h3>
            <span className="text-[11px] font-mono text-serene-text-muted block mt-0.5">
              {links.length} {links.length === 1 ? 'bookmark' : 'bookmarks'}
            </span>
          </div>

          {/* 3. Quick Add Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddLinkToFolder(folder.id);
            }}
            title={`Quick add link to ${folder.name}`}
            className="p-1.5 text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark rounded-lg hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Folder Description */}
        {folder.description && (
          <p className="mt-3 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary line-clamp-2 leading-relaxed">
            {folder.description}
          </p>
        )}
      </div>

      {/* Bottom Section: Grid aligned Site Favicons and Open Button */}
      <div className="pt-3 border-t border-serene-border-light/60 dark:border-serene-border-dark/60 grid grid-cols-[1fr_auto] items-center gap-3 mt-4">
        {/* Site Icons Stack */}
        <div className="flex items-center min-w-0">
          {previewLinks.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
              {previewLinks.map((link) => {
                const favUrl = getFaviconUrl(link.url, 32);
                return (
                  <div
                    key={link.id}
                    title={link.title}
                    className="w-6 h-6 rounded-md bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 border border-serene-border-light dark:border-serene-border-dark flex items-center justify-center overflow-hidden shadow-2xs shrink-0"
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
                <span className="text-[10px] font-mono text-serene-text-muted pl-1">
                  +{links.length - 4}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-serene-text-muted italic">Empty folder</span>
          )}
        </div>

        {/* Open Action (Grid-aligned) */}
        <div className="flex items-center gap-1 text-xs font-semibold text-serene-primary dark:text-serene-primary-dark group-hover:translate-x-0.5 transition-transform shrink-0 justify-end">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
};
