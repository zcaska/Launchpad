import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  itemName,
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
}) => {
  const [mounted, setMounted] = useState(false);
  const [cachedItemName, setCachedItemName] = useState(itemName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (itemName) {
      setCachedItemName(itemName);
    }
  }, [itemName]);

  if (!mounted || typeof document === 'undefined') return null;

  const displayItemName = itemName || cachedItemName;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Modal Card Window */}
          <motion.div
            role="dialog"
            aria-modal="true"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-[101] flex flex-col p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl shrink-0 text-rose-500 bg-rose-500/10 dark:bg-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary mt-0.5">
                    Permanent Removal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed mb-3">
              {description}
            </p>

            {/* Highlighted Item Name Box */}
            {displayItemName && (
              <div className="p-3 my-1 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-xs font-medium text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate flex-1 font-semibold">{displayItemName}</span>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-serene-border-light dark:border-serene-border-dark">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors rounded-xl"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all rounded-xl shadow-xs"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
