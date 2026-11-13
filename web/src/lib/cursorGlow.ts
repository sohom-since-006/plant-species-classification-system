/**
 * Cursor Glow & Shared Pointer Tracking
 *
 * Implements a single, document-level pointermove listener throttled with requestAnimationFrame.
 * Sets CSS custom properties `--mx` and `--my` on the closest `[data-glow]` ancestor.
 * Only active on devices with fine pointers and hover capability (`(hover: hover) and (pointer: fine)`).
 */

export type CursorPosition = {
  x: number;
  y: number;
  active: boolean;
};

const cursorState: CursorPosition = {
  x: -9999,
  y: -9999,
  active: false,
};

export function getCursorPosition(): CursorPosition {
  return cursorState;
}

/**
 * Sets CSS variables `--mx` and `--my` on a target element relative to its bounding rect.
 */
export function setElementGlow(target: HTMLElement, clientX: number, clientY: number): void {
  const rect = target.getBoundingClientRect();
  const mx = Math.round(clientX - rect.left);
  const my = Math.round(clientY - rect.top);
  target.style.setProperty('--mx', `${mx}px`);
  target.style.setProperty('--my', `${my}px`);
}

/**
 * Initializes the global pointermove listener.
 * Returns an unmount / cleanup function.
 */
export function initCursorGlow(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Check for fine pointer, hover support, reduced motion, and mobile screen width (skip touch, small screens, and reduced-motion)
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointerQuery.matches || reducedMotionQuery.matches || window.innerWidth < 768) {
    return () => {};
  }

  let rafId: number | null = null;
  let lastClientX = -9999;
  let lastClientY = -9999;
  let lastTarget: EventTarget | null = null;

  const onPointerMove = (e: PointerEvent) => {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    lastTarget = e.target;

    cursorState.x = e.clientX;
    cursorState.y = e.clientY;
    cursorState.active = true;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!lastTarget || !(lastTarget instanceof Element)) return;

        const glowEl = lastTarget.closest('[data-glow]') as HTMLElement | null;
        if (glowEl) {
          setElementGlow(glowEl, lastClientX, lastClientY);
        }
      });
    }
  };

  const onPointerLeave = () => {
    cursorState.active = false;
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
  };
}

