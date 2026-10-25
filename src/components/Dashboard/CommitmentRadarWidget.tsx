import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Info,
  ArrowRight,
  Plant as Leaf,
  Compass,
  List,
  Clock,
  ArrowSquareOut as ExternalLink,
  LinkSimple as Link2,
  Check,
  X
} from '@phosphor-icons/react';
import { QuickNote, CalendarScheduleSummary } from '../../types';
import { TaskPreviewPopUp } from '../Tasks/TaskPreviewPopUp';
import {
  projectTasksToRadarCoordinates,
  RADAR_VIEWBOX,
  RADAR_RINGS,
  URGENCY_COLOR_MAP,
  calculateTaskUrgency,
  UrgencyTier,
  RadarProjectedNode,
} from '../../utils/taskUrgency';

export interface CommitmentRadarWidgetProps {
  tasks: QuickNote[];
  onSelectTask?: (id: string) => void;
  onPreviewTask?: (id: string) => void;
  onOpenTasks?: () => void;
  className?: string;
  calendarSummary?: CalendarScheduleSummary;
}

export type RadarViewMode = 'radar' | 'list';

/**
 * Visual styling token mapping aligned with Image 1 & Serene Hearth theme.
 */
export interface TierPresentation {
  tier: UrgencyTier;
  legendLabel: string;
  legendDotColor: string;
  pulseColor: string;
  badgeBg: string;
  badgeText: string;
}

