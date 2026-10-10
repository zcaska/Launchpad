import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Star, 
  ExternalLink, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Globe,
  FolderInput
} from 'lucide-react';
import { LinkItem, Folder } from '../../types';
import { extractDomain, getFaviconUrl, formatUrl } from '../../utils/favicon';

interface LinkCardProps {
  link: LinkItem;
  folders: Folder[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (linkId: string, targetFolderId: string) => void;
  onLinkClick: (link: LinkItem) => void;
  openInNewTab?: boolean;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  folders,
  onToggleFavorite,
  onEdit,
  onDelete,
  onMoveFolder,
  onLinkClick,
  openInNewTab = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const domain = extractDomain(link.url);
  const faviconUrl = getFaviconUrl(link.url);
  const fullUrl = formatUrl(link.url);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    setShowMenu(false);
  };

  const handleCardClick = () => {
    onLinkClick(link);
    window.open(fullUrl, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
  };

  return (
    <motion.div
      onClick={handleCardClick}
      whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
      whileTap={{ scale: 0.985 }}
      className="group relative bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl p-3.5 hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:border-serene-primary/40 dark:hover:border-serene-primary/40 cursor-pointer flex flex-col justify-between min-h-[110px]"
    >
      {/* Top Row: Favicon, Title, Favorite & Actions */}
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Favicon / Icon */}
            <div className="w-8 h-8 rounded-lg bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light/60 dark:border-serene-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              {!imgError && faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt={link.title}
                  className="w-5 h-5 object-contain"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              ) : (
                <Globe className="w-4 h-4 text-serene-text-muted" />
              )}
            </div>

            {/* Title & Domain */}
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors">
                {link.title}
              </h3>
              <p className="text-[11px] text-serene-text-muted truncate font-mono">
                {domain}
              </p>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Favorite Star */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(link.id);
              }}
              title={link.isFavorite ? "Remove favorite" : "Mark as favorite"}
              className={`p-1 rounded-md transition-all ${
                link.isFavorite 
                  ? 'text-amber-500 fill-amber-500 opacity-100' 
                  : 'text-serene-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-500'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${link.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Context Menu Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                title="More options"
                className="p-1 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-md hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }} 
                  />
                  <div className="absolute right-0 top-6 w-44 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl shadow-modal py-1.5 z-50 animate-scaleIn text-xs">
                    <button
                      onClick={handleCopy}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(link);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Link</span>
                    </button>

                    {/* Move to folder submenu */}
                    <div className="border-t border-serene-border-light dark:border-serene-border-dark my-1" />
                    <div className="px-3 py-1 text-[10px] font-semibold text-serene-text-muted uppercase">
                      Move Folder:
                    </div>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onMoveFolder(link.id, f.id);
                        }}
                        className={`w-full px-3 py-1 flex items-center gap-2 text-[11px] truncate ${
                          link.folderId === f.id
                            ? 'text-serene-primary dark:text-serene-primary-dark font-semibold'
                            : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:bg-serene-surfaceAlt-light dark:hover:bg-serene-surfaceAlt-dark'
                        }`}
                      >
                        <FolderInput className="w-3 h-3 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}

                    <div className="border-t border-serene-border-light dark:border-serene-border-dark my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(link.id);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {link.description && (
          <p className="mt-2 text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary line-clamp-2 leading-relaxed">
            {link.description}
          </p>
        )}
      </div>

      {/* Bottom Row: Tags & External launch hint */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-serene-border-light/40 dark:border-serene-border-dark/40">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {link.tags && link.tags.length > 0 ? (
            link.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light/60 dark:border-serene-border-dark/60 font-medium"
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-serene-text-muted">Launch link</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-serene-primary dark:text-serene-primary-dark opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Open</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
};
