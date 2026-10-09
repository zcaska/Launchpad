import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus
} from 'lucide-react';
import { Folder, LinkItem } from '../../types';
import { CompactIconGrid } from './CompactIconGrid';
import { getFolderIcon, FOLDER_COLOR_MAP } from '../../utils/icons';

interface CategorySectionProps {
  folder: Folder;
  links: LinkItem[];
  allFolders: Folder[];
  onToggleFavorite: (id: string) => void;
  onEditLink: (link: LinkItem) => void;
  onDeleteLink: (id: string) => void;
  onMoveFolder: (linkId: string, targetFolderId: string) => void;
  onAddLinkToFolder: (folderId: string) => void;
  onLinkClick: (link: LinkItem) => void;
  openInNewTab?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  folder,
  links,
  allFolders,
  onToggleFavorite,
  onEditLink,
  onDeleteLink,
  onMoveFolder,
  onAddLinkToFolder,
  onLinkClick,
  openInNewTab = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(folder.isCollapsed ?? false);

  const IconComponent = getFolderIcon(folder.icon);
  const colorInfo = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.forest;

  return (
    <section className="space-y-3">
      {/* Folder Header */}
      <div className="flex items-center justify-between gap-3 group">
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2.5 cursor-pointer select-none min-w-0"
        >
          {/* Icon Badge */}
          <div className={`p-1.5 rounded-lg border ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text} shrink-0`}>
            <IconComponent className="w-4 h-4" />
          </div>

          {/* Title & Count */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
              {folder.name}
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border border-serene-border-light dark:border-serene-border-dark shrink-0">
              {links.length}
            </span>
          </div>

          {/* Collapse Chevron */}
          <button 
            type="button"
            className="text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors p-0.5"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Action: Add link to this folder */}
        <div className="flex items-center gap-2">
          {folder.description && (
            <span className="hidden md:inline-block text-xs text-serene-text-muted truncate max-w-sm">
              {folder.description}
            </span>
          )}
          <button
            onClick={() => onAddLinkToFolder(folder.id)}
            title={`Add link to ${folder.name}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark px-2 py-1 rounded-md hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark border border-transparent hover:border-serene-border-light dark:border-serene-border-dark transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Compact Favicon & Domain Clusters Grid */}
      {!isCollapsed && (
        <>
          {links.length > 0 ? (
            <CompactIconGrid
              links={links}
              folders={allFolders}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
              onMoveFolder={onMoveFolder}
              onLinkClick={onLinkClick}
              openInNewTab={openInNewTab}
            />
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-serene-border-light dark:border-serene-border-dark text-center bg-white/30 dark:bg-serene-surface-dark/30">
              <p className="text-xs text-serene-text-muted mb-2">No links saved in this folder yet.</p>
              <button
                onClick={() => onAddLinkToFolder(folder.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first resource to {folder.name}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
