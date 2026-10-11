import { Folder, LinkItem, ParsedBookmark, ImportBookmarkResult } from '../types';
import { classifyBookmark } from './bookmarkClassifier';

/**
 * Normalizes a URL for comparison and duplicate detection:
 * - Trims whitespace
 * - Adds default 'https://' protocol if missing
 * - Converts scheme and hostname to lowercase
 * - Strips standard default ports (80 for http, 443 for https)
 * - Removes common tracking query parameters (utm_*, ref, source, fbclid, etc.)
 * - Sorts remaining query parameters deterministically
 * - Strips trailing slashes from path (except root '/')
 * - Strips fragment/hash anchors
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  let urlToParse = trimmed;
  // If protocol is missing, prepend https://
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(urlToParse)) {
    urlToParse = `https://${urlToParse}`;
  }

  try {
    const parsed = new URL(urlToParse);

    // Keep protocol in lowercase
    const protocol = parsed.protocol.toLowerCase();

    // Standardize hostname
    let host = parsed.hostname.toLowerCase();
    // Strip default ports
    if ((protocol === 'http:' && parsed.port === '80') || (protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }
    const port = parsed.port ? `:${parsed.port}` : '';

    // Normalize path: strip redundant trailing slashes
    let pathname = parsed.pathname || '/';
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.replace(/\/+$/, '');
    }

    // Clean tracking query parameters
    const trackingParams = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
      'mc_cid',
      'mc_eid',
    ]);

    const filteredParams = new URLSearchParams();
    // Sort search parameters for deterministic match
    const keys = Array.from(parsed.searchParams.keys()).sort();
    for (const key of keys) {
      if (!trackingParams.has(key.toLowerCase())) {
        for (const val of parsed.searchParams.getAll(key)) {
          filteredParams.append(key, val);
        }
      }
    }

    const searchStr = filteredParams.toString();
    const query = searchStr ? `?${searchStr}` : '';

    return `${protocol}//${host}${port}${pathname}${query}`;
  } catch {
    // If native URL parsing fails, fallback to basic sanitization
    return trimmed
      .toLowerCase()
      .replace(/\/+$/, '')
      .replace(/#.*$/, '');
  }
}

/**
 * Checks if a bookmark is a duplicate based on existing links or already parsed bookmarks.
 */
function isDuplicateUrl(normalizedTarget: string, existingNormalizedSet: Set<string>): boolean {
  if (!normalizedTarget) return false;
  return existingNormalizedSet.has(normalizedTarget);
}

export function isGenericBrowserFolder(name?: string): boolean {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === 'bookmarks bar' ||
    trimmed === 'bookmarks toolbar' ||
    trimmed === 'bookmarks menu' ||
    trimmed === 'other bookmarks' ||
    trimmed === 'mobile bookmarks' ||
    trimmed === 'favourite bar' ||
    trimmed === 'favourites bar' ||
    trimmed === 'favorite bar' ||
    trimmed === 'favorites bar' ||
    trimmed === 'favourites' ||
    trimmed === 'favorites' ||
    trimmed === 'imported' ||
    trimmed === 'bookmarks' ||
    trimmed === 'managed bookmarks'
  );
}

export function createCustomFolder(
  folderName: string,
  existingFolders: Folder[],
  parentId?: string
): Folder {
  const trimmed = folderName.trim();
  const colors: Array<'indigo' | 'purple' | 'rose' | 'amber' | 'emerald' | 'sky'> = [
    'indigo', 'purple', 'rose', 'amber', 'emerald', 'sky'
  ];
  const color = colors[existingFolders.length % colors.length];

  // Pick sensible default icon based on folder name
  const lower = trimmed.toLowerCase();
  let icon = 'Folder';
  if (/(ai|gpt|claude|llm|bot|intel)/i.test(lower)) icon = 'Sparkles';
  else if (/(dev|code|git|tech|stack|api)/i.test(lower)) icon = 'Code';
  else if (/(read|book|paper|news|article)/i.test(lower)) icon = 'BookOpen';
  else if (/(study|school|class|learn|course)/i.test(lower)) icon = 'GraduationCap';
  else if (/(work|job|corp|office|project)/i.test(lower)) icon = 'Briefcase';
  else if (/(tool|util|service|daily)/i.test(lower)) icon = 'Bookmark';
  else if (/(music|sound|audio)/i.test(lower)) icon = 'Music';
  else if (/(video|movie|media|yt)/i.test(lower)) icon = 'Video';
  else if (/(design|ui|ux|art)/i.test(lower)) icon = 'Palette';

  const safeSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom';
  return {
    id: `folder-${safeSlug}-${Date.now().toString(36)}`,
    name: trimmed,
    description: `Folder: ${trimmed}`,
    icon,
    color,
    parentId,
    isCollapsed: false,
    order: existingFolders.length + 1,
  };
}

