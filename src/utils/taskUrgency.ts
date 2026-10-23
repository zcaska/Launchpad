import { QuickNote, TaskPriority, Subtask } from '../types';

// ============================================================================
// 1. Task Deadline Urgency Types & Constants
// ============================================================================

export type UrgencyTier =
  | 'overdue'      // Deadline has passed (< 0)
  | 'due_soon'     // Due within 24 hours (< 1 day)
  | 'upcoming'     // Due within 1 to 3 days (24h - 72h)
  | 'later'        // Due in > 3 days up to 14 days
  | 'long_term'    // Due in >= 14 days
  | 'no_deadline'; // No deadline or unparseable

export interface UrgencyColorTokens {
  badge: string;
  badgeBorder: string;
  text: string;
  bgLight: string;
  radarRing: string;
  radarPoint: string;
}

export interface TaskUrgencyInfo {
  tier: UrgencyTier;
  label: string;
  badgeText: string;
  diffMs: number | null;
  diffHours: number | null;
  diffDays: number | null;
  deadlineDate: Date | null;
  urgencyWeight: number; // 0 to 100 for composite ranking
  isOverdue: boolean;
  isDueToday: boolean;
  colors: UrgencyColorTokens;
}

/**
 * Serene Hearth theme tokens for each urgency tier.
 */
export const URGENCY_COLOR_MAP: Record<UrgencyTier, UrgencyColorTokens> = {
  overdue: {
    badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-300 dark:border-rose-800/60',
    text: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50/70 dark:bg-rose-950/20',
    radarRing: '#f43f5e',
    radarPoint: '#e11d48',
  },
  due_soon: {
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300 dark:border-amber-800/60',
    text: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50/70 dark:bg-amber-950/20',
    radarRing: '#f59e0b',
    radarPoint: '#d97706',
  },
  upcoming: {
    badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300',
    badgeBorder: 'border-sky-300 dark:border-sky-800/60',
    text: 'text-sky-600 dark:text-sky-400',
    bgLight: 'bg-sky-50/70 dark:bg-sky-950/20',
    radarRing: '#0284c7',
    radarPoint: '#0369a1',
  },
  later: {
    badge: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-300 dark:border-indigo-800/60',
    text: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    radarRing: '#6366f1',
    radarPoint: '#4f46e5',
  },
  long_term: {
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    bgLight: 'bg-slate-50/70 dark:bg-slate-900/20',
    radarRing: '#64748b',
    radarPoint: '#475569',
  },
  no_deadline: {
    badge: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
    badgeBorder: 'border-stone-200 dark:border-stone-700',
    text: 'text-stone-500 dark:text-stone-400',
    bgLight: 'bg-stone-50/50 dark:bg-stone-900/10',
    radarRing: '#a8a29e',
    radarPoint: '#78716c',
  },
};

/**
 * Base urgency ranking weight per tier (0 - 100).
 */
export const URGENCY_TIER_WEIGHTS: Record<UrgencyTier, number> = {
  overdue: 100,
  due_soon: 80,
  upcoming: 50,
  later: 25,
  long_term: 10,
  no_deadline: 5,
};

// ============================================================================
// 1. Deadline Parsing & Urgency Calculation
// ============================================================================

/**
 * Robustly parses task deadline strings:
 * - HH:MM (e.g. "14:30") -> Today at that time
 * - YYYY-MM-DD -> End of that day (23:59:59.999 local time)
 * - YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM -> Specific date & time
 * - Standard ISO 8601 strings
 */
