import subprocess
import sys
import json
import os

prompt = """# TASK: Fix Overlapping Elements, Z-Index Stacking Contexts, and Modal User Journey in LaunchPAD

## Context and Bugs Reported
The user reported:
1. Different elements are overlapping. Specifically, as shown in Bugs/Screenshot 2026-10-10 234630.png, bookmark squircle cards and favicons from the main content grid overlap directly on top of modal dialogs (like FolderActionDialog).
2. Clicking on delete hides dialog behind the card so delete is not visible.
3. Dedicated confirmation modal for deleting items/bookmarks is missing (bookmarks are currently deleted immediately with zero confirmation).
4. User journeys and modal stacking contexts are broken because dialogs were nested inside <aside> in Sidebar.tsx or inside other components instead of being rendered at document.body via React portals.

## Required Fixes:

### 1. Fix Modal Stacking Context via React Portals & Proper Z-Index
- In `src/components/Modals/FolderActionDialog.tsx`:
  - Use `createPortal` from `react-dom` to render the dialog directly to `document.body`.
  - Replace any invalid Tailwind class `z-60` with arbitrary Tailwind class `z-[100]`.
  - The backdrop must be `fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs`.
  - The modal content window must be `z-[101]`.
  - Ensure SSR/mount safe: check if `typeof document !== 'undefined'` before calling `createPortal`.

### 2. Create Dedicated Confirmation Modal for Item Deletion (`src/components/Modals/ConfirmDeleteModal.tsx`)
- Create `src/components/Modals/ConfirmDeleteModal.tsx` using `createPortal(..., document.body)`.
- It must support deleting individual bookmarks/links or items:
  - Props: `isOpen`, `onClose`, `onConfirm`, `title` (e.g. "Delete Bookmark"), `itemName` (e.g. link.title), `description` (e.g. "Are you sure you want to delete this bookmark? This action cannot be undone."), `confirmText` ("Delete"), `icon` (Trash2 in red badge).
  - Uses `z-[100]` backdrop and `z-[101]` modal card with serene hearth dark/light theme styling.

### 3. Wire Bookmark Deletion Confirmation in `src/App.tsx` and Grid Components
- In `src/App.tsx`:
  - When `onDelete(link.id)` is triggered from `CompactIconGrid`, `FaviconTile`, `DomainClusterTile`, or `LinkCard`, do NOT delete immediately.
  - Instead, store the target link in state (`linkToDelete: LinkItem | null`, `isDeleteLinkModalOpen: boolean`).
  - Open `ConfirmDeleteModal`.
  - When the user confirms deletion in the modal, remove the link from `appData.links` and close the modal.
  - If user cancels, dismiss the modal without deleting.
- In `FaviconTile.tsx` and `DomainClusterTile.tsx`:
  - Lower the preview tooltip z-index from `z-50` to `z-30` so hover preview cards never compete with modals (which are `z-[100]`).
  - When clicking "Delete" on the hover card, close the hover card and invoke `onDelete(link.id)` so the dedicated confirmation modal opens.

### 4. Fix Sidebar and Root Modal Architecture in `src/components/Sidebar/Sidebar.tsx` and `src/App.tsx`
- In `Sidebar.tsx`:
  - Remove the local nested `<FolderActionDialog>` from inside `<aside>`. Dialogs must NEVER be nested inside `<aside>`!
  - Add `onHideFolder?: (folder: Folder) => void` and `onDeleteFolder?: (folder: Folder) => void` to `SidebarProps`.
  - In `Sidebar`, when the user clicks the quick `EyeOff` button on a folder, delegate to `onHideFolder(folder)`.
- In `App.tsx`:
  - Manage `sidebarFolderAction: { folder: Folder; mode: 'hide' | 'unhide' | 'delete' } | null`.
  - Pass `onHideFolder={(folder) => setSidebarFolderAction({ folder, mode: 'hide' })}` to `Sidebar`.
  - Render `<FolderActionDialog>` at the top level of `App.tsx` alongside other modals.
  - In `ManageFoldersModal.tsx`, ensure `FolderActionDialog` is also rendered properly via `createPortal`.

### 5. Verify & Quality Check
- Run `npm run build` (`tsc && vite build`) to ensure 0 TypeScript or Vite build errors.
- Ensure all modal backdrops prevent event bleed-through to background cards.
"""

print("Dispatching agy -p subagent with gemini-3.8-flash-high...")
sys.stdout.flush()

cmd = [
    "agy",
    "-p",
    prompt,
    "--model",
    "gemini-3.8-flash-high",
    "--dangerously-skip-permissions",
]

proc = subprocess.run(
    cmd,
    cwd=r"C:\Users\AGP\Documents\Projects\LaunchPAD",
    text=True,
    capture_output=True
)

print(f"Subagent exit code: {proc.returncode}")
print("--- STDOUT ---")
print(proc.stdout)
if proc.stderr:
    print("--- STDERR ---")
    print(proc.stderr)
