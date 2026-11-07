import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import {
  DURATION_FAST,
  DURATION_BASE,
  DURATION_SLOW,
  DURATION_PAGE,
  DURATION_PAGE_EXIT,
  easeOutExpo,
  easeOutCubic,
  easeInOutCubic,
  springDefault,
  springSnappy,
  springGentle,
  staggerContainer,
  staggerItem,
  pageTransition,
  pageTransitionReduced,
  tabCrossfade,
  modalSpring,
  toastSlide,
  usePrefersReducedMotion,
} from '@/lib/motion';
import { setElementGlow, initCursorGlow, getCursorPosition } from '@/lib/cursorGlow';
import { CountUp } from '@/components/motion/CountUp';

describe('Motion Presets & Tokens', () => {
  it('exports standard timing constants matching TRD/Design tokens', () => {
    expect(DURATION_FAST).toBe(0.2);
    expect(DURATION_BASE).toBe(0.4);
    expect(DURATION_SLOW).toBe(0.8);
    expect(DURATION_PAGE).toBe(0.35);
    expect(DURATION_PAGE_EXIT).toBe(0.2);
  });

  it('exports cubic-bezier easings correctly', () => {
    expect(easeOutExpo).toEqual([0.16, 1, 0.3, 1]);
    expect(easeOutCubic).toEqual([0.215, 0.61, 0.355, 1]);
    expect(easeInOutCubic).toEqual([0.645, 0.045, 0.355, 1]);
  });

  it('exports spring configurations with appropriate damping and stiffness', () => {
    expect(springDefault).toMatchObject({ type: 'spring', damping: 25, stiffness: 300 });
    expect(springSnappy).toMatchObject({ type: 'spring', damping: 20, stiffness: 400 });
    expect(springGentle).toMatchObject({ type: 'spring', damping: 30, stiffness: 200 });
  });

  it('generates staggerContainer and staggerItem variants with customizable timings', () => {
    const container = staggerContainer(0.08, 0.2);
    expect(container.hidden).toBeDefined();
    expect(container.show).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transition = (container.show as any).transition;
    expect(transition.staggerChildren).toBe(0.08);
    expect(transition.delayChildren).toBe(0.2);

    expect(staggerItem.hidden).toMatchObject({ opacity: 0, y: 16 });
    expect(staggerItem.show).toMatchObject({ opacity: 1, y: 0 });
  });

  it('provides pageTransition with fade, rise, and light blur', () => {
    expect(pageTransition.initial).toMatchObject({
      opacity: 0,
      y: 12,
      filter: 'blur(4px)',
    });
    expect(pageTransition.animate).toMatchObject({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
    });
    expect(pageTransition.exit).toMatchObject({
      opacity: 0,
      y: -8,
      filter: 'blur(4px)',
    });
  });

  it('provides instant fallback in pageTransitionReduced for accessibility', () => {
    expect(pageTransitionReduced.initial).toEqual({ opacity: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((pageTransitionReduced.animate as any).opacity).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((pageTransitionReduced.animate as any).transition.duration).toBe(0.01);
  });

  it('defines tabCrossfade, modalSpring and toastSlide variants', () => {
    expect(tabCrossfade.initial).toBeDefined();
    expect(tabCrossfade.animate).toBeDefined();
    expect(tabCrossfade.exit).toBeDefined();

    expect(modalSpring.initial).toMatchObject({ opacity: 0, scale: 0.95 });
    expect(modalSpring.animate).toMatchObject({ opacity: 1, scale: 1 });

    expect(toastSlide.initial).toMatchObject({ opacity: 0, y: 16 });
    expect(toastSlide.animate).toMatchObject({ opacity: 1, y: 0 });
  });
});

describe('Cursor Glow & Pointer Tracking', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('(pointer: fine)') || query.includes('(hover: hover)'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets --mx and --my CSS custom properties accurately on element', () => {
    const el = document.createElement('div');
    el.setAttribute('data-glow', '');
    document.body.appendChild(el);

    // Mock getBoundingClientRect: element located at (50, 100)
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 50,
      top: 100,
      right: 250,
      bottom: 300,
      width: 200,
      height: 200,
      x: 50,
      y: 100,
      toJSON: () => {},
    });

    setElementGlow(el, 120, 180);

    expect(el.style.getPropertyValue('--mx')).toBe('70px'); // 120 - 50
    expect(el.style.getPropertyValue('--my')).toBe('80px'); // 180 - 100

    document.body.removeChild(el);
  });

  it('initializes pointermove listener and tracks cursor position', () => {
    const cleanup = initCursorGlow();

    const moveEvt = new MouseEvent('pointermove', {
      clientX: 250,
      clientY: 350,
    });
    document.dispatchEvent(moveEvt);

    const pos = getCursorPosition();
    expect(pos.x).toBe(250);
    expect(pos.y).toBe(350);
    expect(pos.active).toBe(true);

    cleanup();
  });
});

describe('Reduced Motion Path', () => {
  it('detects when prefers-reduced-motion is enabled', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('renders CountUp immediately at target value when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<CountUp value={1250} prefix="Total: " suffix=" plants" />);
    expect(screen.getByText('Total: 1,250 plants')).toBeInTheDocument();
  });
});