export function parseTaskDeadline(deadlineStr?: string, refDate: Date = new Date()): Date | null {
  if (!deadlineStr || typeof deadlineStr !== 'string') return null;
  const cleanStr = deadlineStr.trim();
  if (!cleanStr) return null;

  // 1. Time only format: HH:MM
  if (/^\d{1,2}:\d{2}$/.test(cleanStr)) {
    const [hours, minutes] = cleanStr.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const d = new Date(refDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // 2. Date only format: YYYY-MM-DD -> Set to end of day
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [year, month, day] = cleanStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Combined date and time format: YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(cleanStr)) {
    const [datePart, timePart] = cleanStr.replace('T', ' ').split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // 4. Fallback to native Date parser
  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Evaluates the deadline urgency of a task:
 * - Overdue: < 0 ms
 * - Due soon: 0 ms <= diff < 24 hours (< 1 day)
 * - Upcoming: 24 hours <= diff < 72 hours (1 - 3 days)
 * - Later: 72 hours <= diff < 14 days (> 3 days)
 * - Long term: diff >= 14 days
 * - No deadline: null or invalid
 */
export function calculateTaskUrgency(
  deadlineStr?: string,
  refDate: Date = new Date()
): TaskUrgencyInfo {
  const deadlineDate = parseTaskDeadline(deadlineStr, refDate);

  if (!deadlineDate) {
    return {
      tier: 'no_deadline',
      label: 'No deadline',
      badgeText: 'No deadline',
      diffMs: null,
      diffHours: null,
      diffDays: null,
      deadlineDate: null,
      urgencyWeight: URGENCY_TIER_WEIGHTS.no_deadline,
      isOverdue: false,
      isDueToday: false,
      colors: URGENCY_COLOR_MAP.no_deadline,
    };
  }

  const diffMs = deadlineDate.getTime() - refDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isDueToday =
    deadlineDate.getFullYear() === refDate.getFullYear() &&
    deadlineDate.getMonth() === refDate.getMonth() &&
    deadlineDate.getDate() === refDate.getDate();

  // Tier 1: Overdue
  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    let label = 'Overdue';
    if (overdueHours < 1) {
      label = `Overdue by ${Math.max(1, Math.round(Math.abs(diffMs) / 60000))}m`;
    } else if (overdueHours < 24) {
      label = `Overdue by ${Math.round(overdueHours)}h`;
    } else {
      const overdueDays = Math.round(Math.abs(diffDays));
      label = `Overdue by ${overdueDays}d`;
    }

    return {
      tier: 'overdue',
      label,
      badgeText: 'Overdue',
      diffMs,
      diffHours,
      diffDays,
      deadlineDate,
      urgencyWeight: URGENCY_TIER_WEIGHTS.overdue,
      isOverdue: true,
      isDueToday,
      colors: URGENCY_COLOR_MAP.overdue,
    };
  }

  // Tier 2: Due Soon (< 1 day / < 24h)
  if (diffHours < 24) {
    let label = 'Due soon';
    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffMs / 60000));
      label = `Due in ${mins}m`;
    } else if (isDueToday) {
      const timeStr = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      label = `Due today ${timeStr}`;
    } else {
      label = `Due in ${Math.round(diffHours)}h`;
    }

    return {
      tier: 'due_soon',
      label,
      badgeText: 'Due <1d',
      diffMs,
      diffHours,
      diffDays,
      deadlineDate,
      urgencyWeight: URGENCY_TIER_WEIGHTS.due_soon,
      isOverdue: false,
      isDueToday,
      colors: URGENCY_COLOR_MAP.due_soon,
    };
  }

  // Tier 3: Upcoming (1 - 3 days / 24h to < 72h)
  if (diffHours < 72) {
    const daysRemaining = Math.max(1, Math.round(diffDays));
    const label = daysRemaining === 1 ? 'Due tomorrow' : `Due in ${daysRemaining} days`;

    return {
      tier: 'upcoming',
      label,
      badgeText: '1-3d',
      diffMs,
      diffHours,
      diffDays,
      deadlineDate,
      urgencyWeight: URGENCY_TIER_WEIGHTS.upcoming,
      isOverdue: false,
      isDueToday: false,
      colors: URGENCY_COLOR_MAP.upcoming,
    };
  }

  // Tier 4: Later (> 3 days up to 14 days)
  if (diffDays < 14) {
    const daysRemaining = Math.round(diffDays);
    const monthDay = deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const label = `Due in ${daysRemaining}d (${monthDay})`;

    return {
      tier: 'later',
      label,
      badgeText: '>3d',
      diffMs,
      diffHours,
      diffDays,
      deadlineDate,
      urgencyWeight: URGENCY_TIER_WEIGHTS.later,
      isOverdue: false,
      isDueToday: false,
      colors: URGENCY_COLOR_MAP.later,
    };
  }

  // Tier 5: Long term (>= 14 days)
  const formattedDate = deadlineDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: deadlineDate.getFullYear() !== refDate.getFullYear() ? 'numeric' : undefined,
  });

  return {
    tier: 'long_term',
    label: `Long term (${formattedDate})`,
    badgeText: 'Long term',
    diffMs,
    diffHours,
    diffDays,
    deadlineDate,
    urgencyWeight: URGENCY_TIER_WEIGHTS.long_term,
    isOverdue: false,
    isDueToday: false,
    colors: URGENCY_COLOR_MAP.long_term,
  };
}

