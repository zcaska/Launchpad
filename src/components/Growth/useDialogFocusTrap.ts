import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog focus trap: captures and restores focus and cycles Tab within
 * the dialog container while `active`. Returns the ref to attach to the
 * container. `onEscape` (optional) is invoked on Escape so each dialog decides
 * how closing behaves (e.g. awaited draft flush).
 */
export function useDialogFocusTrap(
  active: boolean,
  onEscape?: () => void
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    prevFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (container) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? container).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const el = containerRef.current;
      if (!el) return;
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !el.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !el.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const prev = prevFocusRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
      prevFocusRef.current = null;
    };
  }, [active]);

  return containerRef;
}
