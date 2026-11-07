import { useState, useEffect } from 'react';
import type { Transition, Variants } from 'framer-motion';

// ─── Durations ──────────────────────────────────────────────────
export const DURATION_FAST = 0.2;
export const DURATION_BASE = 0.4;
export const DURATION_SLOW = 0.8;
export const DURATION_PAGE = 0.35;
export const DURATION_PAGE_EXIT = 0.2;

// ─── Easings ────────────────────────────────────────────────────
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;
export const easeInOutCubic = [0.645, 0.045, 0.355, 1] as const;

// ─── Spring Configs ─────────────────────────────────────────────
export const springDefault: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

export const springSnappy: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 400,
};

export const springGentle: Transition = {
  type: 'spring',
  damping: 30,
  stiffness: 200,
};

// ─── Stagger Helpers ────────────────────────────────────────────
export const staggerContainer = (
  staggerChildren = 0.06,
  delayChildren = 0,
): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_BASE,
      ease: easeOutExpo,
    },
  },
};

// ─── Page Transitions ───────────────────────────────────────────
// Fade + 12px rise + light blur (4px) in 0.35 s, short exit (0.2 s)
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION_PAGE,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(4px)',
    transition: {
      duration: DURATION_PAGE_EXIT,
      ease: 'easeIn',
    },
  },
};

export const pageTransitionReduced: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.01 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.01 },
  },
};

// ─── Tab Crossfade ──────────────────────────────────────────────
export const tabCrossfade: Variants = {
  initial: {
    opacity: 0,
    x: 8,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

// ─── Modal Spring ───────────────────────────────────────────────
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION_FAST },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION_FAST },
  },
};

export const modalSpring: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springDefault,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: DURATION_FAST },
  },
};

// ─── Toast Slide-In ─────────────────────────────────────────────
export const toastSlide: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.95,
    transition: { duration: DURATION_FAST },
  },
};

// ─── Button Micro-Interactions ──────────────────────────────────
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98 },
};

export const pressScale = {
  whileTap: { scale: 0.98 },
};

// ─── Hook: usePrefersReducedMotion ──────────────────────────────
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    } else {
      // Legacy fallback
      mediaQuery.addListener(onChange);
      return () => mediaQuery.removeListener(onChange);
    }
  }, []);

  return prefersReduced;
}