/**
 * Parses Netscape Bookmark HTML string (standard format exported by Chrome, Firefox, Safari, Edge, Brave).
 * Extracts bookmark titles, URLs, creation timestamps, and folder structures.
 * Integrates classifyBookmark to automatically assign target LaunchPAD folders and tags.
 */
export function parseNetscapeBookmarks(
  htmlContent: string,
  existingLinks: LinkItem[] = [],
  availableFolders: Folder[] = []
): ImportBookmarkResult {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return {
      bookmarks: [],
      totalCount: 0,
      newCount: 0,
      duplicateCount: 0,
      foldersDetected: [],
      categoryDistribution: {},
    };
  }

  // Prepopulate set of normalized existing URLs
  const existingNormalizedSet = new Set<string>();
  existingLinks.forEach(link => {
    if (link.url) {
      const norm = normalizeUrl(link.url);
      if (norm) existingNormalizedSet.add(norm);
    }
  });

  const parsedBookmarks: ParsedBookmark[] = [];
  const foldersDetectedSet = new Set<string>();
  const seenInBatchSet = new Set<string>();
  const categoryDistribution: Record<string, number> = {};

  // Use DOMParser to parse HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const root = doc.body;

  // Keep a dynamic list of folders: existing availableFolders + any auto-created folders from import
  const currentFolders: Folder[] = [...availableFolders];
  const createdFolders: Folder[] = [];
  const createdFolderIdsByPath = new Map<string, string>();

  // Helper to get or create a folder on the fly
  function getOrCreateFolder(folderName: string, parentId?: string): Folder {
    const trimmed = folderName.trim();
    const cacheKey = `${parentId || 'root'}::${trimmed.toLowerCase()}`;

    // Check if matching folder already exists in currentFolders
    const existing = currentFolders.find(
      f => f.name.trim().toLowerCase() === trimmed.toLowerCase() &&
           (parentId ? f.parentId === parentId : !f.parentId)
    );
    if (existing) {
      createdFolderIdsByPath.set(cacheKey, existing.id);
      return existing;
    }

    // Check if we already created it in this batch
    if (createdFolderIdsByPath.has(cacheKey)) {
      const id = createdFolderIdsByPath.get(cacheKey)!;
      return currentFolders.find(f => f.id === id)!;
    }

    const newFolder = createCustomFolder(trimmed, currentFolders, parentId);
    currentFolders.push(newFolder);
    createdFolders.push(newFolder);
    createdFolderIdsByPath.set(cacheKey, newFolder.id);
    return newFolder;
  }

  /**
   * Traverses DOM nodes recursively to track nested folder hierarchy up to 5 levels.
   */
  function traverse(node: Node, currentFolderHierarchy: Folder[]) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];

      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (tagName === 'H3') {
          const folderName = el.textContent?.trim() || '';
          if (folderName && !isGenericBrowserFolder(folderName)) {
            foldersDetectedSet.add(folderName);
          }
        } else if (tagName === 'DT') {
          const h3 = el.querySelector(':scope > h3, h3');
          let dl = el.querySelector(':scope > dl, dl');
          const a = el.querySelector(':scope > a, a');

          // Check if DL is next sibling of DT (Netscape HTML variant)
          if (h3 && !dl) {
            let sibling = el.nextElementSibling;
            while (sibling && sibling.tagName !== 'DL' && sibling.tagName !== 'DT') {
              sibling = sibling.nextElementSibling;
            }
            if (sibling && sibling.tagName === 'DL') {
              dl = sibling as HTMLElement;
            }
          }

          if (h3 && dl) {
            const folderName = h3.textContent?.trim() || '';
            if (folderName && !isGenericBrowserFolder(folderName)) {
              foldersDetectedSet.add(folderName);
              const parentFolder = currentFolderHierarchy[currentFolderHierarchy.length - 1];
              const parentId = parentFolder?.id;
              const folderObj = getOrCreateFolder(folderName, parentId);

              // Limit nesting to 5 levels (0..4)
              const nextHierarchy = currentFolderHierarchy.length < 5
                ? [...currentFolderHierarchy, folderObj]
                : currentFolderHierarchy;
              traverse(dl, nextHierarchy);
            } else {
              traverse(dl, currentFolderHierarchy);
            }
          } else if (a) {
            processAnchor(a as HTMLAnchorElement, currentFolderHierarchy);
          } else {
            traverse(el, currentFolderHierarchy);
          }
        } else if (tagName === 'DL') {
          traverse(el, currentFolderHierarchy);
        } else if (tagName === 'A') {
          processAnchor(el as HTMLAnchorElement, currentFolderHierarchy);
        } else {
          traverse(el, currentFolderHierarchy);
        }
      }
    }
  }

  function processAnchor(anchor: HTMLAnchorElement, folderHierarchy: Folder[]) {
    const rawHref = anchor.getAttribute('href') || anchor.href || '';
    if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('place:')) {
      return;
    }

    const title = (anchor.textContent || '').trim() || (anchor.getAttribute('title') || '').trim() || rawHref;
    const rawAddDate = anchor.getAttribute('add_date') || anchor.getAttribute('ADD_DATE');
    let addDate: number | undefined;
    if (rawAddDate) {
      const parsedSeconds = parseInt(rawAddDate, 10);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        addDate = parsedSeconds > 1e11 ? parsedSeconds : parsedSeconds * 1000;
      }
    }

    const activeFolder = folderHierarchy.length > 0 ? folderHierarchy[folderHierarchy.length - 1] : undefined;

    let targetFolderId: string;
    let targetTags: string[] = [];
    let matchedRule: string;
    let confidence: 'high' | 'medium' | 'low';

    if (activeFolder) {
      targetFolderId = activeFolder.id;
      targetTags = [activeFolder.name];
      const pathNames = folderHierarchy.map(f => f.name);
      matchedRule = `Imported Hierarchy: "${pathNames.join(' > ')}"`;
      confidence = 'high';
    } else {
      const classification = classifyBookmark(rawHref, title, undefined, currentFolders);
      targetFolderId = classification.folderId;
      targetTags = classification.tags;
      matchedRule = classification.matchedRule;
      confidence = classification.confidence;
    }

    // Duplicate detection
    const normalized = normalizeUrl(rawHref);
    const isDup = isDuplicateUrl(normalized, existingNormalizedSet) || seenInBatchSet.has(normalized);
    if (normalized) {
      seenInBatchSet.add(normalized);
    }

    const parsedItem: ParsedBookmark = {
      url: rawHref,
      title,
      folderId: targetFolderId,
      tags: targetTags,
      sourceFolder: activeFolder?.name,
      folderHierarchy: folderHierarchy.map(f => f.name),
      addDate: addDate || Date.now(),
      matchedRule,
      confidence,
      isDuplicate: isDup,
      selected: !isDup, // Pre-select non-duplicates by default
    };

    parsedBookmarks.push(parsedItem);

    // Update category distribution
    categoryDistribution[targetFolderId] = (categoryDistribution[targetFolderId] || 0) + 1;
  }

  // If there are top-level DL tags, or direct body contents, traverse from root
  traverse(root, []);

  const totalCount = parsedBookmarks.length;
  const duplicateCount = parsedBookmarks.filter(b => b.isDuplicate).length;
  const newCount = totalCount - duplicateCount;

  return {
    bookmarks: parsedBookmarks,
    totalCount,
    newCount,
    duplicateCount,
    foldersDetected: Array.from(foldersDetectedSet),
    createdFolders,
    categoryDistribution,
  };
}

