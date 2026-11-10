import { ArrowSquareOut } from '@phosphor-icons/react';
import type { TaskUrl } from '../../types';
import { deriveUrlTitle, isSafeUrl } from '../../utils/textFormatting';

/** Shared attachment list so task resources stay visible at every screen size. */
export function TaskLinks({ links, compact = false }: { links?: TaskUrl[]; compact?: boolean }) {
  const safeLinks = links?.filter((link) => isSafeUrl(link.url));
  if (!safeLinks?.length) return null;

  return (
    <ul aria-label="Task links" className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'} min-w-0`}>
      {safeLinks.map((link) => {
        const title = link.title?.trim();
        const label = title && !/^(?:https?:\/\/|www\.)/i.test(title)
          ? title
          : deriveUrlTitle(link.url, 'Open resource');
        return (
          <li key={link.id} className="min-w-0 max-w-full">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={compact
                ? "inline-flex max-w-full items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "inline-flex max-w-full items-start gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"}
            >
              <ArrowSquareOut className={compact ? "h-3 w-3 shrink-0" : "mt-0.5 h-3.5 w-3.5 shrink-0"} />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
