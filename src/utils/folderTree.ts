import { Folder, LinkItem, FolderTreeNode } from '../types';
import { linkOrderKey } from './sidebarReorder';

/**
 * Builds a multi-level hierarchical folder tree from flat folder and link arrays.
 * Supports up to 5 levels (level 0 to 4).
 *
 * @param folders Flat list of folders.
 * @param links Flat list of link items.
 * @param maxDepth Maximum tree depth (default 5, levels 0 to 4).
 * @returns FolderTreeNode[] Array of root folder tree nodes.
 */
export function buildFolderTree(
  folders: Folder[],
  links: LinkItem[],
  maxDepth: number = 5,
  includeHidden: boolean = false
): FolderTreeNode[] {
  const effectiveFolders = includeHidden ? folders : folders.filter((f) => !f.isHidden);
  const folderMap = new Map<string, Folder>();
  effectiveFolders.forEach((f) => folderMap.set(f.id, f));

  // Group child folders by parentId
  const childrenByParent = new Map<string, Folder[]>();
  const rootFolders: Folder[] = [];

  effectiveFolders.forEach((folder) => {
    if (folder.parentId && folderMap.has(folder.parentId)) {
      const list = childrenByParent.get(folder.parentId) || [];
      list.push(folder);
      childrenByParent.set(folder.parentId, list);
    } else {
      rootFolders.push(folder);
    }
  });

  // Group links by folderId
  const linksByFolder = new Map<string, LinkItem[]>();
  links.forEach((link) => {
    const list = linksByFolder.get(link.folderId) || [];
    list.push(link);
    linksByFolder.set(link.folderId, list);
  });
  // Honour manual sidebar ordering; legacy links without `order` keep createdAt order.
  linksByFolder.forEach((list) => list.sort((a, b) => linkOrderKey(a) - linkOrderKey(b)));

  // Sort helper
  const sortFolders = (a: Folder, b: Folder) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

  rootFolders.sort(sortFolders);

  function buildNode(folder: Folder, level: number): FolderTreeNode {
    const directLinks = linksByFolder.get(folder.id) || [];
    const rawChildren = childrenByParent.get(folder.id) || [];
    rawChildren.sort(sortFolders);

    // Limit recursion to maxDepth - 1 (level 0..4 = 5 levels)
    const children: FolderTreeNode[] =
      level < maxDepth - 1
        ? rawChildren.map((child) => buildNode(child, level + 1))
        : [];

    const totalChildLinks = children.reduce((sum, c) => sum + c.totalLinkCount, 0);
    const totalLinkCount = directLinks.length + totalChildLinks;

    return {
      folder,
      children,
      directLinks,
      totalLinkCount,
      level,
    };
  }

  return rootFolders.map((root) => buildNode(root, 0));
}

/**
 * Returns all descendant folder IDs (children, grandchildren, etc.) of a given folder.
 */