// ============================================================================
// 2. Concentric Commitment Radar Coordinate Projection Algorithm
// ============================================================================

export interface RadarViewBox {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export const RADAR_VIEWBOX: RadarViewBox = {
  width: 500,
  height: 400,
  centerX: 250,
  centerY: 200,
};

export interface RadarRingConfig {
  tier: UrgencyTier;
  label: string;
  baseRadius: number;
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fillColor?: string;
}

/**
 * Concentric rings configuration within SVG viewBox 0 0 500 400.
 * Radius scales from innermost (Overdue danger center) to outer calm perimeter.
 */
export const RADAR_RINGS: RadarRingConfig[] = [
  {
    tier: 'overdue',
    label: 'Overdue',
    baseRadius: 42,
    strokeColor: '#f43f5e', // rose-500
    strokeWidth: 1.5,
    strokeDasharray: '3 3',
    fillColor: 'rgba(244, 63, 94, 0.05)',
  },
  {
    tier: 'due_soon',
    label: 'Due <1d',
    baseRadius: 78,
    strokeColor: '#f59e0b', // amber-500
    strokeWidth: 1.25,
    strokeDasharray: '4 4',
    fillColor: 'rgba(245, 158, 11, 0.03)',
  },
  {
    tier: 'upcoming',
    label: '1-3d',
    baseRadius: 114,
    strokeColor: '#0284c7', // sky-600
    strokeWidth: 1.0,
    strokeDasharray: 'none',
  },
  {
    tier: 'later',
    label: '>3d',
    baseRadius: 150,
    strokeColor: '#6366f1', // indigo-500
    strokeWidth: 1.0,
    strokeDasharray: 'none',
  },
  {
    tier: 'long_term',
    label: 'Long Term',
    baseRadius: 176,
    strokeColor: '#94a3b8', // slate-400
    strokeWidth: 0.75,
    strokeDasharray: '2 2',
  },
  {
    tier: 'no_deadline',
    label: 'Open Horizon',
    baseRadius: 194,
    strokeColor: '#cbd5e1', // slate-300
    strokeWidth: 0.5,
    strokeDasharray: '1 3',
  },
];

export interface RadarProjectedNode {
  task: QuickNote;
  x: number;
  y: number;
  radius: number;
  angleRadians: number;
  angleDegrees: number;
  urgency: TaskUrgencyInfo;
  tier: UrgencyTier;
  ringIndex: number;
  isSubTrack: boolean;
  priorityWeight: number;
  nodeSize: number;
}

export interface RadarProjectionOptions {
  viewBox?: RadarViewBox;
  referenceDate?: Date;
  minNodeDistance?: number; // Minimum arc distance between nodes on the same ring in px
  nodeRadius?: number;      // Visual circle radius in px
  boundaryPadding?: number; // Padding from SVG viewBox edges
}

/**
 * Concentric Commitment Radar coordinate projection algorithm:
 * - Projects tasks onto concentric rings according to their urgency tier.
 * - Enforces non-overlapping angular distribution with phase offset per ring.
 * - Employs alternating radial interleaving (sub-tracks) if ring capacity is exceeded.
 * - Clamps coordinates safely inside SVG viewBox (0 0 500 400).
 */
export function projectTasksToRadarCoordinates(
  tasks: QuickNote[],
  options: RadarProjectionOptions = {}
): RadarProjectedNode[] {
  const {
    viewBox = RADAR_VIEWBOX,
    referenceDate = new Date(),
    minNodeDistance = 26,
    nodeRadius = 9,
    boundaryPadding = 18,
  } = options;

  // Filter only active pending tasks
  const pendingTasks = tasks.filter((t) => !t.isDone);
  if (pendingTasks.length === 0) return [];

  // Group tasks by urgency tier
  const tasksByTier: Record<UrgencyTier, Array<{ task: QuickNote; urgency: TaskUrgencyInfo }>> = {
    overdue: [],
    due_soon: [],
    upcoming: [],
    later: [],
    long_term: [],
    no_deadline: [],
  };

  pendingTasks.forEach((task) => {
    const urgency = calculateTaskUrgency(task.deadline, referenceDate);
    tasksByTier[urgency.tier].push({ task, urgency });
  });

  const projectedNodes: RadarProjectedNode[] = [];
  const ringMap = new Map(RADAR_RINGS.map((r, idx) => [r.tier, { ring: r, index: idx }]));

  // Golden angle (in radians) to stagger starting phases across rings
  // This prevents nodes on adjacent concentric rings from lining up in ugly radial spokes.
  const GOLDEN_ANGLE_RAD = 2.399963;

  RADAR_RINGS.forEach((ringDef) => {
    const tierTasks = tasksByTier[ringDef.tier];
    const n = tierTasks.length;
    if (n === 0) return;

    const ringInfo = ringMap.get(ringDef.tier);
    const ringIndex = ringInfo ? ringInfo.index : 0;
    const baseR = ringDef.baseRadius;

    // Sort tasks in tier by priority (urgent -> high -> medium -> low)
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    tierTasks.sort((a, b) => {
      const pA = priorityOrder[a.task.priority || 'medium'] || 2;
      const pB = priorityOrder[b.task.priority || 'medium'] || 2;
      return pB - pA;
    });

    // Check if tasks would crowd on this ring
    // Circumference = 2 * PI * R
    // Distance between adjacent items = Circumference / n
    const circumference = 2 * Math.PI * baseR;
    const spacing = circumference / n;
    const requiresSubTracks = spacing < minNodeDistance && n > 2;
    const subTrackDelta = 10; // offset in px for inner/outer sub-track

    // Phase offset per ring
    const ringPhase = (ringIndex * GOLDEN_ANGLE_RAD) % (2 * Math.PI);

    for (let i = 0; i < n; i++) {
      const item = tierTasks[i];
      const priorityWeight = priorityOrder[item.task.priority || 'medium'] || 2;

      // Base angle: evenly distributed around 2 * PI
      const angle = ringPhase + (i * 2 * Math.PI) / n - Math.PI / 2;

      // Sub-track radial adjustment if overcrowded
      let effectiveR = baseR;
      let isSubTrack = false;
      if (requiresSubTracks) {
        // Alternate between slightly inside and slightly outside the ring
        effectiveR = i % 2 === 0 ? baseR - subTrackDelta : baseR + subTrackDelta;
        isSubTrack = true;
      }

      // Convert polar (r, theta) to Cartesian (x, y)
      let x = viewBox.centerX + effectiveR * Math.cos(angle);
      let y = viewBox.centerY + effectiveR * Math.sin(angle);

      // Boundary clamping to ensure nodes never bleed beyond viewBox
      const minX = boundaryPadding + nodeRadius;
      const maxX = viewBox.width - boundaryPadding - nodeRadius;
      const minY = boundaryPadding + nodeRadius;
      const maxY = viewBox.height - boundaryPadding - nodeRadius;

      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));

      const angleDegrees = ((angle * 180) / Math.PI + 360) % 360;

      // Dynamic node radius based on priority (urgent/high slightly larger)
      const dynamicNodeSize =
        item.task.priority === 'urgent'
          ? nodeRadius + 3
          : item.task.priority === 'high'
          ? nodeRadius + 1.5
          : nodeRadius;

      projectedNodes.push({
        task: item.task,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        radius: effectiveR,
        angleRadians: angle,
        angleDegrees: Math.round(angleDegrees * 10) / 10,
        urgency: item.urgency,
        tier: ringDef.tier,
        ringIndex,
        isSubTrack,
        priorityWeight,
        nodeSize: dynamicNodeSize,
      });
    }
  });

  return projectedNodes;
}

