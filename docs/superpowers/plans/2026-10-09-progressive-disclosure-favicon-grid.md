# Progressive Disclosure Favicon Grid & Domain Nesting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the bookmark management interface into an ultra-compact, progressive disclosure favicon grid with auto-clustering for multi-item domains (e.g., grouping multiple GitHub repos or Substack newsletters under one domain tile) and floating hover preview cards.

**Architecture:** 
- A domain clustering utility partitions a folder's bookmarks into standalone links and domain clusters (where 2+ links share the same hostname).
- Standalone links render as 44x44px squircle `FaviconTile` elements that reveal floating preview cards on hover.
- Domain clusters render as `DomainClusterTile` elements that expand an inline sub-folder tray below the row when clicked, revealing specific nested pages.
- The entire main workspace remains calm and uncluttered, fitting dozens of bookmarks above the fold without vertical scroll fatigue.

**Tech Stack:** React 19, TypeScript, Tailwind CSS with `@tailwindcss/container-queries`, Lucide Icons.

---

## Global Constraints
- Preserve existing bookmark data format (`LinkItem`, `Folder`, `QuickNote`).
- Zero data loss during clustering: every bookmark retains its unique URL, tags, favorites state, and click tracking.
- Progressive disclosure: 0 visual noise on landing; rich information revealed on demand (hover or click).
- Keyboard accessible: Tooltips and trays close on `Escape`; Enter/Space activates tiles.

---

### Task 1: Domain Clustering Utility (`src/utils/domainCluster.ts`)

**Files:**
- Create: `src/utils/domainCluster.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface DomainGroup {
    domain: string;
    displayName: string;
    faviconUrl: string;
    links: LinkItem[];
  }

  export interface ClusteredFolderContent {
    standaloneLinks: LinkItem[];
    domainGroups: DomainGroup[];
  }

  export function clusterLinksByDomain(links: LinkItem[], minThreshold?: number): ClusteredFolderContent;
  export function cleanDomainName(rawDomain: string): string;
  ```

- [ ] **Step 1: Write `src/utils/domainCluster.ts`**

```typescript
import { LinkItem } from '../types';
import { extractDomain, getFaviconUrl } from './favicon';

export interface DomainGroup {
  id: string;
  domain: string;
  displayName: string;
  faviconUrl: string;
  links: LinkItem[];
}

export interface ClusteredFolderContent {
  standaloneLinks: LinkItem[];
  domainGroups: DomainGroup[];
}

/**
 * Format domain for display (e.g., "github.com" -> "GitHub", "arxiv.org" -> "arXiv")
 */
export function cleanDomainName(domain: string): string {
  if (!domain) return 'Web';
  const clean = domain.replace(/^www\./i, '').toLowerCase();
  
  const KNOWN_NAMES: Record<string, string> = {
    'github.com': 'GitHub',
    'notion.so': 'Notion',
    'arxiv.org': 'arXiv',
    'youtube.com': 'YouTube',
    'substack.com': 'Substack',
    'google.com': 'Google',
    'medium.com': 'Medium',
    'x.com': 'X / Twitter',
    'twitter.com': 'Twitter',
    'figma.com': 'Figma',
    'linear.app': 'Linear',
    'canvas.instructure.com': 'Canvas LMS',
    'spotify.com': 'Spotify',
    'reddit.com': 'Reddit',
    'claude.ai': 'Claude AI',
    'chatgpt.com': 'ChatGPT',
  };

  if (KNOWN_NAMES[clean]) return KNOWN_NAMES[clean];
  
  // Capitalize first letter of domain root (e.g. "excalidraw.com" -> "Excalidraw")
  const parts = clean.split('.');
  if (parts.length > 0 && parts[0]) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return clean;
}

/**
 * Group links where 2 or more share the same domain into a DomainGroup.
 * Links with unique domains remain standalone.
 */
export function clusterLinksByDomain(
  links: LinkItem[],
  minThreshold: number = 2
): ClusteredFolderContent {
  const domainMap = new Map<string, LinkItem[]>();

  for (const link of links) {
    const domain = extractDomain(link.url).toLowerCase();
    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain)!.push(link);
  }

  const standaloneLinks: LinkItem[] = [];
  const domainGroups: DomainGroup[] = [];

  for (const [domain, items] of domainMap.entries()) {
    if (items.length >= minThreshold) {
      domainGroups.push({
        id: `domain-${domain.replace(/[^a-z0-9]/gi, '_')}`,
        domain,
        displayName: cleanDomainName(domain),
        faviconUrl: getFaviconUrl(items[0].url, 48),
        links: items,
      });
    } else {
      standaloneLinks.push(...items);
    }
  }

  return {
    standaloneLinks,
    domainGroups,
  };
}
```

- [ ] **Step 2: Verify compilation**
Run `npm run build` to confirm module types are valid.

---

### Task 2: Ultra-Compact `FaviconTile` with Hover Preview Micro-Card

**Files:**
- Create: `src/components/LinkGrid/FaviconTile.tsx`

