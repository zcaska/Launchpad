import {
  applyLinkOrder,
  moveLinkToFolder,
  resolveLinkDrop,
  canReparentFolder,
  getDescendantFolderIds,
  reparentFolder,
  sortLinks,
  linkOrderKey,
} from './sidebarReorder';
import { LinkItem, Folder } from '../types';

let failures = 0;
const failedNames: string[] = [];

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`✅ ${name}`);
  } else {
    failures++;
    failedNames.push(name);
    console.log(`FAILED: ${name}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

const link = (id: string, folderId: string, order?: number, createdAt = 0): LinkItem => ({
  id, title: id, url: `https://${id}.com`, folderId,
  isFavorite: false, tags: [], createdAt, order,
});

const folder = (id: string, parentId?: string, order = 0): Folder => ({
  id, name: id, icon: 'Folder', color: 'forest', order, parentId,
});

// ---------------------------------------------------------------- ordering
console.log('\n--- 1. legacy links without order fall back to createdAt ---');
const legacy = [link('a', 'f', undefined, 30), link('b', 'f', undefined, 10), link('c', 'f', undefined, 20)];
check('sorts by createdAt when order is absent',
  sortLinks(legacy).map(l => l.id).join(',') === 'b,c,a',
  sortLinks(legacy).map(l => l.id));
check('linkOrderKey prefers explicit order',
  linkOrderKey({ ...link('x', 'f', 5, 99) }) === 5);

console.log('\n--- 2. applyLinkOrder ---');
const set = [link('a', 'f', 0), link('b', 'f', 1), link('c', 'f', 2), link('z', 'other', 0)];
const reordered = applyLinkOrder(set, ['c', 'a', 'b']);
check('reorders the requested ids',
  reordered.filter(l => ['a','b','c'].includes(l.id)).map(l => l.id).join(',') === 'c,a,b');
check('renumbers densely', reordered.filter(l => ['a','b','c'].includes(l.id)).map(l => l.order).join(',') === '0,1,2');
check('unrelated links are preserved', reordered.some(l => l.id === 'z' && l.folderId === 'other'));
check('no link is dropped', reordered.length === set.length);

console.log('\n--- 3. moveLinkToFolder ---');
const pool = [link('a', 'f1', 0), link('b', 'f1', 1), link('c', 'f1', 2), link('d', 'f2', 0)];
const moved = moveLinkToFolder(pool, 'c', 'f2');
const c = moved.find(l => l.id === 'c')!;
check('bookmark changes folder', c.folderId === 'f2', c);
check('bookmark appended at end', c.order === 1, c);
check('source folder renumbered', moved.filter(l => l.folderId === 'f1').map(l => l.order).join(',') === '0,1');
check('no orphans / count preserved', moved.length === pool.length);

const before = moveLinkToFolder(pool, 'c', 'f2', 'd');
const c2 = before.find(l => l.id === 'c')!;
check('inserts before a named sibling', c2.order === 0, c2);
check('pushes the sibling down', before.find(l => l.id === 'd')!.order === 1);

console.log('\n--- 4. resolveLinkDrop (in-folder reorder) ---');
const trio = [link('a', 'f', 0), link('b', 'f', 1), link('c', 'f', 2)];
const names = (ls: LinkItem[]) => sortLinks(ls.filter((l) => l.folderId === 'f')).map((l) => l.id).join(',');
const orders = (ls: LinkItem[]) => sortLinks(ls.filter((l) => l.folderId === 'f')).map((l) => l.order).join(',');