// ============================================================================
// 3. Stable Subtask Container Behavior
// ============================================================================

export const DEFAULT_VISIBLE_SUBTASKS = 2;

export interface SubtaskContainerState {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  progressPercentage: number;
  canExpand: boolean;
  isExpanded: boolean;
  hiddenCount: number;
  visibleSubtasks: Subtask[];
  status: 'empty' | 'unstarted' | 'in_progress' | 'completed';
  toggleLabel: string;
  classes: {
    wrapper: string;
    list: string;
    progressBar: string;
    expandButton: string;
  };
}

/**
 * Computes deterministic, stable subtask container behavior:
 * - Exactly 2 items visible by default in compact mode.
 * - Smooth expansion toggle when subtasks > 2.
 * - Strict scroll containment (overscroll-contain, max-h, scrollbar-thin) to prevent layout shifts.
 */
export function computeSubtaskContainerState(
  subtasks: Subtask[] = [],
  isExpanded: boolean = false,
  defaultVisibleCount: number = DEFAULT_VISIBLE_SUBTASKS
): SubtaskContainerState {
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.isDone).length;
  const pendingCount = totalCount - completedCount;
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPercentage = Math.round(progressRatio * 100);

  const canExpand = totalCount > defaultVisibleCount;
  const hiddenCount = canExpand && !isExpanded ? totalCount - defaultVisibleCount : 0;
  const visibleSubtasks = isExpanded ? subtasks : subtasks.slice(0, defaultVisibleCount);

  let status: 'empty' | 'unstarted' | 'in_progress' | 'completed' = 'empty';
  if (totalCount > 0) {
    if (completedCount === totalCount) status = 'completed';
    else if (completedCount > 0) status = 'in_progress';
    else status = 'unstarted';
  }

  const toggleLabel = isExpanded
    ? 'Show less'
    : `+${hiddenCount} more ${hiddenCount === 1 ? 'subtask' : 'subtasks'}`;

  // Deterministic CSS utility classes for layout stability & scroll containment
  const classes = {
    wrapper: 'mt-2.5 pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60',
    list: isExpanded
      ? 'space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin'
      : 'space-y-1.5 overflow-hidden',
    progressBar: 'h-1 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden my-1.5',
    expandButton:
      'mt-1.5 text-[11px] font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline flex items-center gap-1 transition-colors',
  };

  return {
    totalCount,
    completedCount,
    pendingCount,
    progressPercentage,
    canExpand,
    isExpanded,
    hiddenCount,
    visibleSubtasks,
    status,
    toggleLabel,
    classes,
  };
}

