import React from 'react';
import { LinkItem, Folder } from '../../types';
import { clusterLinksByDomain } from '../../utils/domainCluster';
import { FaviconTile } from './FaviconTile';
import { DomainClusterTile } from './DomainClusterTile';

interface CompactIconGridProps {
  links: LinkItem[];
  folders: Folder[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (linkId: string, targetFolderId: string) => void;
  onLinkClick: (link: LinkItem) => void;
  openInNewTab?: boolean;
}

export const CompactIconGrid: React.FC<CompactIconGridProps> = ({
  links,
  folders,
  onToggleFavorite,
  onEdit,
  onDelete,
  onMoveFolder,
  onLinkClick,
  openInNewTab = true,
}) => {
  const { standaloneLinks, domainGroups } = clusterLinksByDomain(links, 2);

  if (links.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-serene-text-muted italic">
        No links saved in this folder.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Favicon Matrix (Flex Wrap with responsive gap) */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 animate-fadeIn">
        {/* Domain Clusters First */}
        {domainGroups.map((group) => (
          <DomainClusterTile
            key={group.id}
            group={group}
            folders={folders}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveFolder={onMoveFolder}
            onLinkClick={onLinkClick}
            openInNewTab={openInNewTab}
          />
        ))}

        {/* Standalone Link Tiles */}
        {standaloneLinks.map((link) => (
          <FaviconTile
            key={link.id}
            link={link}
            folders={folders}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveFolder={onMoveFolder}
            onLinkClick={onLinkClick}
            openInNewTab={openInNewTab}
          />
        ))}
      </div>
    </div>
  );
};
