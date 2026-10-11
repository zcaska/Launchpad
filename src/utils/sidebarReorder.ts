import { LinkItem, Folder } from '../types';

/**
 * Ordering + hierarchy rules for sidebar drag & drop.
 *
 * Links historically had no explicit order, so `order` is optional: when absent
 * a link sorts by createdAt, which preserves the pre-existing sequence exactly.
 */

export const linkOrderKey = (l: LinkItem): number => l.order ?? l.createdAt ?? 0;

export function sortLinks(links: LinkItem[]): LinkItem[] {
  return [...links].sort((a, b) => linkOrderKey(a) - linkOrderKey(b));
}

/**
 * Reorder the given links (already in their intended sequence) and stamp a dense
 * 0..n-1 order. Links outside `orderedIds` keep their relative position at the end,
 * so a partial reorder never drops bookmarks.
 */
export function applyLinkOrder(links: LinkItem[], orderedIds: string[]): LinkItem[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const inSet = new Set(orderedIds);
  const untouched = links.filter((l) => !inSet.has(l.id));

  const ordered = links
    .filter((l) => inSet.has(l.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    .map((l, i) => ({ ...l, order: i }));

  return [...ordered, ...untouched];
}

/**
 * Move a bookmark into `targetFolderId`, positioned before `beforeId` when given.
 * Links in the destination folder are renumbered densely so the new spot sticks.
 */
export function moveLinkToFolder(
  links: LinkItem[],
  linkId: string,
  targetFolderId: string,
  beforeId?: string | null
): LinkItem[] {
  const moving = links.find((l) => l.id === linkId);
  if (!moving) return links;

  const inTarget = sortLinks(links.filter((l) => l.folderId === targetFolderId && l.id !== linkId));

  const found = beforeId == null ? -1 : inTarget.findIndex((l) => l.id === beforeId);
  const at = found < 0 ? inTarget.length : found;

  const placed = [
    ...inTarget.slice(0, at),
    { ...moving, folderId: targetFolderId },
    ...inTarget.slice(at),
  ].map((l, i) => ({ ...l, order: i }));

  const remap = new Map(placed.map((l) => [l.id, l]));
  return links.map((l) => remap.get(l.id) ?? l);
}

/**
 * Resolve dropping `dragId` onto the sibling `anchorId`.
 *
 * Indices are computed against the list WITHOUT the dragged link, then the link is
 * re-inserted. Computing against the list WITH the dragged link (then splicing into a
 * list without it) shifts every index after the drag point by one.
 */
export function resolveLinkDrop(
  links: LinkItem[],
  dragId: string,
  anchorId: string,
  position: 'before' | 'after'
): LinkItem[] {
  const drag = links.find((l) => l.id === dragId);
  const anchor = links.find((l) => l.id === anchorId);
  if (!drag || !anchor) return links;

  // Dropping a bookmark into a different folder re-homes it at the drop point.
  if (anchor.folderId !== drag.folderId) {
    const inTarget = sortLinks(links.filter((l) => l.folderId === anchor.folderId && l.id !== dragId));
    const at = inTarget.findIndex((l) => l.id === anchorId);
    if (at < 0) return moveLinkToFolder(links, dragId, anchor.folderId); // append
    const next = inTarget[at + 1];
    return moveLinkToFolder(links, dragId, anchor.folderId, position === 'before' ? anchorId : next?.id ?? null);
  }

  const rest = sortLinks(links.filter((l) => l.folderId === drag.folderId && l.id !== dragId));
  const at = rest.findIndex((l) => l.id === anchorId);
  const insertAt = at < 0 ? rest.length : position === 'before' ? at : at + 1;
  rest.splice(insertAt, 0, drag);

  return applyLinkOrder(links, rest.map((l) => l.id));
}

/** All descendant folder ids of `folderId`, excluding itself. */
export function getDescendantFolderIds(folders: Folder[], folderId: string): Set<string> {
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const f of folders) {
      if (f.parentId === id && !out.has(f.id)) {
        out.add(f.id);
        walk(f.id);
      }
    }
  };
  walk(folderId);
  return out;
}

/** A folder cannot become its own descendant, and depth is capped at 5 levels. */
export function canReparentFolder(
  folders: Folder[],
  folderId: string,
  targetParentId: string | null,
  maxDepth = 5
): boolean {
  if (targetParentId === null) return true;
  if (targetParentId === folderId) return false;
  if (getDescendantFolderIds(folders, folderId).has(targetParentId)) return false;

  // depth of the moved subtree's tallest node must still fit under the new parent
  const subtreeDepth = (id: string, depth: number): number => {
    const children = folders.filter((f) => f.parentId === id);
    if (!children.length) return depth;
    return Math.max(...children.map((c) => subtreeDepth(c.id, depth + 1)));
  };
  const parentDepth =
    targetParentId === null ? -1 : subtreeDepth(targetParentId, 0);
  return parentDepth + 1 + subtreeDepth(folderId, 0) < maxDepth;
}

/** Move a folder under a new parent, keeping it in place among its new siblings. */
export function reparentFolder(
  folders: Folder[],
  folderId: string,
  targetParentId: string | null
): Folder[] {
  if (!canReparentFolder(folders, folderId, targetParentId)) return folders;
  const moving = folders.find((f) => f.id === folderId);
  if (!moving) return folders;

  const siblings = folders
    .filter((f) => (f.parentId ?? null) === targetParentId && f.id !== folderId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const renumbered = new Map(
    siblings.map((f, i) => [f.id, { ...f, order: i, parentId: targetParentId ?? undefined }])
  );

  const next = folders.map((f) => {
    if (f.id === folderId) return { ...moving, parentId: targetParentId ?? undefined };
    return renumbered.get(f.id) ?? f;
  });

  // place the moved folder at the end of its new sibling list
  return next.map((f) =>
    f.id === folderId ? { ...f, order: siblings.length } : f
  );
}