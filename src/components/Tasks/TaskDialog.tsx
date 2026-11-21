import { useLayoutEffect, useRef, type PropsWithChildren, type RefObject } from 'react';

export type TaskDialogTrigger = HTMLElement | SVGElement;

export function isTaskDialogOpen() {
  return document.querySelector('dialog[data-task-dialog][open]') !== null;
}

export function restoreTaskDialogFocus(
  trigger: TaskDialogTrigger | null,
  fallback: HTMLElement | null,
) {
  if (trigger?.isConnected && trigger.getClientRects().length) {
    trigger.focus();
    if (trigger.ownerDocument.activeElement === trigger) return;
  }
  fallback?.focus();
}

interface TaskDialogProps {
  titleId: string;
  className: string;
  returnFocus: TaskDialogTrigger | null;
  fallbackFocus?: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function TaskDialog({
  titleId, className, returnFocus, fallbackFocus, onClose, children,
}: PropsWithChildren<TaskDialogProps>) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const doc = dialog.ownerDocument;
    const previousFocus = doc.activeElement;
    dialog.showModal();

    return () => {
      dialog.close();
      // Let React remove any outgoing task row or open the next dialog before restoring focus.
      queueMicrotask(() => {
        if (dialog.isConnected || doc.activeElement?.closest('dialog[open]')) return;
        if (doc.activeElement !== doc.body && doc.activeElement !== previousFocus) return;
        restoreTaskDialogFocus(returnFocus, fallbackFocus?.current ?? null);
      });
    };
  }, [returnFocus, fallbackFocus]);

  return (
    <dialog
      ref={ref}
      data-task-dialog
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`task-dialog ${className}`}
    >
      {children}
    </dialog>
  );
}
