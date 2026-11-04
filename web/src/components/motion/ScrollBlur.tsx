import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

export type ScrollBlurProps = {
  children: React.ReactNode;
  className?: string;
  /** When true, handles the hero at the top of the page so it stays sharp for the first 25-30% of scroll */
  isHero?: boolean;
  /** Maximum blur in pixels on desktop (defaults to 12) */
  blurDesktop?: number;
  /** Maximum blur in pixels on mobile screens < 768px (defaults to 6) */
  blurMobile?: number;
  /** Vertical travel offset in pixels (defaults to 36) */
  yOffset?: number;
  /** Base opacity at edges (defaults to 0.3) */
  minOpacity?: number;
};

/**
 * ScrollBlur: Smoothly blurs and fades elements at the edges of the viewport
 * while keeping them fully crisp (blur: none, opacity: 1) during reading in the center.
 *
 * GPU-friendly: Uses transform, opacity, and removes the filter when sharp.
 * Mobile-optimized: Halves blur radius on screens < 768px.
 * Accessibility: Under prefers-reduced-motion, disables blur and y-shift entirely.
 */
export function ScrollBlur({
  children,
  className = '',
  isHero = false,
  blurDesktop = 12,
  blurMobile = 6,
  yOffset = 36,
  minOpacity = 0.3,
}: ScrollBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Screen width detection for mobile-optimized blur
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const maxBlur = isMobile ? blurMobile : blurDesktop;

  // Track element scroll progress through viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: isHero ? ['start start', 'end start'] : ['start end', 'end start'],
  });

  // ─── HERO Scroll Progression ─────────────────────────────────────────────
  // Stays 100% sharp for first 28% of scroll, then fades & blurs as it leaves
  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.85],
    [1, 1, 0],
  );
  const heroY = useTransform(
    scrollYProgress,
    [0, 0.28, 0.85],
    [0, 0, -yOffset],
  );
  const heroBlur = useTransform(
    scrollYProgress,
    [0, 0.28, 0.85],
    [0, 0, maxBlur],
  );

  // ─── STANDARD Section Scroll Progression ─────────────────────────────────
  // Enters: [0 -> 0.22] (blurry -> sharp)
  // Active reading zone: [0.22 -> 0.78] (completely sharp & stable)
  // Exits: [0.78 -> 1.0] (sharp -> blurry)
  const stdOpacity = useTransform(
    scrollYProgress,
    [0, 0.22, 0.78, 1],
    [minOpacity, 1, 1, minOpacity],
  );
  const stdY = useTransform(
    scrollYProgress,
    [0, 0.22, 0.78, 1],
    [yOffset, 0, 0, -yOffset],
  );
  const stdBlur = useTransform(
    scrollYProgress,
    [0, 0.22, 0.78, 1],
    [maxBlur, 0, 0, maxBlur],
  );

  // Pick active transform based on section type
  const targetOpacity = isHero ? heroOpacity : stdOpacity;
  const targetY = isHero ? heroY : stdY;
  const targetBlur = isHero ? heroBlur : stdBlur;

  // Convert numeric blur to CSS filter string; drops filter entirely when <= 0.1px
  const filter = useTransform(targetBlur, (val) => {
    if (prefersReduced || val <= 0.1) return 'none';
    return `blur(${val.toFixed(1)}px)`;
  });

  return (
    <motion.div
      ref={containerRef}
      className={`will-change-[transform,opacity,filter] ${className}`}
      style={{
        opacity: targetOpacity,
        y: prefersReduced ? 0 : targetY,
        filter: prefersReduced ? 'none' : filter,
      }}
    >
      {children}
    </motion.div>
  );
}