// ============================================================================
// 4. Momentum & Next Opportunity Ranking Logic
// ============================================================================

export interface OpportunityScoreBreakdown {
  urgencyScore: number;     // 0 - 100
  priorityScore: number;    // 0 - 50
  momentumScore: number;    // 0 - 35
  quickWinScore: number;    // 0 - 20
  feasibilityScore: number; // -15 to +15
  totalScore: number;       // Composite sum
}

export type OpportunityTag =
  | 'critical_overdue'
  | 'high_momentum'
  | 'quick_win'
  | 'prime_objective'
  | 'deep_work'
  | 'steady_progress';

export interface RankedTaskOpportunity {
  task: QuickNote;
  rank: number;
  compositeScore: number;
  breakdown: OpportunityScoreBreakdown;
  urgency: TaskUrgencyInfo;
  subtaskState: SubtaskContainerState;
  tag: OpportunityTag;
  tagLabel: string;
  rationale: string;
}

export interface OpportunityRankingOptions {
  availableFocusMinutes?: number; // Minutes remaining in schedule runway before next meeting / bedtime
  referenceDate?: Date;
}

/**
 * Priority scoring weights (0 - 50).
 */
const PRIORITY_SCORES: Record<TaskPriority, number> = {
  urgent: 50,
  high: 35,
  medium: 20,
  low: 8,
};

/**
 * Calculates the individual score components for a task.
 */
