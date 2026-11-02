import { useState, useCallback, type ReactNode } from 'react';
import { X } from '@/components/icons';
import { ToastContext, type Toast } from '@/components/ui/toastContext';

export { type Toast, type ToastContextType } from '@/components/ui/toastContext';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="liquid-glass-strong rounded-xl p-3.5 text-xs font-body flex items-center justify-between gap-3 pointer-events-auto shadow-lg"
          >
            <span className="text-[var(--fg)]">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--fg-subtle)] hover:text-[var(--fg)]"
              aria-label="Dismiss toast"
              type="button"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