/**
 * Escapes characters for safe inclusion in Netscape HTML attributes and contents.
 */
function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Exports LaunchPAD links and folders back to the standard Netscape Bookmark HTML format.
 * Can be imported into any browser (Chrome, Edge, Firefox, Brave, Safari).
 */
export function exportNetscapeBookmarks(links: LinkItem[], folders: Folder[]): string {
  const timestamp = Math.floor(Date.now() / 1000);

  // Group links by folder
  const linksByFolder = new Map<string, LinkItem[]>();
  const folderMap = new Map<string, Folder>();

  folders.forEach(f => {
    folderMap.set(f.id, f);
    linksByFolder.set(f.id, []);
  });

  const unfiledLinks: LinkItem[] = [];

  links.forEach(link => {
    if (link.folderId && linksByFolder.has(link.folderId)) {
      linksByFolder.get(link.folderId)!.push(link);
    } else {
      unfiledLinks.push(link);
    }
  });

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. -->',
    '<!-- It will be read and overwritten. -->',
    '<!-- DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  // Write folders in order
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  for (const folder of sortedFolders) {
    const folderLinks = linksByFolder.get(folder.id) || [];
    lines.push(`    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${escapeHtml(folder.name)}</H3>`);
    lines.push('    <DL><p>');

    for (const link of folderLinks) {
      const addDate = link.createdAt ? Math.floor(link.createdAt / 1000) : timestamp;
      const tagsAttr = link.tags && link.tags.length > 0 ? ` TAGS="${escapeHtml(link.tags.join(','))}"` : '';
      lines.push(`        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeHtml(link.title)}</A>`);
    }

    lines.push('    </DL><p>');
  }

  // Write any unfiled links if present
  if (unfiledLinks.length > 0) {
    lines.push(`    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">Other Bookmarks</H3>`);
    lines.push('    <DL><p>');
    for (const link of unfiledLinks) {
      const addDate = link.createdAt ? Math.floor(link.createdAt / 1000) : timestamp;
      const tagsAttr = link.tags && link.tags.length > 0 ? ` TAGS="${escapeHtml(link.tags.join(','))}"` : '';
      lines.push(`        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeHtml(link.title)}</A>`);
    }
    lines.push('    </DL><p>');
  }

  lines.push('</DL><p>');

  return lines.join('\n');
}