export function calculateTaskOpportunityScore(
  task: QuickNote,
  options: OpportunityRankingOptions = {}
): {
  breakdown: OpportunityScoreBreakdown;
  urgency: TaskUrgencyInfo;
  subtaskState: SubtaskContainerState;
  tag: OpportunityTag;
  tagLabel: string;
  rationale: string;
} {
  const { availableFocusMinutes, referenceDate = new Date() } = options;
  const urgency = calculateTaskUrgency(task.deadline, referenceDate);
  const subtaskState = computeSubtaskContainerState(task.subtasks, false);
  const duration = task.durationMinutes || 30;

  // 1. Urgency Score (0 - 100)
  let urgencyScore = 0;
  if (urgency.tier === 'overdue') {
    // Overdue tasks: base 90 + up to 10 points for how long it has lingered
    const overdueHours = urgency.diffHours ? Math.abs(urgency.diffHours) : 1;
    urgencyScore = Math.min(100, 90 + Math.floor(overdueHours / 2));
  } else if (urgency.tier === 'due_soon') {
    // Due soon (<24h): 60 to 85 points inversely proportional to hours left
    const hoursLeft = Math.max(0, urgency.diffHours ?? 12);
    urgencyScore = Math.round(85 - (hoursLeft / 24) * 25);
  } else if (urgency.tier === 'upcoming') {
    // Upcoming (1-3d): 30 to 55 points
    const hoursLeft = Math.max(24, urgency.diffHours ?? 48);
    urgencyScore = Math.round(55 - ((hoursLeft - 24) / 48) * 25);
  } else if (urgency.tier === 'later') {
    urgencyScore = 20;
  } else if (urgency.tier === 'long_term') {
    urgencyScore = 10;
  } else {
    // No deadline: baseline 12
    urgencyScore = 12;
  }

  // 2. Priority Score (0 - 50)
  const priorityScore = PRIORITY_SCORES[task.priority || 'medium'] ?? 20;

  // 3. Momentum Score (0 - 35) (Zeigarnik & Endowed Progress Effect)
  // Partially completed checklists represent invested psychological inertia.
  let momentumScore = 0;
  if (subtaskState.totalCount > 0) {
    if (subtaskState.status === 'completed') {
      // All subtasks done! Just needs final task checkmark
      momentumScore = 35;
    } else if (subtaskState.completedCount > 0) {
      // In progress: reward completed ratio
      const ratio = subtaskState.completedCount / subtaskState.totalCount;
      momentumScore = Math.round(15 + ratio * 20); // 15 to 35
    }
  } else {
    momentumScore = 5; // Neutral baseline for atomic task
  }

  // 4. Quick Win Score (0 - 20)
  // Shorter tasks have lower friction and help conquer procrastination inertia
  let quickWinScore = 0;
  if (duration <= 15) quickWinScore = 20;
  else if (duration <= 30) quickWinScore = 15;
  else if (duration <= 45) quickWinScore = 10;
  else if (duration <= 60) quickWinScore = 5;
  else quickWinScore = 0;

  // 5. Schedule Feasibility Score (-15 to +15)
  // Rewards tasks that fit neatly inside current runway; penalizes oversized blocks
  let feasibilityScore = 0;
  if (availableFocusMinutes !== undefined && availableFocusMinutes > 0) {
    if (duration <= availableFocusMinutes) {
      // Fits runway cleanly
      feasibilityScore = 15;
    } else if (duration > availableFocusMinutes * 1.5) {
      // Substantially exceeds runway, risks being interrupted by meeting
      feasibilityScore = -15;
    } else {
      feasibilityScore = -5;
    }
  }

  // Total Composite Score
  const totalScore = urgencyScore + priorityScore + momentumScore + quickWinScore + feasibilityScore;

  const breakdown: OpportunityScoreBreakdown = {
    urgencyScore,
    priorityScore,
    momentumScore,
    quickWinScore,
    feasibilityScore,
    totalScore,
  };

  // Determine human-facing rationale and opportunity tag
  let tag: OpportunityTag = 'steady_progress';
  let tagLabel = 'Next Step';
  let rationale = 'Steady task aligned with your daily workflow';

  if (urgency.tier === 'overdue') {
    tag = 'critical_overdue';
    tagLabel = 'Critical Overdue';
    rationale = `${urgency.label} — clear this barrier first to reset your focus baseline`;
  } else if (momentumScore >= 25 && subtaskState.completedCount > 0) {
    tag = 'high_momentum';
    tagLabel = 'High Momentum';
    rationale = `Already ${subtaskState.progressPercentage}% complete (${subtaskState.completedCount}/${subtaskState.totalCount} subtasks done) — finish the final stretch!`;
  } else if (duration <= 30 && (urgency.tier === 'due_soon' || priorityScore >= 35)) {
    tag = 'quick_win';
    tagLabel = 'Quick Win';
    rationale = `Fast ${duration}m turnaround to build immediate accomplishment momentum`;
  } else if (priorityScore >= 35 && urgency.tier === 'due_soon') {
    tag = 'prime_objective';
    tagLabel = 'Prime Objective';
    rationale = `${task.priority?.toUpperCase()} priority due today — highest strategic impact`;
  } else if (duration >= 60 && feasibilityScore > 0) {
    tag = 'deep_work';
    tagLabel = 'Deep Work';
    rationale = `Generous focus runway available for uninterrupted deep focus (${duration}m)`;
  }

  return {
    breakdown,
    urgency,
    subtaskState,
    tag,
    tagLabel,
    rationale,
  };
}

