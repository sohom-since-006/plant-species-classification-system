import { useLocation } from 'react-router-dom';
import { LiveBackground } from '@/components/layout/LiveBackground';

export type PageBackgroundProps = {
  className?: string;
};

/**
 * Animated aurora gradient background for app pages.
 * Features soft emerald (#10b981 / #6ee7a8) and teal (#14b8a6 / #2dd4bf) glows
 * drifting slowly (26s - 38s), overlaid with an organic leaf-vein grid and microscopic noise texture.
 *
 * App pages (everything except the landing page) render the LiveBackground spore canvas.
 * GPU-friendly: Animates transform only using translate3d and scale.
 * Respects prefers-reduced-motion (stops drifting).
 * Dark mode keeps luminance balanced to maintain >10:1 contrast with text while avoiding flat black.
 */
export function PageBackground({ className = '' }: PageBackgroundProps) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* ─── Base Canvas ────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[var(--bg)] transition-colors duration-500" />

      {/* ─── Deep Botanical Undertone (eliminates flat black) ──────── */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-35 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% -10%, rgba(16, 185, 129, 0.18) 0%, rgba(4, 28, 17, 0.10) 50%, transparent 80%)',
        }}
      />

      {/* ─── Aurora Layer ───────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Blob 1: Deep Emerald Glow (Top Left / Center) */}
        <div
          className="absolute w-[680px] h-[680px] rounded-full blur-[130px] opacity-35 dark:opacity-35 will-change-transform"
          style={{
            background: 'radial-gradient(circle, #10B981 0%, #047857 45%, transparent 70%)',
            top: '-15%',
            left: '15%',
            animation: 'aurora-drift-1 28s ease-in-out infinite alternate',
          }}
        />

        {/* Blob 2: Vibrant Teal / Cyan Glow (Bottom Right) */}
        <div
          className="absolute w-[620px] h-[620px] rounded-full blur-[140px] opacity-30 dark:opacity-32 will-change-transform"
          style={{
            background: 'radial-gradient(circle, #14B8A6 0%, #0F766E 50%, transparent 70%)',
            bottom: '-10%',
            right: '10%',
            animation: 'aurora-drift-2 34s ease-in-out infinite alternate',
          }}
        />

        {/* Blob 3: Soft Mint / Sage Glow (Center Left Drift) */}
        <div
          className="absolute w-[520px] h-[520px] rounded-full blur-[120px] opacity-25 dark:opacity-28 will-change-transform"
          style={{
            background: 'radial-gradient(circle, #34D399 0%, #059669 40%, transparent 70%)',
            top: '35%',
            left: '40%',
            animation: 'aurora-drift-3 40s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* ─── Spore Canvas (App pages only; Landing keeps its video reel) ─── */}
      {!isLandingPage && <LiveBackground />}

      {/* ─── Leaf-Vein Botanical Pattern Overlay ─────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] text-emerald-400 dark:text-emerald-300 pointer-events-none mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="botanical-veins"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Primary vein backbone */}
            <path
              d="M 0 40 Q 40 30 80 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            {/* Secondary lateral veins */}
            <path
              d="M 40 35 L 60 15 M 40 35 L 20 55 M 20 37 L 35 20 M 60 43 L 45 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            {/* Tertiary micro anastomoses */}
            <circle cx="40" cy="35" r="1" fill="currentColor" opacity="0.6" />
            <circle cx="60" cy="15" r="0.75" fill="currentColor" opacity="0.4" />
            <circle cx="20" cy="55" r="0.75" fill="currentColor" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#botanical-veins)" />
      </svg>

      {/* ─── Organic Micro-Grain Texture ────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
