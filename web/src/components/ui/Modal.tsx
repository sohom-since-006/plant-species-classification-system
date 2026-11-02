import { useEffect, type ReactNode } from 'react';
import { X } from '@/components/icons';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
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
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

