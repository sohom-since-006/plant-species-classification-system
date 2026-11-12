import { useState, useEffect } from 'react';
import { AlertTriangle, X } from '@/components/icons';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md liquid-glass-strong rounded-2xl p-4 border border-amber-500/40 bg-amber-950/40 text-amber-100 shadow-2xl flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-xs font-mono font-semibold text-amber-300">
            Offline Mode Active
          </p>
          <p className="text-[11px] font-body text-amber-200/80 leading-tight">
            On-device neural inference and the offline species herbarium remain fully operational.
          </p>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-amber-300/70 hover:text-amber-100 hover:bg-amber-500/20 transition-colors"
        aria-label="Dismiss offline banner"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}
