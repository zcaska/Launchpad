export interface TickTickTaskItem {
  id: string;
  title: string;
  status: number;
  completedTime?: string;
}

export interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  priority: number;
  status: number;
  items?: TickTickTaskItem[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface TickTickProject {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  closed?: boolean;
  viewMode?: string;
}
