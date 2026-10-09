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
