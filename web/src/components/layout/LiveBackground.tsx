import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  spriteIndex: number;
  alpha: number;
};

// Pre-render glow sprite once on offscreen canvas to avoid per-particle shadowBlur
function createOffscreenSprite(
  innerColor: string,
  outerColor: string,
  diameter = 32,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const radius = diameter / 2;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, outerColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, diameter, diameter);
  return canvas;
}

export function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect fine pointer / touch
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    let hasFinePointer = finePointerQuery.matches;

    const onPointerMediaChange = (e: MediaQueryListEvent) => {
      hasFinePointer = e.matches;
    };
    if (finePointerQuery.addEventListener) {
      finePointerQuery.addEventListener('change', onPointerMediaChange);
    }

    // Pre-render spore sprites (Dark botanical theme: Mint, Teal, Amber)
    const sporeSprites = [
      createOffscreenSprite('rgba(110, 231, 168, 0.95)', 'rgba(110, 231, 168, 0.25)'), // Mint
      createOffscreenSprite('rgba(45, 212, 191, 0.90)', 'rgba(45, 212, 191, 0.22)'),   // Teal
      createOffscreenSprite('rgba(245, 194, 107, 0.85)', 'rgba(245, 194, 107, 0.20)'), // Amber
    ];

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const updateDprAndSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateDprAndSize();

    // Particle count: 75 on desktop, 30 on small desktop, 12 on touch/mobile
    const isMobile = width < 768;
    const isTouchOrMobile = isMobile || !hasFinePointer;
    const particleCount = isTouchOrMobile ? 12 : isMobile ? 30 : 75;

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const size = 1 + Math.random() * 2; // 1-3 px
      const baseVx = (Math.random() - 0.5) * 0.22;
      const baseVy = -0.12 - Math.random() * 0.22; // gently upward
      // Sprite selection: 55% mint, 35% teal, 10% amber
      const rand = Math.random();
      const spriteIndex = rand < 0.55 ? 0 : rand < 0.9 ? 1 : 2;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        size,
        spriteIndex,
        alpha: 0.6 + Math.random() * 0.4,
      });
    }

    // Cursor tracking (desktop with fine pointer only)
    let targetMouseX = -9999;
    let targetMouseY = -9999;
    let spotlightX = -9999;
    let spotlightY = -9999;
    let cursorActive = false;

    const onPointerMove = (e: PointerEvent) => {
      if (!hasFinePointer || isTouchOrMobile) return;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      cursorActive = true;
      if (spotlightX === -9999) {
        spotlightX = targetMouseX;
        spotlightY = targetMouseY;
      }
    };

    const onPointerLeave = () => {
      cursorActive = false;
    };

    if (hasFinePointer && !isTouchOrMobile) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    // Render single frame for reduced motion or mobile/touch battery & CPU saving
    const renderStaticFrame = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        const sprite = sporeSprites[p.spriteIndex];
        if (!sprite) continue;
        const diameter = p.size * 8;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, p.x - diameter / 2, p.y - diameter / 2, diameter, diameter);
      }
      ctx.globalAlpha = 1.0;
    };

    if (prefersReduced || isTouchOrMobile) {
      renderStaticFrame();
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerleave', onPointerLeave);
        if (finePointerQuery.removeEventListener) {
          finePointerQuery.removeEventListener('change', onPointerMediaChange);
        }
      };
    }

    // Animation loop
    let animId: number;
    let isPaused = false;
    let frameSamples = 0;
    let totalDrawMs = 0;

    const render = () => {
      if (isPaused) return;

      const t0 = performance.now();

      ctx.clearRect(0, 0, width, height);

      // Cursor spotlight smoothing
      if (hasFinePointer && cursorActive) {
        spotlightX += (targetMouseX - spotlightX) * 0.08;
        spotlightY += (targetMouseY - spotlightY) * 0.08;

        // Soft radial spotlight following cursor with easing
        const spotGrad = ctx.createRadialGradient(
          spotlightX,
          spotlightY,
          0,
          spotlightX,
          spotlightY,
          280,
        );
        spotGrad.addColorStop(0, 'rgba(110, 231, 168, 0.07)');
        spotGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.025)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Update and draw particles
      for (const p of particles) {
        // Cursor repulsion within 140px on fine pointer devices
        if (hasFinePointer && cursorActive) {
          const dx = p.x - spotlightX;
          const dy = p.y - spotlightY;
          const dist = Math.hypot(dx, dy);

          if (dist < 140 && dist > 0) {
            const force = (1 - dist / 140) * 1.2;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Apply smooth damping back toward base velocity
        p.vx = p.vx * 0.94 + p.baseVx * 0.06;
        p.vy = p.vy * 0.94 + p.baseVy * 0.06;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -15) p.x = width + 15;
        else if (p.x > width + 15) p.x = -15;

        if (p.y < -15) p.y = height + 15;
        else if (p.y > height + 15) p.y = -15;

        const sprite = sporeSprites[p.spriteIndex];
        if (!sprite) continue;
        const diameter = p.size * 7;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, p.x - diameter / 2, p.y - diameter / 2, diameter, diameter);
      }
      ctx.globalAlpha = 1.0;

      // Track rolling frame time metric for performance audit (< 3.0 ms budget)
      const drawDuration = performance.now() - t0;
      frameSamples++;
      totalDrawMs += drawDuration;
      if (frameSamples % 60 === 0 && typeof window !== 'undefined') {
        const avgMs = Number((totalDrawMs / 60).toFixed(3));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__LIVE_BACKGROUND_FRAME_TIME_MS__ = avgMs;
        totalDrawMs = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause on tab visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animId);
      } else {
        isPaused = false;
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window resize handler
    const handleResize = () => {
      updateDprAndSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      if (finePointerQuery.removeEventListener) {
        finePointerQuery.removeEventListener('change', onPointerMediaChange);
      }
    };
  }, [prefersReduced]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none -z-5"
      aria-hidden="true"
    />
  );
}