/**
 * Ranks all pending tasks by optimal Next Opportunity score.
 */
export function rankTasksByOpportunity(
  tasks: QuickNote[],
  options: OpportunityRankingOptions = {}
): RankedTaskOpportunity[] {
  const pendingTasks = tasks.filter((t) => !t.isDone);
  if (pendingTasks.length === 0) return [];

  const scored = pendingTasks.map((task) => {
    const analysis = calculateTaskOpportunityScore(task, options);
    return {
      task,
      compositeScore: analysis.breakdown.totalScore,
      breakdown: analysis.breakdown,
      urgency: analysis.urgency,
      subtaskState: analysis.subtaskState,
      tag: analysis.tag,
      tagLabel: analysis.tagLabel,
      rationale: analysis.rationale,
    };
  });

  // Sort descending by composite score
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Derives human-friendly countdown strings matching Image 1:
 * "5h 35m left", "2 days left", "4 days left", "6 days left", "1 week left",
 * "18m overdue", "No deadline"
 */
export function formatTaskCountdown(task: QuickNote, refDate: Date = new Date()): string {
  const urgency = calculateTaskUrgency(task.deadline, refDate);

  if (!urgency.deadlineDate || urgency.diffMs === null) {
    return 'No deadline';
  }

  const diffMs = urgency.diffMs;

  if (diffMs < 0) {
    const overdueMins = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
    if (overdueMins < 60) return `${overdueMins}m overdue`;
    const hours = Math.floor(overdueMins / 60);
    const mins = overdueMins % 60;
    if (hours < 24) {
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return `Overdue by ${timeStr}`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Overdue by ${days}d ${remHours}h`;
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours < 24) {
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return `${timeStr} left`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h left`;
}

/**
 * Returns the single top recommended Next Opportunity task.
 */
export function getTopOpportunity(
  tasks: QuickNote[],
  options: OpportunityRankingOptions = {}
): RankedTaskOpportunity | null {
  const ranked = rankTasksByOpportunity(tasks, options);
  return ranked.length > 0 ? ranked[0] : null;
}

// ============================================================================
// 5. Session Momentum Index
// ============================================================================

export interface SessionMomentumStats {
  momentumIndex: number; // 0 - 100
  tierName: 'Ignition' | 'Building Steam' | 'Flow State' | 'Unstoppable';
  completedTasks: number;
  totalTasks: number;
  completedSubtasks: number;
  totalSubtasks: number;
  highMomentumTaskCount: number;
  velocityDescription: string;
}

/**
 * Evaluates session momentum across all tasks:
 * Measures completion ratio, subtask progress velocity, and pending block friction.
 */
export function calculateSessionMomentumIndex(tasks: QuickNote[]): SessionMomentumStats {
  if (tasks.length === 0) {
    return {
      momentumIndex: 0,
      tierName: 'Ignition',
      completedTasks: 0,
      totalTasks: 0,
      completedSubtasks: 0,
      totalSubtasks: 0,
      highMomentumTaskCount: 0,
      velocityDescription: 'No active tasks yet. Set a focus item to ignite momentum.',
    };
  }

  const completedTasks = tasks.filter((t) => t.isDone).length;
  const totalTasks = tasks.length;
  const taskCompletionRatio = completedTasks / totalTasks;

  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let highMomentumTaskCount = 0;

  tasks.forEach((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      totalSubtasks += t.subtasks.length;
      const done = t.subtasks.filter((s) => s.isDone).length;
      completedSubtasks += done;
      if (!t.isDone && done > 0 && done / t.subtasks.length >= 0.5) {
        highMomentumTaskCount++;
      }
    }
  });

  const subtaskRatio = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

  // Composite momentum calculation (0 - 100)
  // Base 15 + task completion (up to 50) + subtask progress (up to 25) + in-flight boost (up to 10)
  let momentum = Math.round(
    taskCompletionRatio * 55 +
    subtaskRatio * 25 +
    Math.min(20, highMomentumTaskCount * 10)
  );

  momentum = Math.max(0, Math.min(100, momentum));

  let tierName: 'Ignition' | 'Building Steam' | 'Flow State' | 'Unstoppable' = 'Ignition';
  let velocityDescription = 'Overcoming inertia: tackle a quick win to build momentum.';

  if (momentum >= 80) {
    tierName = 'Unstoppable';
    velocityDescription = 'Unstoppable velocity: exceptional flow across tasks and subtasks!';
  } else if (momentum >= 55) {
    tierName = 'Flow State';
    velocityDescription = 'Deep in the groove: high task completion with active in-flight progress.';
  } else if (momentum >= 25) {
    tierName = 'Building Steam';
    velocityDescription = 'Momentum is accelerating: continue checking off active subtasks.';
  }

  return {
    momentumIndex: momentum,
    tierName,
    completedTasks,
    totalTasks,
    completedSubtasks,
    totalSubtasks,
    highMomentumTaskCount,
    velocityDescription,
  };
}

// ============================================================================
// 6. Subtask & Task Completion Synchronization
// ============================================================================

/**
 * Toggles completion status of a task within a list, ensuring that:
 * 1. Completing a parent task marks all its subtasks complete.
 * 2. Uncompleting a parent task marks all its subtasks incomplete.
 */
export function toggleTaskInList(
  tasks: QuickNote[],
  taskId: string
): { updatedTasks: QuickNote[]; toggledTask?: QuickNote; isNowDone: boolean } {
  let toggledTask: QuickNote | undefined;
  let isNowDone = false;

  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId) return task;

    const nextIsDone = !task.isDone;
    isNowDone = nextIsDone;

    const nextSubtasks = task.subtasks
      ? task.subtasks.map((st) => ({ ...st, isDone: nextIsDone }))
      : undefined;

    const updated: QuickNote = {
      ...task,
      isDone: nextIsDone,
      ...(nextSubtasks ? { subtasks: nextSubtasks } : {}),
    };
    toggledTask = updated;
    return updated;
  });

  return { updatedTasks, toggledTask, isNowDone };
}

