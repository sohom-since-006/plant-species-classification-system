import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@/components/icons';
import { modalBackdrop, modalSpring, usePrefersReducedMotion } from '@/lib/motion';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={reduced ? undefined : modalBackdrop}
          initial={reduced ? undefined : 'initial'}
          animate={reduced ? undefined : 'animate'}
          exit={reduced ? undefined : 'exit'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={onClose}
        >
          <motion.div
            variants={reduced ? undefined : modalSpring}
            initial={reduced ? undefined : 'initial'}
            animate={reduced ? undefined : 'animate'}
            exit={reduced ? undefined : 'exit'}
            data-glow=""
            className={`liquid-glass-strong rounded-[1.25rem] p-6 max-w-lg w-full relative ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-edge-mid)]">
              {title ? (
                <h2 className="font-heading italic text-2xl leading-none text-[var(--fg)]">{title}</h2>
              ) : (
                <span />
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                aria-label="Close dialog"
                type="button"
                data-glow=""
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="pt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
