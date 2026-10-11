import { createContext, useContext } from 'react';

/** What is currently being dragged by the sidebar. */
export interface DragPayload {
  kind: 'link' | 'folder';
  id: string;
}

/** Where a dragged item would land if dropped right now. */
export interface DropTarget {
  kind: 'link' | 'folder';
  id: string;
  position: 'before' | 'after' | 'inside';
}

export interface SidebarDndValue {
  drag: DragPayload | null;
  drop: DropTarget | null;
  setDrag: (d: DragPayload | null) => void;
  setDrop: (d: DropTarget | null) => void;
  /** Guard so a folder can never be dropped into itself or its own descendants. */
  canDropFolderInto: (folderId: string) => boolean;
}

export const SidebarDndContext = createContext<SidebarDndValue | null>(null);

export function useSidebarDnd(): SidebarDndValue {
  const ctx = useContext(SidebarDndContext);
  if (!ctx) throw new Error('useSidebarDnd must be used inside SidebarDndContext');
  return ctx;
}