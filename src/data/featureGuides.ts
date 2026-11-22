export interface FeatureGuideItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  shortcut?: string;
}

export const FEATURE_GUIDES: Record<string, FeatureGuideItem> = {
  'header.brand': {
    id: 'header.brand',
    title: 'LaunchPad Focus Hub',
    category: 'Navigation',
    summary: 'Your intentional landing dashboard. Right-click any widget or tool across LaunchPad to reveal a concise guide.',
  },
  'header.newTask': {
    id: 'header.newTask',
    title: 'New Task',
    category: 'Focus',
    summary: 'Quickly create a prioritized action item with duration estimates and optional deadline.',
    shortcut: 'Ctrl+N',
  },
  'header.sparkIdea': {
    id: 'header.sparkIdea',
    title: 'Spark Idea',
    category: 'Creativity',
    summary: 'Jot down sudden thoughts and inspiration into your idea backlog without breaking flow.',
  },
  'header.scratchpad': {
    id: 'header.scratchpad',
    title: 'Scratchpad',
    category: 'Workspace',
    summary: 'A clean markdown memo pad for notes, outlines, and transient thoughts saved locally.',
  },
  'castle.hero': {
    id: 'castle.hero',
    title: 'Castle 3D Stronghold',
    category: 'Accountability',
    summary: 'A physical representation of your long-term discipline. Orbit and zoom to inspect completed architecture and phantom silhouettes.',
  },
  'castle.finances': {
    id: 'castle.finances',
    title: 'Castle Treasury',
    category: 'Accountability',
    summary: 'Cash is spendable earnings from reflected work. Castle value is invested masonry. Net worth reflects total accumulated wealth.',
  },
  'castle.dailyStrip': {
    id: 'castle.dailyStrip',
    title: 'Daily Momentum & Integrity',
    category: 'Discipline',
    summary: 'Tracks your daily earnings goal, unbroken streak, deductions for missed commitments, and debt status.',
  },
  'castle.commitments': {
    id: 'castle.commitments',
    title: 'Daily Commitments',
    category: 'Focus',
    summary: 'Choose prioritized tasks representing today\'s focus. Only commitments of 30+ minutes qualify for virtual currency.',
  },
  'castle.reflection': {
    id: 'castle.reflection',
    title: 'Work Reflection Gate',
    category: 'Integrity',
    summary: 'Verify actual invested hours and log takeaways. Completing reflection credits virtual earnings to your treasury.',
  },
  'castle.store': {
    id: 'castle.store',
    title: 'Construction Store',
    category: 'Castle',
    summary: 'Invest earned virtual cash into monumental fortifications, royal decorations, and living castle companions.',
  },
  'growth.analytics': {
    id: 'growth.analytics',
    title: 'Growth & Mastery',
    category: 'Milestones',
    summary: 'Comprehensive view of weekly focus distributions, streak records, and hero sublevel achievements.',
  },
  'growth.streak': {
    id: 'growth.streak',
    title: 'Daily Streak',
    category: 'Discipline',
    summary: 'Consecutive days of completing your planned daily focus. Maintains momentum and unlocks milestones.',
  },
  'growth.xp': {
    id: 'growth.xp',
    title: 'Lifetime XP',
    category: 'Mastery',
    summary: 'Total experience earned across all completed focus work, powering your psychological hero progression.',
  },
  'dashboard.focus': {
    id: 'dashboard.focus',
    title: 'Primary Daily Focus',
    category: 'Focus',
    summary: 'The single most consequential objective of your day. Completing it anchors your focus session.',
  },
  'dashboard.timeRadar': {
    id: 'dashboard.timeRadar',
    title: 'Daylight & Time Budget Radar',
    category: 'Time',
    summary: 'Visual radar of remaining daylight hours, committed task duration load, and safe buffer time.',
  },
};

export function computeGuidePosition(
  anchorRect: DOMRect | { top: number; bottom: number; left: number; right: number; width: number; height: number },
  popupWidth: number,
  popupHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { top: number; left: number; placement: 'bottom' | 'top' } {
  const margin = 12;
  const gap = 8;

  // Horizontal: Center on anchor, clamped to viewport margins
  let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
  left = Math.max(margin, Math.min(viewportWidth - popupWidth - margin, left));

  // Vertical: Default below, flip above if bottom overflows
  let placement: 'bottom' | 'top' = 'bottom';
  let top = anchorRect.bottom + gap;

  if (top + popupHeight + margin > viewportHeight && anchorRect.top - popupHeight - gap >= margin) {
    placement = 'top';
    top = anchorRect.top - popupHeight - gap;
  }

  return { top: Math.round(top), left: Math.round(left), placement };
}