/**
 * Toggles completion status of a subtask within a task, ensuring that:
 * 1. Completing all subtasks marks the parent task complete.
 * 2. Uncompleting any subtask when parent was complete marks the parent task incomplete.
 */
export function toggleSubtaskInList(
  tasks: QuickNote[],
  taskId: string,
  subtaskId: string
): {
  updatedTasks: QuickNote[];
  parentTask?: QuickNote;
  parentBecameDone: boolean;
  parentBecameIncomplete: boolean;
} {
  let parentTask: QuickNote | undefined;
  let parentBecameDone = false;
  let parentBecameIncomplete = false;

  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId || !task.subtasks) return task;

    const nextSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isDone: !st.isDone } : st
    );

    const allSubtasksDone =
      nextSubtasks.length > 0 && nextSubtasks.every((st) => st.isDone);

    let nextIsDone = task.isDone;
    if (allSubtasksDone && !task.isDone) {
      nextIsDone = true;
      parentBecameDone = true;
    } else if (!allSubtasksDone && task.isDone) {
      nextIsDone = false;
      parentBecameIncomplete = true;
    }

    const updated: QuickNote = {
      ...task,
      isDone: nextIsDone,
      subtasks: nextSubtasks,
    };
    parentTask = updated;
    return updated;
  });

  return { updatedTasks, parentTask, parentBecameDone, parentBecameIncomplete };
}