check('drop first onto second (before) is a no-op when already adjacent', names(resolveLinkDrop(trio, 'a', 'b', 'before')) === 'a,b,c');
check('drop first onto second (after)', names(resolveLinkDrop(trio, 'a', 'b', 'after')) === 'b,a,c');
check('drop last onto first (before)', names(resolveLinkDrop(trio, 'c', 'a', 'before')) === 'c,a,b');
check('drop last onto first (after)', names(resolveLinkDrop(trio, 'c', 'a', 'after')) === 'a,c,b');
check('drop middle onto last (after) -> end', names(resolveLinkDrop(trio, 'b', 'c', 'after')) === 'a,c,b');
check('drop first onto last (before)', names(resolveLinkDrop(trio, 'a', 'c', 'before')) === 'b,a,c');
check('orders stay dense', orders(resolveLinkDrop(trio, 'a', 'c', 'before')) === '0,1,2');
check('no bookmark dropped', resolveLinkDrop(trio, 'a', 'c', 'before').length === trio.length);
check('unknown drag is a no-op', resolveLinkDrop(trio, 'zz', 'b', 'before') === trio);

console.log('\n--- 4b. resolveLinkDrop (cross-folder) ---');
const mixed = [link('a', 'f1', 0), link('b', 'f1', 1), link('x', 'f2', 0), link('y', 'f2', 1)];
const crossed = resolveLinkDrop(mixed, 'a', 'x', 'before');
check('bookmark changes folder', crossed.find((l) => l.id === 'a')!.folderId === 'f2');
check('inserted before anchor in target', sortLinks(crossed.filter((l) => l.folderId === 'f2')).map((l) => l.id).join(',') === 'a,x,y');
const crossedAfter = resolveLinkDrop(mixed, 'a', 'x', 'after');
check('inserted after anchor in target', sortLinks(crossedAfter.filter((l) => l.folderId === 'f2')).map((l) => l.id).join(',') === 'x,a,y');
check('source folder keeps its remaining bookmark', crossed.filter((l) => l.folderId === 'f1').length === 1);
check('total count unchanged', crossed.length === mixed.length);

console.log('\n--- 5. folder hierarchy guards ---');
const tree = [folder('root'), folder('a', 'root', 0), folder('b', 'a', 0), folder('c', 'b', 0), folder('other', 'root', 1)];
const desc = getDescendantFolderIds(tree, 'a');
check('collects all descendants', desc.has('b') && desc.has('c') && desc.size === 2, [...desc]);
check('cannot move folder into itself', canReparentFolder(tree, 'a', 'a') === false);
check('cannot move folder into its own descendant', canReparentFolder(tree, 'a', 'c') === false);
check('cannot move folder into a deeper descendant', canReparentFolder(tree, 'root', 'c') === false);
check('can move sibling into other branch', canReparentFolder(tree, 'a', 'other') === true);
check('can move to root', canReparentFolder(tree, 'a', null) === true);

const unchanged = reparentFolder(tree, 'a', 'c');
check('invalid reparent is a no-op', unchanged === tree);

console.log('\n--- 5. reparentFolder ---');
const movedTree = reparentFolder(tree, 'c', null);
check('folder gains new parentId', movedTree.find(f => f.id === 'c')!.parentId === undefined);
const rootLevel = movedTree.filter(f => (f.parentId ?? null) === null).sort((x, y) => x.order - y.order);
check('root-level siblings stay dense and end with the moved folder',
  rootLevel.map(f => f.id).join(',') === 'root,c', rootLevel.map(f => `${f.id}:${f.order}`));
check('existing child of another folder is untouched',
  movedTree.find(f => f.id === 'other')!.parentId === 'root');
check('no folder lost', movedTree.length === tree.length);

console.log('\n--- 6. depth cap ---');
const deep = [folder('l0'), folder('l1', 'l0', 0), folder('l2', 'l1', 0), folder('l3', 'l2', 0), folder('l4', 'l3', 0)];
check('rejects a move that would exceed 5 levels', canReparentFolder(deep, 'l4', 'l0') === false);
check('allows a move that stays within depth', canReparentFolder(deep, 'l4', null) === true);

console.log(failures === 0 ? '\nALL SIDEBAR REORDER TESTS PASSED SUCCESSFULLY!' : `\n${failures} FAILURE(S): ${failedNames.join(' | ')}`);
if (failures > 0) process.exit(1);