export const TIER_PRESENTATION_MAP: Record<UrgencyTier, TierPresentation> = {
  overdue: {
    tier: 'overdue',
    legendLabel: 'Critical (< 1 day)',
    legendDotColor: URGENCY_COLOR_MAP.overdue.radarRing,
    pulseColor: 'rgba(244, 63, 94, 0.4)',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  due_soon: {
    tier: 'due_soon',
    legendLabel: 'Critical (< 1 day)',
    legendDotColor: URGENCY_COLOR_MAP.overdue.radarRing,
    pulseColor: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  upcoming: {
    tier: 'upcoming',
    legendLabel: 'Upcoming (1–3 days)',
    legendDotColor: '#f97316', // orange-500
    pulseColor: 'rgba(249, 115, 22, 0.35)',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
  },
  later: {
    tier: 'later',
    legendLabel: 'Later (> 3 days)',
    legendDotColor: '#eab308', // yellow-500 / amber-500
    pulseColor: 'rgba(234, 179, 8, 0.35)',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
  },
  long_term: {
    tier: 'long_term',
    legendLabel: 'Long term',
    legendDotColor: '#10b981', // emerald-500
    pulseColor: 'rgba(16, 185, 129, 0.3)',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
  },
  no_deadline: {
    tier: 'no_deadline',
    legendLabel: 'No deadline',
    legendDotColor: '#64748b', // slate-500
    pulseColor: 'rgba(100, 116, 139, 0.25)',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
};

/**
 * Derives human-friendly countdown strings matching Image 1:
 * "5h 35m left", "2 days left", "4 days left", "6 days left", "1 week left"
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
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m overdue` : `${hours}h overdue`;
    const days = Math.round(hours / 24);
    return `${days}d overdue`;
  }

  const totalMins = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hours < 24) {
    if (hours === 0) return `${mins}m left`;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }

  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} left`;
}

/**
 * Truncates task titles gracefully for SVG node callout labels.
 */
function truncateText(str: string, maxLength: number = 16): string {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
}

export const CommitmentRadarWidget: React.FC<CommitmentRadarWidgetProps> = React.memo(({
  tasks,
  onSelectTask,
  onPreviewTask,
  onOpenTasks,
  className = '',
  calendarSummary,
}) => {
  const [viewMode, setViewMode] = useState<RadarViewMode>('radar');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [selectedLegendTier, setSelectedLegendTier] = useState<UrgencyTier | 'critical_all' | null>(null);
  const [showHeaderTooltip, setShowHeaderTooltip] = useState(false);
  const [showCenterCaptionTooltip, setShowCenterCaptionTooltip] = useState(false);
  // Legend starts collapsed so it never covers the radar; opened on demand.
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleTaskMouseEnter = (taskId: string) => {
    clearHoverTimeout();
    setHoveredTaskId(taskId);
    setActiveTaskId(taskId);
  };

  const handleTaskMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null);
      setActiveTaskId(null);
    }, 250);
  };

  const handleCardMouseEnter = () => {
    clearHoverTimeout();
  };

  const handleCardMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null);
      setActiveTaskId(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      clearHoverTimeout();
    };
  }, []);

  const [now, setNow] = useState<Date>(() => new Date());

  // 60-second heartbeat ticker to keep countdown labels live
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Filter active pending tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => !t.isDone);
  }, [tasks]);

  // 2. Project tasks onto Concentric Radar coordinates
  const projectedNodes = useMemo<RadarProjectedNode[]>(() => {
    return projectTasksToRadarCoordinates(pendingTasks, {
      viewBox: RADAR_VIEWBOX,
      referenceDate: now,
      minNodeDistance: 32,
      nodeRadius: 8,
      boundaryPadding: 24,
    });
  }, [pendingTasks, now]);

  // 3. Reconciled task breakdown counts across urgency tiers
  const tierCounts = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let upcoming = 0;
    let later = 0;
    let longTerm = 0;
    let noDeadline = 0;

    pendingTasks.forEach((t) => {
      const urgency = calculateTaskUrgency(t.deadline, now);
      switch (urgency.tier) {
        case 'overdue':
          overdue++;
          break;
        case 'due_soon':
          dueSoon++;
          break;
        case 'upcoming':
          upcoming++;
          break;
        case 'later':
          later++;
          break;
        case 'long_term':
          longTerm++;
          break;
        case 'no_deadline':
        default:
          noDeadline++;
          break;
      }
    });

    const critical = overdue + dueSoon;

    return {
      overdue,
      dueSoon,
      critical,
      upcoming,
      later,
      longTerm,
      noDeadline,
      total: pendingTasks.length,
    };
  }, [pendingTasks, now]);

  // 4. Derive Overall Status headline & narrative
  const overallStatus = useMemo(() => {
    if (tierCounts.total === 0) {
      return {
        title: 'Clear horizon',
        subtitle: 'All commitments completed. Enjoy your open focus time.',
        isOptimal: true,
      };
    }

    if (tierCounts.overdue > 0) {
      return {
        title: 'Needs attention',
        subtitle: `${tierCounts.overdue} overdue ${tierCounts.overdue === 1 ? 'task' : 'tasks'} requiring immediate review.`,
        isOptimal: false,
      };
    }

    if (tierCounts.critical > 3) {
      return {
        title: 'High workload',
        subtitle: `${tierCounts.critical} tasks due today. Prioritize your prime objective.`,
        isOptimal: false,
      };
    }

    if (calendarSummary && calendarSummary.remainingBusyMinutesToday > 360) {
      return {
        title: 'Dense schedule',
        subtitle: 'Heavy meeting load today. Protect your remaining focus blocks.',
        isOptimal: true,
      };
    }

    // Default matching Image 1: "On track" & "You can finish your current commitments."
    return {
      title: 'On track',
      subtitle: 'You can finish your current commitments.',
      isOptimal: true,
    };
  }, [tierCounts, calendarSummary]);

  // Filtered nodes if a legend tier is selected for interactive focus
  const visibleNodes = useMemo(() => {
    if (!selectedLegendTier) return projectedNodes;
    if (selectedLegendTier === 'critical_all') {
      return projectedNodes.filter((n) => n.tier === 'overdue' || n.tier === 'due_soon');
    }
    return projectedNodes.filter((n) => n.tier === selectedLegendTier);
  }, [projectedNodes, selectedLegendTier]);

  // Stable nodes list: keep deterministic order so hover does not cause DOM reordering or jitter
  const sortedNodes = visibleNodes;

  const activeNode = useMemo(() => {
    if (!hoveredTaskId) return null;
    return sortedNodes.find((n) => n.task.id === hoveredTaskId) || null;
  }, [sortedNodes, hoveredTaskId]);

  return (
    <>
      <div
        className={`@container w-full h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between select-none ${className}`}
        data-testid="commitment-radar-widget"
      >
      {/* ===================================================================== */}
      {/* 1. TOP HEADER ROW                                                     */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between gap-3 mb-2">
        {/* Left: Circle Plus, Title, Info Tooltip */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-[#1b6b55] dark:text-[#a5cfc3] flex items-center justify-center shrink-0 shadow-xs"
            aria-hidden="true"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>

          <h2 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
            COMMITMENT RADAR
          </h2>

          {/* Info Tooltip */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowHeaderTooltip((prev) => !prev)}
              onMouseEnter={() => setShowHeaderTooltip(true)}
              onMouseLeave={() => setShowHeaderTooltip(false)}
              className="text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-serene-primary"
              aria-label="Commitment radar information"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {showHeaderTooltip && (
              <div
                role="tooltip"
                className="absolute z-30 left-0 top-full mt-1.5 w-64 p-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] leading-relaxed rounded-xl shadow-modal backdrop-blur-sm border border-slate-700/60 pointer-events-none animate-fadeIn"
              >
                Visualizes your pending commitments by deadline urgency. Tasks closer to the center
                require immediate attention, radiating outward to longer horizon tasks.
              </div>
            )}
          </div>
        </div>

        {/* Right: Accessible List/Radar Toggle & "View all tasks ->" */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Accessible View Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'radar' ? 'list' : 'radar'))}
            className="p-1 rounded-md text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title={viewMode === 'radar' ? 'Switch to accessible task list view' : 'Switch to radar graphic view'}
            aria-label={viewMode === 'radar' ? 'Switch to accessible task list view' : 'Switch to radar graphic view'}
          >
            {viewMode === 'radar' ? (
              <>
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] text-serene-text-muted">List</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] text-serene-text-muted">Radar</span>
              </>
            )}
          </button>

          {/* View all tasks link */}
          {onOpenTasks && (
            <button
              type="button"
              onClick={onOpenTasks}
              className="text-xs font-semibold text-serene-primary dark:text-serene-primary-dark hover:underline flex items-center gap-1 transition-colors group cursor-pointer"
              title="Open task management"
            >
              <span className="hidden sm:inline">View all tasks</span>
              <span className="sm:hidden">All tasks</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN BODY: RADAR GRAPHIC OR ACCESSIBLE LIST VIEW                   */}
      {/* ===================================================================== */}
      {viewMode === 'radar' ? (
        <div className="relative w-full flex-1 flex flex-col justify-center items-center my-0 min-h-[290px] overflow-visible">
          {/* Collapsed legend toggle — panel opens on demand instead of covering the radar */}
          <div className="absolute top-1 right-1 z-20 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsLegendOpen((prev) => !prev)}
              aria-expanded={isLegendOpen}
              aria-label="Task legend"
              title={isLegendOpen ? 'Hide task legend' : 'Show task legend'}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/90 dark:bg-serene-surface-dark/90 backdrop-blur-md border border-serene-border-light/80 dark:border-serene-border-dark/80 text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary shadow-subtle transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#f43f5e] shrink-0" aria-hidden="true" />
              <span>Legend</span>
              <span className="font-mono text-[10px] text-serene-text-muted">{tierCounts.total}</span>
            </button>
            {isLegendOpen && (
          <div
            className="bg-white/90 dark:bg-serene-surface-dark/90 backdrop-blur-md border border-serene-border-light/80 dark:border-serene-border-dark/80 rounded-xl p-2.5 sm:p-3 shadow-subtle min-w-[130px] sm:min-w-[145px]"
            role="region"
            aria-label="Task legend"
          >
            <span className="text-[11px] font-bold text-serene-text-primary dark:text-serene-text-darkPrimary block mb-1.5 tracking-tight">
              Task Legend
            </span>
            <ul className="space-y-1 text-[11px]">
              {/* Critical (< 1 day) */}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLegendTier((prev) => (prev === 'critical_all' ? null : 'critical_all'))
                  }
                  className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors text-left ${
                    selectedLegendTier === 'critical_all'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary'
                  }`}
                  title="Filter Critical tasks due within 24h"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e] shrink-0" />
                    <span className="truncate">Critical (<span className="text-[10px]">&lt; 1 day</span>)</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                    {tierCounts.critical}
                  </span>
                </button>
              </li>

              {/* Upcoming (1–3 days) */}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLegendTier((prev) => (prev === 'upcoming' ? null : 'upcoming'))
                  }
                  className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors text-left ${
                    selectedLegendTier === 'upcoming'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary'
                  }`}
                  title="Filter Upcoming tasks due in 1-3 days"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#f97316] shrink-0" />
                    <span className="truncate">Upcoming (<span className="text-[10px]">1–3 days</span>)</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    {tierCounts.upcoming}
                  </span>
                </button>
              </li>

              {/* Later (> 3 days) */}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLegendTier((prev) => (prev === 'later' ? null : 'later'))
                  }
                  className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors text-left ${
                    selectedLegendTier === 'later'
                      ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 font-semibold'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary'
                  }`}
                  title="Filter Later tasks due in >3 days"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#eab308] shrink-0" />
                    <span className="truncate">Later (<span className="text-[10px]">&gt; 3 days</span>)</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-yellow-600 dark:text-yellow-400 shrink-0">
                    {tierCounts.later}
                  </span>
                </button>
              </li>

              {/* Long term */}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLegendTier((prev) => (prev === 'long_term' ? null : 'long_term'))
                  }
                  className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors text-left ${
                    selectedLegendTier === 'long_term'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary'
                  }`}
                  title="Filter Long term tasks"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                    <span className="truncate">Long term</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {tierCounts.longTerm}
                  </span>
                </button>
              </li>

              {/* No deadline */}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLegendTier((prev) => (prev === 'no_deadline' ? null : 'no_deadline'))
                  }
                  className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors text-left ${
                    selectedLegendTier === 'no_deadline'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                      : 'text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary'
                  }`}
                  title="Filter Open Horizon tasks with no deadline"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#64748b] shrink-0" />
                    <span className="truncate">No deadline</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    {tierCounts.noDeadline}
                  </span>
                </button>
              </li>
            </ul>
          </div>
            )}
          </div>

          {/* Radar graphic container with aspect ratio locked to SVG viewBox (5:4) */}
          <div className="relative w-full aspect-[5/4] max-h-[360px] max-w-[450px] mx-auto flex items-center justify-center">
            {/* SVG Concentric Radar graphic with mountain silhouettes */}
            <svg
              viewBox="0 0 500 400"
              className="w-full h-full overflow-visible select-none"
              role="img"
              aria-label="Commitment radar concentric visualization"
            >
            <defs>
              {/* Radial glow for coral center */}
              <radialGradient id="coralCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
                <stop offset="45%" stopColor="#f43f5e" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              {/* Warm peach sunlight glow for right mountain horizon */}
              <radialGradient id="mountainSunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.45" />
                <stop offset="40%" stopColor="#fed7aa" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#fed7aa" stopOpacity="0" />
              </radialGradient>

              {/* Serene Mountain Silhouettes Gradients */}
              <linearGradient id="mountainsBackGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b6d0c2" stopOpacity="0.55" className="dark:stop-color-[#1a3830]" />
                <stop offset="100%" stopColor="#87b09d" stopOpacity="0.4" className="dark:stop-color-[#112620]" />
              </linearGradient>

              <linearGradient id="mountainsMidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#699684" stopOpacity="0.75" className="dark:stop-color-[#194539]" />
                <stop offset="100%" stopColor="#4f7b6b" stopOpacity="0.65" className="dark:stop-color-[#102e26]" />
              </linearGradient>

              <linearGradient id="mountainsFrontGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#264d44" stopOpacity="0.92" className="dark:stop-color-[#163a31]" />
                <stop offset="100%" stopColor="#1a3b33" stopOpacity="0.98" className="dark:stop-color-[#0b1f1a]" />
              </linearGradient>
            </defs>

            {/* =============================================================== */}
            {/* 2A. SERENE MOUNTAIN SILHOUETTES IN LOWER BACKGROUND             */}
            {/* =============================================================== */}
            <g className="mountain-silhouettes pointer-events-none">
              {/* Warm sunrise dome peaking behind mountains on the right */}
              <circle cx="425" cy="305" r="50" fill="url(#mountainSunGlow)" />
              <path
                d="M 375 340 A 50 50 0 0 1 475 340 Z"
                fill="#fed7aa"
                fillOpacity="0.25"
                className="dark:fill-[#fde047] dark:fill-opacity-10"
              />

              {/* Layer 1: Distant Misty Rolling Peaks (Background) */}
              <path
                d="M 0 345 Q 60 320, 110 325 T 215 330 Q 285 305, 340 315 T 445 285 Q 475 295, 500 310 L 500 400 L 0 400 Z"
                fill="url(#mountainsBackGrad)"
              />

              {/* Layer 2: Mid-range Green Ridges */}
              <path
                d="M 0 360 Q 45 335, 95 340 T 190 320 Q 250 330, 295 348 T 395 310 Q 440 315, 500 330 L 500 400 L 0 400 Z"
                fill="url(#mountainsMidGrad)"
              />

              {/* Layer 3: Foreground Serene Hearth Deep Teal Mountain Peaks */}
              <path
                d="M 0 335 Q 40 280, 75 300 T 165 350 Q 225 365, 270 340 T 365 345 Q 415 285, 460 315 T 500 335 L 500 400 L 0 400 Z"
                fill="url(#mountainsFrontGrad)"
              />

              {/* Soft atmospheric valley fog at base */}
              <rect
                x="0"
                y="365"
                width="500"
                height="35"
                fill="#ffffff"
                fillOpacity="0.12"
                className="dark:fill-[#13171d] dark:fill-opacity-20"
              />
            </g>

            {/* =============================================================== */}
            {/* 2B. CONCENTRIC RADAR RINGS (Using RADAR_RINGS & URGENCY_COLOR_MAP) */}
            {/* =============================================================== */}
            <g className="radar-concentric-rings pointer-events-none">
              {RADAR_RINGS.map((ring) => {
                const urgencyToken = URGENCY_COLOR_MAP[ring.tier];
                return (
                  <circle
                    key={ring.tier}
                    cx={RADAR_VIEWBOX.centerX}
                    cy={RADAR_VIEWBOX.centerY}
                    r={ring.baseRadius}
                    fill={ring.fillColor || 'none'}
                    stroke={ring.strokeColor || urgencyToken.radarRing}
                    strokeWidth={ring.strokeWidth}
                    strokeDasharray={ring.strokeDasharray}
                    opacity={ring.tier === 'overdue' ? 0.85 : ring.tier === 'due_soon' ? 0.75 : 0.6}
                  />
                );
              })}

              {/* Coral Center Aura Glow */}
              <circle
                cx={RADAR_VIEWBOX.centerX}
                cy={RADAR_VIEWBOX.centerY}
                r={70}
                fill="url(#coralCenterGlow)"
              />
              <circle
                cx={RADAR_VIEWBOX.centerX}
                cy={RADAR_VIEWBOX.centerY}
                r={30}
                fill="rgba(244, 63, 94, 0.15)"
              />

              {/* Coral Center Badge with '!' matching Image 1 */}
              <circle
                cx={RADAR_VIEWBOX.centerX}
                cy={RADAR_VIEWBOX.centerY}
                r={16}
                fill="#f43f5e"
                className="drop-shadow-sm"
              />
              <text
                x={RADAR_VIEWBOX.centerX}
                y={RADAR_VIEWBOX.centerY + 5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="16"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                !
              </text>
            </g>

            {/* 2B-2. Ambient Radar Pulses (separated so interactive task <g> bounding boxes are completely static) */}
            <g className="radar-ambient-pulses pointer-events-none" aria-hidden="true">
              {sortedNodes.map((node) => {
                const tierMeta = TIER_PRESENTATION_MAP[node.tier] || TIER_PRESENTATION_MAP.no_deadline;
                return (
                  <circle
                    key={`pulse-${node.task.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={node.nodeSize + 6}
                    fill="none"
                    stroke={tierMeta.legendDotColor}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    className="animate-ping origin-center"
                    style={{ animationDuration: '3s' }}
                  />
                );
              })}
            </g>

            {/* =============================================================== */}
            {/* 2C. DYNAMIC TASK MARKER DOTS & CALLOUT LABELS                   */}
            {/* =============================================================== */}
            <g className="radar-nodes">
              {sortedNodes.map((node, index) => {
                const tierMeta = TIER_PRESENTATION_MAP[node.tier] || TIER_PRESENTATION_MAP.no_deadline;
                const countdown = formatTaskCountdown(node.task, now);
                const isActive = activeTaskId === node.task.id;
                const showCallout = sortedNodes.length <= 6 || isActive || index < 5;

                // Smart callout placement offsetting away from center
                const isRightHalf = node.x >= RADAR_VIEWBOX.centerX;
                const boxWidth = 108;
                const boxHeight = 32;
                const labelX = isRightHalf
                  ? Math.min(node.x + 12, RADAR_VIEWBOX.width - boxWidth - 8)
                  : Math.max(node.x - boxWidth - 12, 8);
                const labelY = Math.max(16, Math.min(node.y - 16, RADAR_VIEWBOX.height - boxHeight - 20));

                return (
                  <g
                    key={node.task.id}
                    className="cursor-pointer group"
                    onClick={() => {
                      setActiveTaskId(node.task.id);
                      onPreviewTask?.(node.task.id);
                      onSelectTask?.(node.task.id);
                    }}
                    onMouseEnter={() => handleTaskMouseEnter(node.task.id)}
                    onMouseLeave={handleTaskMouseLeave}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.task.text}: ${countdown}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveTaskId(node.task.id);
                        onPreviewTask?.(node.task.id);
                        onSelectTask?.(node.task.id);
                      }
                    }}
                  >
                    {/* Seamless hover hit area bridging dot and pill to prevent dead-zones */}
                    {showCallout && (
                      <path
                        d={`M ${node.x} ${node.y} L ${labelX + (isRightHalf ? 0 : boxWidth)} ${labelY + boxHeight / 2}`}
                        stroke="transparent"
                        strokeWidth="28"
                        strokeLinecap="round"
                        className="cursor-pointer"
                      />
                    )}

                    {/* Ambient Glow Halo */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.nodeSize + 3}
                      fill={tierMeta.legendDotColor}
                      fillOpacity={isActive ? 0.4 : 0.2}
                      className="transition-all duration-200 pointer-events-none"
                    />

                    {/* Generous invisible hit target circle ensuring stable hover boundary */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.nodeSize + 8}
                      fill="transparent"
                      className="cursor-pointer"
                    />

                    {/* Center Marker Dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isActive ? node.nodeSize + 2 : node.nodeSize}
                      fill={tierMeta.legendDotColor}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="drop-shadow-sm transition-transform duration-200 pointer-events-none"
                    />

                    {/* Callout Card Pill matching Image 1 */}
                    {showCallout && (
                      <g
                        className={`transition-all duration-200 ${
                          isActive ? 'opacity-100 drop-shadow-lg' : 'opacity-90 group-hover:opacity-100'
                        }`}
                      >
                        {/* Pill Card Background */}
                        <rect
                          x={labelX}
                          y={labelY}
                          width={boxWidth}
                          height={boxHeight}
                          rx="7"
                          ry="7"
                          fill="#ffffff"
                          className="dark:fill-slate-800 drop-shadow-md"
                          stroke={isActive ? tierMeta.legendDotColor : '#e2e8f0'}
                          strokeWidth={isActive ? '1.5' : '1'}
                        />

                        {/* Task Title */}
                        <text
                          x={labelX + 8}
                          y={labelY + 13}
                          fontSize="11"
                          fontWeight="600"
                          className="fill-slate-800 dark:fill-slate-100 font-sans select-none"
                        >
                          {truncateText(node.task.text, 14)}
                        </text>

                        {/* Countdown Subtext */}
                        <text
                          x={labelX + 8}
                          y={labelY + 25}
                          fontSize="10"
                          fontWeight="500"
                          fill={tierMeta.legendDotColor}
                          className="font-sans select-none"
                        >
                          {countdown}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Interactive Task Detail Hover Popover */}
          {activeNode && (() => {
            const tierMeta = TIER_PRESENTATION_MAP[activeNode.tier] || TIER_PRESENTATION_MAP.no_deadline;
            const countdown = formatTaskCountdown(activeNode.task, now);
            const isRight = activeNode.x >= RADAR_VIEWBOX.centerX;
            const isTop = activeNode.y < 110;
            const isBottom = activeNode.y > 270;

            const style: React.CSSProperties = {
              position: 'absolute',
              zIndex: 30,
            };

            if (isRight) {
              style.right = `${Math.max(2, 100 - (activeNode.x / RADAR_VIEWBOX.width) * 100)}%`;
              style.marginRight = '14px';
            } else {
              style.left = `${Math.max(2, (activeNode.x / RADAR_VIEWBOX.width) * 100)}%`;
              style.marginLeft = '14px';
            }

            if (isTop) {
              style.top = `${Math.max(2, (activeNode.y / RADAR_VIEWBOX.height) * 100)}%`;
            } else if (isBottom) {
              style.bottom = `${Math.max(2, 100 - (activeNode.y / RADAR_VIEWBOX.height) * 100)}%`;
            } else {
              style.top = `${(activeNode.y / RADAR_VIEWBOX.height) * 100}%`;
              style.transform = 'translateY(-50%)';
            }

            return (
              <div
                role="tooltip"
                aria-label={`Task details: ${activeNode.task.text}`}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
                style={style}
                className="w-[280px] sm:w-[310px] max-w-[calc(100vw-32px)] bg-white/95 dark:bg-serene-surface-dark/95 backdrop-blur-md border border-serene-border-light dark:border-serene-border-dark rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-modal text-left animate-fadeIn pointer-events-auto"
              >
                {/* Header: Tier, Countdown, Priority, Close */}
                <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${tierMeta.legendDotColor}18`,
                        color: tierMeta.legendDotColor,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tierMeta.legendDotColor }}
                      />
                      {tierMeta.legendLabel}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
                      <Clock className="w-3 h-3 shrink-0" />
                      {countdown}
                    </span>
                  </div>

                  {activeNode.task.priority && (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        activeNode.task.priority === 'urgent'
                          ? 'bg-red-500 text-white'
                          : activeNode.task.priority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : activeNode.task.priority === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {activeNode.task.priority}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredTaskId(null);
                      setActiveTaskId(null);
                    }}
                    className="p-0.5 rounded text-serene-text-muted hover:text-serene-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close task details"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Full Title (untruncated) */}
                <h4 className="text-xs sm:text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug break-words mb-2">
                  {activeNode.task.text}
                </h4>

                {/* Description (if present) */}
                {activeNode.task.description && (
                  <div className="mb-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                      Description
                    </div>
                    <div className="text-xs leading-relaxed text-serene-text-muted dark:text-serene-text-darkMuted bg-serene-surfaceAlt-light/70 dark:bg-serene-surfaceAlt-dark/50 p-2 rounded-lg border border-serene-border-light/60 dark:border-serene-border-dark/60 max-h-24 overflow-y-auto">
                      {activeNode.task.description}
                    </div>
                  </div>
                )}

                {/* Attached Links (if present) */}
                {activeNode.task.attachedUrls && activeNode.task.attachedUrls.length > 0 && (
                  <div className="mb-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      <span>Attached Links ({activeNode.task.attachedUrls.length})</span>
                    </div>
                    <div className="space-y-1">
                      {activeNode.task.attachedUrls.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light/70 dark:border-serene-border-dark/70 text-serene-primary dark:text-serene-primary-dark hover:bg-serene-primary-soft dark:hover:bg-serene-primary/20 transition-colors group"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors" />
                          <span className="truncate flex-1">
                            {link.title || link.url.replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtasks Progress (if present) */}
                {activeNode.task.subtasks && activeNode.task.subtasks.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-medium text-serene-text-muted dark:text-serene-text-darkMuted mb-2 px-0.5">
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Subtasks</span>
                    </span>
                    <span className="font-mono text-[10px]">
                      {activeNode.task.subtasks.filter((s) => s.isDone).length} / {activeNode.task.subtasks.length} done
                    </span>
                  </div>
                )}

                {/* Footer Action: Click to Open in Tasks */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectTask?.(activeNode.task.id);
                  }}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open in Tasks</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })()}
        </div>
      </div>
      ) : (
        /* =================================================================== */
        /* 2D. ACCESSIBLE LIST VIEW ALTERNATIVE                                 */
        /* =================================================================== */
        <div
          className="w-full flex-1 my-2 overflow-y-auto max-h-[340px] pr-1 space-y-2.5 scrollbar-thin"
          role="region"
          aria-label="Accessible commitments list"
        >
          {visibleNodes.length === 0 ? (
            <div className="text-center py-8 text-serene-text-muted dark:text-serene-text-darkMuted text-xs">
              No tasks matching this filter.
            </div>
          ) : (
            visibleNodes.map((node) => {
              const tierMeta = TIER_PRESENTATION_MAP[node.tier] || TIER_PRESENTATION_MAP.no_deadline;
              const countdown = formatTaskCountdown(node.task, now);

              return (
                <div
                  key={node.task.id}
                  onClick={() => {
                    onPreviewTask?.(node.task.id);
                    onSelectTask?.(node.task.id);
                  }}
                  className="p-2.5 rounded-xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 border border-serene-border-light/70 dark:border-serene-border-dark/70 hover:border-serene-primary/50 dark:hover:border-serene-primary-dark/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tierMeta.legendDotColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate group-hover:text-serene-primary dark:group-hover:text-serene-primary-dark transition-colors">
                        {node.task.text}
                      </div>
                      <div className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted flex items-center gap-2 mt-0.5">
                        <span className="font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-serene-text-muted" />
                          {countdown}
                        </span>
                        {node.task.priority && (
                          <span className="uppercase text-[9px] font-bold px-1 rounded bg-black/5 dark:bg-white/10">
                            {node.task.priority}
                          </span>
                        )}
                        {node.task.subtasks && node.task.subtasks.length > 0 && (
                          <span>
                            {node.task.subtasks.filter((s) => s.isDone).length}/{node.task.subtasks.length} subtasks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierMeta.badgeBg} ${tierMeta.badgeText} shrink-0`}>
                    {tierMeta.legendLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. BOTTOM CAPTION: "Closer to the center = more urgent (i)"           */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted select-none mt-1 mb-2">
        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]" aria-hidden="true">←</span>
        <span>Closer to the center = more urgent</span>
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowCenterCaptionTooltip((prev) => !prev)}
            onMouseEnter={() => setShowCenterCaptionTooltip(true)}
            onMouseLeave={() => setShowCenterCaptionTooltip(false)}
            className="inline-flex items-center text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors focus:outline-none p-0.5 rounded"
            aria-label="Urgency radius explanation"
          >
            <Info className="w-3 h-3" />
          </button>

          {showCenterCaptionTooltip && (
            <div
              role="tooltip"
              className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 p-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] leading-relaxed rounded-xl shadow-modal backdrop-blur-sm border border-slate-700/60 pointer-events-none animate-fadeIn text-center"
            >
              Innermost rings represent overdue and critical commitments (&lt;24h). Expanding outward
              indicates further horizon and flexible tasks.
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. BOTTOM OVERALL STATUS CARD / STRIP MATCHING IMAGE 1                */}
      {/* ===================================================================== */}
      <div
        className="p-3 sm:p-3.5 rounded-2xl bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 border border-serene-border-light/80 dark:border-serene-border-dark/80 flex flex-col @md:flex-row @md:items-center justify-between gap-3 min-w-0"
        role="region"
        aria-label="Overall commitment status and timeline"
      >
        {/* Left: Leaf in green pill, OVERALL STATUS, "On track", narrative */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <Leaf className="w-4.5 h-4.5 fill-emerald-600/20 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary">
              OVERALL STATUS
            </div>
            <div className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-tight">
              {overallStatus.title}
            </div>
            <div className="text-[11px] text-serene-text-muted dark:text-serene-text-darkMuted leading-tight mt-0.5 truncate">
              {overallStatus.subtitle}
            </div>
          </div>
        </div>

        {/* Right: Horizontal Segmented Bar with Dots and Reconciled Task Counts */}
        <div className="flex items-center justify-between gap-1 @xs:gap-2 sm:gap-4 self-stretch @md:self-auto shrink-0 min-w-0 pt-1 @md:pt-0 overflow-hidden">
          {/* Milestone 1: Critical */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="flex items-center w-full justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] ring-4 ring-rose-100 dark:ring-rose-950/60 shrink-0" />
              <span className="h-0.5 w-3 @xs:w-6 @sm:w-10 bg-slate-200 dark:bg-slate-700 mx-1" />
            </div>
            <div className="text-[10px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 whitespace-nowrap">
              Critical
            </div>
            <div className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted whitespace-nowrap">
              {tierCounts.critical} {tierCounts.critical === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          {/* Milestone 2: Upcoming */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="flex items-center w-full justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] ring-4 ring-amber-100 dark:ring-amber-950/60 shrink-0" />
              <span className="h-0.5 w-3 @xs:w-6 @sm:w-10 bg-slate-200 dark:bg-slate-700 mx-1" />
            </div>
            <div className="text-[10px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 whitespace-nowrap">
              Upcoming
            </div>
            <div className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted whitespace-nowrap">
              {tierCounts.upcoming} {tierCounts.upcoming === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          {/* Milestone 3: Later */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="flex items-center w-full justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] ring-4 ring-yellow-100 dark:ring-yellow-950/60 shrink-0" />
              <span className="h-0.5 w-3 @xs:w-6 @sm:w-10 bg-slate-200 dark:bg-slate-700 mx-1" />
            </div>
            <div className="text-[10px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 whitespace-nowrap">
              Later
            </div>
            <div className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted whitespace-nowrap">
              {tierCounts.later} {tierCounts.later === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          {/* Milestone 4: Long term */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="flex items-center w-full justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] ring-4 ring-emerald-100 dark:ring-emerald-950/60 shrink-0" />
            </div>
            <div className="text-[10px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mt-1 whitespace-nowrap">
              Long term
            </div>
            <div className="text-[10px] text-serene-text-muted dark:text-serene-text-darkMuted whitespace-nowrap">
              {tierCounts.longTerm} {tierCounts.longTerm === 1 ? 'task' : 'tasks'}
            </div>
          </div>
        </div>
      </div>
    </div>

    {previewTaskId && tasks.some((t) => t.id === previewTaskId) && (
      <TaskPreviewPopUp
        task={tasks.find((t) => t.id === previewTaskId)!}
        onClose={() => setPreviewTaskId(null)}
        onOpenTask={(id) => {
          setPreviewTaskId(null);
          onSelectTask?.(id);
        }}
      />
    )}
    </>
  );
});

CommitmentRadarWidget.displayName = 'CommitmentRadarWidget';
