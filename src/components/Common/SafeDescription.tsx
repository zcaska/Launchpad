import React from 'react';
import { ExternalLink } from 'lucide-react';
import { isSafeUrl, decodeHtmlEntities, deriveUrlTitle } from '../../utils/calendarFormatting';

interface SafeDescriptionProps {
  text?: string;
  className?: string;
  lineClamp?: 1 | 2 | 3 | 4;
}

interface Segment {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Parses and safely renders description text containing plain text,
 * anchor tags (<a href="...">...</a> or escaped &lt;a href=...&gt;),
 * or standalone URLs without using innerHTML.
 * Ensures all links have safe protocols (http/https), opens in new tabs,
 * and displays clean clickable titles.
 */
export const SafeDescription: React.FC<SafeDescriptionProps> = ({
  text,
  className = '',
  lineClamp,
}) => {
  if (!text || !text.trim()) return null;

  let raw = text;
  // If escaped anchor markup is present (&lt;a href=...), decode entities first
  if (/&lt;a\s+/i.test(raw) || /&lt;\/a&gt;/i.test(raw)) {
    raw = decodeHtmlEntities(raw);
  }

  // Segment the text into text and link tokens
  const segments: Segment[] = [];
  
  // Combined regex finding <a href="...">...</a> OR standalone http(s) URLs
  const tokenRegex = /(<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>)|(\bhttps?:\/\/[^\s<>"']+)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;

    // Preceding text segment
    if (matchStart > lastIndex) {
      const textPiece = raw.substring(lastIndex, matchStart);
      segments.push({ type: 'text', content: cleanTextPiece(textPiece) });
    }

    if (match[1]) {
      // It is an anchor tag: <a href="match[2]">match[3]</a>
      const rawHref = decodeHtmlEntities(match[2]).trim();
      const rawTitle = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '')).trim();

      if (isSafeUrl(rawHref)) {
        const title = rawTitle && rawTitle.toLowerCase() !== rawHref.toLowerCase()
          ? rawTitle
          : deriveUrlTitle(rawHref, 'Open Link');

        segments.push({
          type: 'link',
          content: title,
          url: rawHref,
        });
      } else {
        // Dangerous or invalid URL - render as safe plain text title
        segments.push({
          type: 'text',
          content: rawTitle || rawHref,
        });
      }
    } else if (match[4]) {
      // It is a standalone URL
      const rawUrl = match[4].replace(/[.,;:)\]]+$/, '');
      if (isSafeUrl(rawUrl)) {
        segments.push({
          type: 'link',
          content: deriveUrlTitle(rawUrl, 'Open Link'),
          url: rawUrl,
        });
      } else {
        segments.push({ type: 'text', content: rawUrl });
      }
    }

    lastIndex = matchEnd;
  }

  // Trailing text segment
  if (lastIndex < raw.length) {
    const trailing = raw.substring(lastIndex);
    segments.push({ type: 'text', content: cleanTextPiece(trailing) });
  }

  // Helper to strip tags and convert breaks to newlines
  function cleanTextPiece(str: string): string {
    return decodeHtmlEntities(
      str
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    );
  }

  const clampClass = lineClamp === 1
    ? 'line-clamp-1'
    : lineClamp === 2
    ? 'line-clamp-2'
    : lineClamp === 3
    ? 'line-clamp-3'
    : lineClamp === 4
    ? 'line-clamp-4'
    : '';

  return (
    <span className={`inline-block break-words whitespace-pre-line ${clampClass} ${className}`.trim()}>
      {segments.map((seg, idx) => {
        if (seg.type === 'link' && seg.url) {
          return (
            <a
              key={idx}
              href={seg.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-serene-primary hover:text-serene-primary-dark dark:text-serene-primary-dark dark:hover:text-serene-primary underline font-medium transition-colors"
              title={seg.url}
            >
              <span>{seg.content}</span>
              <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
            </a>
          );
        }
        return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
      })}
    </span>
  );
};
