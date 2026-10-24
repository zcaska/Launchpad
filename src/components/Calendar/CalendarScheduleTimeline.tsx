import React from 'react';
import {
  CalendarBlank as Calendar,
  ArrowSquareOut as ExternalLink,
  Sparkle as Sparkles,
  ArrowsClockwise as RefreshCw,
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle
} from '@phosphor-icons/react';
import { CalendarEventItem } from '../../types';

interface CalendarScheduleTimelineProps {
  events: CalendarEventItem[];
  onSync?: () => void;
  isSyncing?: boolean;
  onOpenSettings?: () => void;
  onReauthorize?: () => void;
  isTokenExpired?: boolean;
  syncError?: string;
  className?: string;
}

export const CalendarScheduleTimeline: React.FC<CalendarScheduleTimelineProps> = ({
  events = [],
  onSync,
  isSyncing = false,
  onOpenSettings,
  onReauthorize,
  isTokenExpired = false,
  syncError,
  className = '',
}) => {
  const now = new Date();
  const currentMs = now.getTime();

  // Format today's date
  const todayFormatted = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Separate all-day events and sort timed events chronologically
  const allDayEvents = events.filter((e) => e.isAllDay && e.status !== 'cancelled');
  const timedEvents = events
    .filter((e) => !e.isAllDay && e.status !== 'cancelled')
    .sort((a, b) => a.startMs - b.startMs);

  const formatEventTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to determine status badge
  const getEventState = (event: CalendarEventItem) => {
    if (currentMs >= event.startMs && currentMs < event.endMs) return 'ongoing';
    if (event.startMs > currentMs) return 'upcoming';
    return 'past';
  };

  // Calculate deep work gaps (gaps between consecutive events >= 45m)
  const itemsWithGaps: Array<{ type: 'event'; event: CalendarEventItem } | { type: 'gap'; minutes: number; start: string; end: string }> = [];

  for (let i = 0; i < timedEvents.length; i++) {
    const curr = timedEvents[i];

    if (i > 0) {
      const prev = timedEvents[i - 1];
      const gapMs = curr.startMs - prev.endMs;
      const gapMinutes = Math.round(gapMs / 60000);

      if (gapMinutes >= 45) {
        itemsWithGaps.push({
          type: 'gap',
          minutes: gapMinutes,
          start: formatEventTime(prev.endTime),
          end: formatEventTime(curr.startTime),
        });
      }
    }

    itemsWithGaps.push({ type: 'event', event: curr });
  }

  return (
    <div className={`bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl p-4 sm:p-5 shadow-subtle ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-serene-border-light/60 dark:border-serene-border-dark/60">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-2">
              <span>Today's Calendar Schedule</span>
              <span className="text-[11px] font-normal text-serene-text-muted">({todayFormatted})</span>
            </h3>
            <p className="text-[11px] text-serene-text-muted">
              {timedEvents.length} {timedEvents.length === 1 ? 'meeting' : 'meetings'}
              {allDayEvents.length > 0 && ` • ${allDayEvents.length} all-day`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTokenExpired ? (
            <button
              onClick={onReauthorize || onOpenSettings}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 transition-colors"
              title="Google Calendar authorization expired. Click to re-authorize."
            >
              Re-authorize
            </button>
          ) : syncError ? (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-200 transition-colors flex items-center gap-1"
              title={`Calendar sync error: ${syncError}. Click to retry.`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
              <span>Sync Failed</span>
            </button>
          ) : null}
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-1.5 rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors disabled:opacity-50"
              title="Sync Schedule with Google Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-serene-primary' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* All-Day Events Strip */}
      {allDayEvents.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {allDayEvents.map((evt) => (
            <div
              key={evt.id}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs flex items-center justify-between"
            >
              <span className="font-semibold text-purple-900 dark:text-purple-200 truncate">
                {evt.summary}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 shrink-0">
                All Day
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline items */}
      {itemsWithGaps.length === 0 && allDayEvents.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
          <p className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
            No scheduled meetings today!
          </p>
          <p className="text-[11px] text-serene-text-muted mt-0.5">
            Clear runway for uninterrupted deep focus work.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itemsWithGaps.map((item, idx) => {
            if (item.type === 'gap') {
              return (
                <div
                  key={`gap-${idx}`}
                  className="px-3 py-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-dashed border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between text-xs my-1"
                >
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold">{item.minutes}m Focus Window</span>
                    <span className="text-[11px] opacity-75">({item.start} – {item.end})</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                    Deep Work
                  </span>
                </div>
              );
            }

            const evt = item.event;
            const state = getEventState(evt);
            const isTransparent = evt.transparency === 'transparent';

            return (
              <div
                key={evt.id}
                className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                  state === 'ongoing'
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 shadow-2xs'
                    : state === 'upcoming'
                    ? 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40'
                    : 'bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 border-transparent opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col items-center shrink-0 w-16 text-right font-mono text-[11px] text-serene-text-muted">
                    <span>{formatEventTime(evt.startTime)}</span>
                    <span className="text-[9px] opacity-60 leading-none mt-0.5">{evt.durationMinutes}m</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                        {evt.summary}
                      </span>
                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-serene-text-muted hover:text-serene-primary transition-colors shrink-0"
                          title="Open event in Google Calendar"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {evt.location && (
                      <p className="text-[10px] text-serene-text-muted truncate mt-0.5">
                        📍 {evt.location}
                      </p>
                    )}
                    {evt.extractedUrls && evt.extractedUrls.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {evt.extractedUrls.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark hover:underline truncate max-w-[180px]"
                            title={link.url}
                          >
                            <span className="truncate">{link.title || link.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isTransparent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-muted">
                      Free
                    </span>
                  )}
                  {state === 'ongoing' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Ongoing
                    </span>
                  )}
                  {state === 'upcoming' && (
                    <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 px-2 py-0.5 rounded-md">
                      Upcoming
                    </span>
                  )}
                  {state === 'past' && (
                    <span className="text-[10px] text-serene-text-muted">
                      Finished
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