**Interfaces:**
- Consumes: `LinkItem`, `Folder`
- Produces: `FaviconTile` component with interactive hover card, quick favorite toggle, and right-click/menu trigger.

- [ ] **Step 1: Write `src/components/LinkGrid/FaviconTile.tsx`**

```tsx
import React, { useState, useRef } from 'react';
import { Star, ExternalLink, MoreVertical, Edit2, Trash2, Globe } from 'lucide-react';
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
  folders,
  onToggleFavorite,
  onEdit,
  onDelete,
  onMoveFolder,
  onLinkClick,
  openInNewTab = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const faviconUrl = getFaviconUrl(link.url, 48);
  const domain = extractDomain(link.url);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
      className="relative group select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 44x44px Squircle Tile */}
      <a
        href={link.url}
        target={openInNewTab ? '_blank' : '_self'}
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-200 border ${
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

      {/* Floating Progressive Disclosure Preview Card */}
      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal animate-fadeIn pointer-events-auto">
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
                  className="text-[9px] px-1.5 py-0.2 rounded bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted font-medium"
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

          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white dark:bg-serene-surface-dark border-r border-b border-serene-border-light dark:border-serene-border-dark rotate-45" />
        </div>
      )}
    </div>
  );
};
```

---

### Task 3: `DomainClusterTile` with Inline Expandable Sub-Folder Tray

**Files:**
- Create: `src/components/LinkGrid/DomainClusterTile.tsx`

**Interfaces:**
- Consumes: `DomainGroup`, `LinkItem`, `Folder`
- Produces: `DomainClusterTile` (renders domain icon + counter badge; clicking expands a nested tray with repo/sub-link items).

- [ ] **Step 1: Write `src/components/LinkGrid/DomainClusterTile.tsx`**

```tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Star, Layers, Globe } from 'lucide-react';
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
  folders,
  onToggleFavorite,
  onEdit,
  onDelete,
  onMoveFolder,
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
            ? 'bg-serene-primary/10 border-serene-primary text-serene-primary dark:text-serene-primary-dark shadow-xs'
            : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 shadow-subtle hover:shadow-card'
        } hover:scale-105 active:scale-95`}
        title={`${group.displayName} (${group.links.length} bookmarks) - Click to expand`}
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

      {/* Inline Sub-Folder Tray Modal / Accordion */}
      {isExpanded && (
        <div className="col-span-full w-full my-3 p-3.5 bg-serene-surfaceAlt-light/80 dark:bg-serene-surfaceAlt-dark/80 border border-serene-border-light dark:border-serene-border-dark rounded-2xl animate-fadeIn shadow-inner">
          <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark">
                <Layers className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
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
              className="text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline"
            >
              Close Tray
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {group.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target={openInNewTab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onClick={() => onLinkClick(link)}
                className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 shadow-2xs hover:shadow-subtle transition-all"
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

                <ExternalLink className="w-3.5 h-3.5 text-serene-text-muted group-hover:text-serene-primary shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### Task 4: Progressive Disclosure `CompactIconGrid` Component

**Files:**
- Create: `src/components/LinkGrid/CompactIconGrid.tsx`

**Interfaces:**
- Consumes: `links: LinkItem[]`, `folders: Folder[]`
- Produces: `CompactIconGrid` that partitions links via `clusterLinksByDomain` and renders tiles seamlessly in a clean wrap-flex matrix.

- [ ] **Step 1: Write `src/components/LinkGrid/CompactIconGrid.tsx`**

```tsx
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
        No links saved in this view.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2.5 sm:gap-3.5 animate-fadeIn">
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
  );
};
```

---

### Task 5: Integrate Progressive Disclosure View into `App.tsx` & Folder Views

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LinkGrid/CategorySection.tsx`
- Modify: `src/components/LinkGrid/FolderCard.tsx`

- [ ] **Step 1: Update `CategorySection.tsx` and `App.tsx`**
Replace multiline card grids in folder views with `CompactIconGrid` while keeping the optional view switcher for users who want full cards or compact favicons.
- [ ] **Step 2: Update `FolderCard.tsx`**
Render domain clusters and mini icons with clean spacing so landing page visual load is near-zero.
- [ ] **Step 3: Run `npm run build`**
Verify zero TypeScript compilation errors.

---

### Task 6: Visual & Interactive Playwright Verification

**Files:**
- Test via Playwright MCP against `http://localhost:4173/`

- [ ] **Step 1: Test Folder Navigation**
Open a folder with multiple links (e.g. Work & Projects, Classes).
- [ ] **Step 2: Verify Favicon-Only Squircle Grid**
Confirm standalone links display only the clean 48px favicon.
- [ ] **Step 3: Verify Floating Hover Preview**
Hover on a standalone favicon and confirm title, domain, description, and tags appear without shifting the layout.
- [ ] **Step 4: Verify Domain Cluster Tray Expansion**
Click on a domain cluster tile (e.g. GitHub [5]) and verify the inline sub-folder tray smoothly reveals all nested repos/links.
- [ ] **Step 5: Capture Screenshots**
Capture viewport screenshots in both light and dark mode for review.