export function getDescendantFolderIds(folderId: string, folders: Folder[]): string[] {
  const descendants: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const directChildren = folders.filter((f) => f.parentId === currentId);
    for (const child of directChildren) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Traverses upwards from folderId to root, returning the breadcrumb list [Root, ..., Folder].
 */
export function getFolderBreadcrumbs(folderId: string, folders: Folder[]): Folder[] {
  const folderMap = new Map<string, Folder>();
  folders.forEach((f) => folderMap.set(f.id, f));

  const crumbs: Folder[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = folderId;

  while (currentId && folderMap.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const folder: Folder = folderMap.get(currentId)!;
    crumbs.unshift(folder);
    currentId = folder.parentId;
  }

  return crumbs;
}

/**
 * Calculates depth level of a folder (0 for root, 1 for subfolder, max 4).
 */
export function getFolderLevel(folderId: string, folders: Folder[]): number {
  const crumbs = getFolderBreadcrumbs(folderId, folders);
  return Math.min(Math.max(crumbs.length - 1, 0), 4);
}

/**
 * Formats full hierarchical path name (e.g. "Work > Projects > LaunchPad").
 */
export function formatFolderHierarchyName(folder: Folder, folders: Folder[]): string {
  const crumbs = getFolderBreadcrumbs(folder.id, folders);
  return crumbs.map((c) => c.name).join(' > ');
}

/**
 * Returns flattened list of folders sorted by hierarchy with depth and indented display name.
 * Ideal for select dropdowns in Add/Edit modals.
 */
export function getFlattenedFolderHierarchy(
  folders: Folder[],
  excludeId?: string,
  includeHidden: boolean = false
): Array<{ folder: Folder; level: number; displayName: string }> {
  const tree = buildFolderTree(folders, [], 5, includeHidden);
  const result: Array<{ folder: Folder; level: number; displayName: string }> = [];

  function traverse(node: FolderTreeNode) {
    if (excludeId && node.folder.id === excludeId) return;

    const indent = '— '.repeat(node.level);
    result.push({
      folder: node.folder,
      level: node.level,
      displayName: `${indent}${node.folder.name}${node.folder.isHidden ? ' (Hidden)' : ''}`,
    });

    node.children.forEach(traverse);
  }

  tree.forEach(traverse);
  return result;
}

/**
 * Hides a folder and all its descendant subfolders.
 */
export function hideFolderWithSubfolders(folders: Folder[], targetFolderId: string): Folder[] {
  const descendantIds = new Set(getDescendantFolderIds(targetFolderId, folders));
  descendantIds.add(targetFolderId);
  return folders.map((f) => (descendantIds.has(f.id) ? { ...f, isHidden: true } : f));
}

/**
 * Hides a folder only, promoting its immediate child subfolders to this folder's parentId.
 */
export function hideFolderWithoutSubfolders(folders: Folder[], targetFolderId: string): Folder[] {
  const target = folders.find((f) => f.id === targetFolderId);
  if (!target) return folders;
  const parentId = target.parentId;

  return folders.map((f) => {
    if (f.id === targetFolderId) {
      return { ...f, isHidden: true };
    }
    if (f.parentId === targetFolderId) {
      // Promote immediate child to target's parent level
      return { ...f, parentId };
    }
    return f;
  });
}

/**
 * Unhides a folder and all its descendant subfolders.
 */
export function unhideFolderWithSubfolders(folders: Folder[], targetFolderId: string): Folder[] {
  const descendantIds = new Set(getDescendantFolderIds(targetFolderId, folders));
  descendantIds.add(targetFolderId);
  return folders.map((f) => (descendantIds.has(f.id) ? { ...f, isHidden: false } : f));
}

/**
 * Unhides a folder only without altering its subfolders.
 */
export function unhideFolderWithoutSubfolders(folders: Folder[], targetFolderId: string): Folder[] {
  return folders.map((f) => (f.id === targetFolderId ? { ...f, isHidden: false } : f));
}

/**
 * Deletes a folder and all its descendant subfolders and associated links.
 */
export function deleteFolderWithSubfolders(
  folders: Folder[],
  links: LinkItem[],
  targetFolderId: string
): { updatedFolders: Folder[]; updatedLinks: LinkItem[] } {
  const descendantIds = new Set(getDescendantFolderIds(targetFolderId, folders));
  descendantIds.add(targetFolderId);

  const updatedFolders = folders.filter((f) => !descendantIds.has(f.id));
  const updatedLinks = links.filter((l) => !descendantIds.has(l.folderId));

  return { updatedFolders, updatedLinks };
}

/**
 * Deletes a folder only, promoting immediate subfolders to the target's parentId,
 * and reassigning target's direct links to the parent folder (or fallback folder).
 */
export function deleteFolderWithoutSubfolders(
  folders: Folder[],
  links: LinkItem[],
  targetFolderId: string,
  fallbackFolderId?: string
): { updatedFolders: Folder[]; updatedLinks: LinkItem[] } {
  const target = folders.find((f) => f.id === targetFolderId);
  if (!target) return { updatedFolders: folders, updatedLinks: links };

  const targetParentId = target.parentId;
  // If target has a parent, links move to parent, otherwise fallbackFolderId or first remaining folder
  const destinationFolderId =
    targetParentId ||
    fallbackFolderId ||
    folders.find((f) => f.id !== targetFolderId)?.id ||
    'folder-bookmarks';

  const updatedFolders = folders
    .filter((f) => f.id !== targetFolderId)
    .map((f) => {
      if (f.parentId === targetFolderId) {
        return { ...f, parentId: targetParentId };
      }
      return f;
    });

  const updatedLinks = links.map((l) => {
    if (l.folderId === targetFolderId) {
      return { ...l, folderId: destinationFolderId };
    }
    return l;
  });

  return { updatedFolders, updatedLinks };
}
