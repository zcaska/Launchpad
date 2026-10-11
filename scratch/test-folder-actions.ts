import { Folder, LinkItem } from '../src/types';
import {
  buildFolderTree,
  hideFolderWithSubfolders,
  hideFolderWithoutSubfolders,
  unhideFolderWithSubfolders,
  unhideFolderWithoutSubfolders,
  deleteFolderWithSubfolders,
  deleteFolderWithoutSubfolders,
} from '../src/utils/folderTree';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
}

console.log('Testing folder hide/remove operations...');

const initialFolders: Folder[] = [
  { id: 'f-fav-bar', name: 'Favourites Bar', order: 1, icon: 'Folder', color: 'slate' },
  { id: 'f-ai', name: 'AI Tools', parentId: 'f-fav-bar', order: 2, icon: 'Folder', color: 'emerald' },
  { id: 'f-llm', name: 'LLMs', parentId: 'f-ai', order: 3, icon: 'Folder', color: 'purple' },
  { id: 'f-work', name: 'Work', order: 4, icon: 'Folder', color: 'forest' },
];

const initialLinks: LinkItem[] = [
  { id: 'l1', title: 'Bar link', url: 'https://example.com/1', folderId: 'f-fav-bar', isFavorite: false, tags: [], createdAt: 1 },
  { id: 'l2', title: 'Claude', url: 'https://claude.ai', folderId: 'f-ai', isFavorite: false, tags: [], createdAt: 2 },
  { id: 'l3', title: 'GPT', url: 'https://chatgpt.com', folderId: 'f-llm', isFavorite: false, tags: [], createdAt: 3 },
  { id: 'l4', title: 'GitHub', url: 'https://github.com', folderId: 'f-work', isFavorite: false, tags: [], createdAt: 4 },
];

// 1. Test hideFolderWithoutSubfolders (Promote children)
console.log('1. Testing hideFolderWithoutSubfolders...');
const hiddenWithout = hideFolderWithoutSubfolders(initialFolders, 'f-fav-bar');
const favBar = hiddenWithout.find(f => f.id === 'f-fav-bar')!;
const aiFolder = hiddenWithout.find(f => f.id === 'f-ai')!;
assert(favBar.isHidden === true, 'f-fav-bar should be isHidden');
assert(aiFolder.parentId === undefined, 'f-ai should be promoted to root (parentId undefined)');
assert(aiFolder.isHidden !== true, 'f-ai should remain visible');

// Check buildFolderTree without hidden
const treeVisible = buildFolderTree(hiddenWithout, initialLinks, 5, false);
assert(treeVisible.some(n => n.folder.id === 'f-ai'), 'f-ai should now be a visible root in tree');
assert(!treeVisible.some(n => n.folder.id === 'f-fav-bar'), 'f-fav-bar should not be in tree');
console.log('✅ hideFolderWithoutSubfolders passed');

// 2. Test hideFolderWithSubfolders (Cascade hide)
console.log('2. Testing hideFolderWithSubfolders...');
const hiddenWith = hideFolderWithSubfolders(initialFolders, 'f-fav-bar');
assert(hiddenWith.find(f => f.id === 'f-fav-bar')!.isHidden === true, 'f-fav-bar should be hidden');
assert(hiddenWith.find(f => f.id === 'f-ai')!.isHidden === true, 'f-ai should be hidden');
assert(hiddenWith.find(f => f.id === 'f-llm')!.isHidden === true, 'f-llm should be hidden');
assert(hiddenWith.find(f => f.id === 'f-work')!.isHidden !== true, 'f-work should remain visible');

const treeWith = buildFolderTree(hiddenWith, initialLinks, 5, false);
assert(treeWith.length === 1 && treeWith[0].folder.id === 'f-work', 'Only f-work should be visible in tree');
console.log('✅ hideFolderWithSubfolders passed');

// 3. Test unhide operations
console.log('3. Testing unhideFolderWithSubfolders...');
const unhidden = unhideFolderWithSubfolders(hiddenWith, 'f-fav-bar');
assert(unhidden.every(f => !f.isHidden), 'All folders should be unhidden');
console.log('✅ unhideFolderWithSubfolders passed');

// 4. Test deleteFolderWithoutSubfolders (Promote children and preserve links)
console.log('4. Testing deleteFolderWithoutSubfolders...');
const delWithout = deleteFolderWithoutSubfolders(initialFolders, initialLinks, 'f-fav-bar', 'f-work');
assert(!delWithout.updatedFolders.some(f => f.id === 'f-fav-bar'), 'f-fav-bar should be deleted');
const promotedAi = delWithout.updatedFolders.find(f => f.id === 'f-ai')!;
assert(promotedAi.parentId === undefined, 'f-ai should be promoted to root');
const reassignedLink = delWithout.updatedLinks.find(l => l.id === 'l1')!;
assert(reassignedLink.folderId === 'f-work', 'Direct link in deleted folder should move to fallback');
console.log('✅ deleteFolderWithoutSubfolders passed');

// 5. Test deleteFolderWithSubfolders (Cascade delete)
console.log('5. Testing deleteFolderWithSubfolders...');
const delWith = deleteFolderWithSubfolders(initialFolders, initialLinks, 'f-fav-bar');
assert(delWith.updatedFolders.length === 1 && delWith.updatedFolders[0].id === 'f-work', 'Only f-work should remain');
assert(delWith.updatedLinks.length === 1 && delWith.updatedLinks[0].id === 'l4', 'Only l4 should remain');
console.log('✅ deleteFolderWithSubfolders passed');

console.log('🎉 All folder action tests passed successfully!');
