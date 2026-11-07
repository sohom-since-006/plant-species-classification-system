import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PipelineStage } from '@/types/prediction';
import { usePrefersReducedMotion } from '@/lib/motion';
import { getDeterministicDetectionPoints } from '@/ml/pipelineRunner';

export type ScanOverlayProps = {
  isScanning: boolean;
  stage?: PipelineStage;
  progress?: number; // 0 to 1
  photoIndex?: number;
  totalPhotos?: number;
  hasError?: boolean;
  isDone?: boolean;
  imageSeed?: string | number;
  className?: string;
};

export function ScanOverlay({
  isScanning,
  progress = 0,
  photoIndex = 0,
  totalPhotos = 1,
  hasError = false,
  isDone = false,
  imageSeed = 'plant-specimen',
  className = '',
}: ScanOverlayProps) {
  const prefersReduced = usePrefersReducedMotion();

  // Deterministic detection points
  const points = useMemo(() => {
    return getDeterministicDetectionPoints(imageSeed);
  }, [imageSeed]);

  // Progressive revealing of points according to pipeline stage
  // Stage 1 (0 - 0.20): 0 points
  // Stage 2 (0.20 - 0.40): 2 points
  // Stage 3 (0.40 - 0.65): 4 points
  // Stage 4 (0.65 - 0.85): 5 points
  // Stage 5 (0.85 - 1.0): 6 points
  const visiblePointCount = useMemo(() => {
    if (hasError || !isScanning && !isDone) return 0;
    if (progress < 0.20) return 0;
    if (progress < 0.40) return 2;
    if (progress < 0.65) return 4;
    if (progress < 0.85) return 5;
    return 6;
  }, [progress, isScanning, isDone, hasError]);

  const visiblePoints = points.slice(0, visiblePointCount);

  // Corner bracket inset tightening: 8px -> 24px as progress increases
  const bracketInset = Math.round(8 + Math.min(1.0, progress) * 16);

  // Border color state
  const bracketBorderColor = hasError
    ? 'var(--danger)'
    : isDone
      ? 'var(--accent)'
      : progress > 0.4
        ? 'var(--accent)'
        : 'var(--glass-edge-hi)';

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none rounded-2xl ${className}`}
      aria-hidden="true"
    >
      {/* ─── Faint Botanical Grid Mesh ────────────────────────────── */}
      {(isScanning || isDone) && (
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="scan-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#scan-grid)" />
        </svg>
      )}

      {/* ─── Multi-Photo Badge ────────────────────────────────────── */}
      {isScanning && totalPhotos > 1 && (
        <div className="absolute top-3 left-3 z-20">
          <span className="liquid-glass-strong px-2.5 py-1 rounded-full text-[11px] font-mono uppercase text-white/90 border border-white/20 shadow-md">
            Photo {photoIndex + 1} of {totalPhotos}
          </span>
        </div>
      )}

      {/* ─── Corner Brackets (Tighten & Lock, Shake on Error) ─────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{ padding: `${bracketInset}px` }}
        animate={
          hasError
            ? { x: [-4, 4, -4, 4, -2, 2, 0] }
            : isDone
              ? { scale: [1, 1.02, 1] }
              : undefined
        }
        transition={{ duration: 0.4 }}
      >
        <div className="relative w-full h-full">
          {/* Top-Left Bracket */}
          <div
            className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 transition-colors duration-300"
            style={{ borderColor: bracketBorderColor }}
          />
          {/* Top-Right Bracket */}
          <div
            className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 transition-colors duration-300"
            style={{ borderColor: bracketBorderColor }}
          />
          {/* Bottom-Left Bracket */}
          <div
            className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 transition-colors duration-300"
            style={{ borderColor: bracketBorderColor }}
          />
          {/* Bottom-Right Bracket */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 transition-colors duration-300"
            style={{ borderColor: bracketBorderColor }}
          />
        </div>
      </motion.div>

      {/* ─── Sweeping Glowing Scan Line (Disabled under reduced-motion) ── */}
      {isScanning && !hasError && !prefersReduced && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, var(--accent) 25%, #ffffff 50%, var(--accent) 75%, transparent 100%)',
            boxShadow: '0 0 16px 3px var(--accent)',
          }}
          initial={{ top: '2%' }}
          animate={{
            top: ['2%', '96%', '2%'],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2.4,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      )}

      {/* ─── Glowing Detection Points & Lines (Disabled under reduced-motion) ── */}
      {isScanning && !hasError && !prefersReduced && visiblePoints.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Connecting lines between visible points */}
          {visiblePoints.map((pt, i) => {
            if (i === 0) return null;
            const prev = visiblePoints[i - 1]!;
            return (
              <line
                key={`line-${i}`}
                x1={`${prev.x}%`}
                y1={`${prev.y}%`}
                x2={`${pt.x}%`}
                y2={`${pt.y}%`}
                stroke="var(--accent)"
                strokeWidth="1"
                strokeOpacity="0.45"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Glowing Circles at detection points */}
          {visiblePoints.map((pt, i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={`${pt.x}%`}
                cy={`${pt.y}%`}
                r="4.5"
                fill="var(--accent)"
                fillOpacity="0.9"
              />
              <circle
                cx={`${pt.x}%`}
                cy={`${pt.y}%`}
                r="8.5"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              >
                <animate
                  attributeName="r"
                  values="4.5;10;4.5"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.8;0.1;0.8"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>
      )}

      {/* ─── Mock Mode Disclaimer Caption ─────────────────────────── */}
      {isScanning && visiblePoints.length > 0 && (
        <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none z-20">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-white/60 backdrop-blur-xs border border-white/10">
            Simulated structural points (Phase 4: real CAM feature peaks)
          </span>
        </div>
      )}

      {/* ─── Quick Completion Flash ───────────────────────────────── */}
      <AnimatePresence>
        {isDone && !hasError && !prefersReduced && (
          <motion.div
            key="scan-flash"
            className="absolute inset-0 bg-emerald-400/25 pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
