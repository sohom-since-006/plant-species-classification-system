import { X, RefreshCw, AlertCircle } from '@/components/icons';
import { GlassButton } from '@/components/ui/GlassButton';
import { SolidButton } from '@/components/ui/SolidButton';
import { usePrefersReducedMotion } from '@/lib/motion';

export type StagePanelProps = {
  isAnalyzing: boolean;
  progress: number; // 0 to 1
  stageLabel: string;
  photoIndex?: number;
  totalPhotos?: number;
  error?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
};

export function StagePanel({
  isAnalyzing,
  progress,
  stageLabel,
  photoIndex = 0,
  totalPhotos = 1,
  error = null,
  onCancel,
  onRetry,
  className = '',
}: StagePanelProps) {
  const prefersReduced = usePrefersReducedMotion();

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percent = Math.round(clampedProgress * 100);

  // SVG ring geometry (size 72px, stroke 5px)
  const size = 72;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedProgress * circumference;

  if (error) {
    return (
      <div
        className={`liquid-glass-strong rounded-2xl p-6 border border-rose-500/40 bg-rose-950/20 text-center space-y-4 ${className}`}
        role="alert"
      >
        <div className="flex items-center justify-center gap-2 text-[var(--danger)]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <h4 className="font-heading italic text-xl text-white">Classification Interrupted</h4>
        </div>
        <p className="text-xs font-body text-rose-200/90 leading-relaxed max-w-md mx-auto">
          {error}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          {onRetry && (
            <SolidButton onClick={onRetry} className="text-xs px-5 py-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </SolidButton>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="text-xs font-mono text-white/70 hover:text-white px-3 py-1.5 underline"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isAnalyzing) {
    return null;
  }

  return (
    <div
      className={`liquid-glass-strong rounded-2xl p-6 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl ${className}`}
    >
      {/* Left: Progress Ring + Percentage */}
      <div className="flex items-center gap-5">
        <div
          className="relative inline-flex items-center justify-center shrink-0"
          style={{ width: size, height: size }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth={stroke}
              fill="transparent"
            />
            {/* Progress Bar */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="var(--accent)"
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={prefersReduced ? '' : 'transition-all duration-200 ease-out'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold text-white">
            {percent}%
          </div>
        </div>

        {/* Center: Stage text in aria-live region */}
        <div className="space-y-1">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <h4 className="font-heading italic text-xl text-white tracking-wide">
              {stageLabel || 'Analyzing botanical specimen...'}
            </h4>
          </div>
          <p className="text-xs font-mono text-white/60">
            {totalPhotos > 1
              ? `Processing angle ${photoIndex + 1} of ${totalPhotos} • ONNX Web Worker`
              : 'On-device tensor inference • Zero cloud latency'}
          </p>
        </div>
      </div>

      {/* Right: Cancel button */}
      {onCancel && (
        <GlassButton
          onClick={onCancel}
          type="button"
          data-glow=""
          className="text-xs px-4 py-2 shrink-0 border border-white/15 hover:border-rose-400/50 hover:text-rose-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </GlassButton>
      )}
    </div>
  );
}
