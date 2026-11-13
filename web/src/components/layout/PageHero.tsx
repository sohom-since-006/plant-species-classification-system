import { useRef, useState, useEffect, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BlurText } from '@/components/motion/BlurText';
import { Reveal } from '@/components/motion/Reveal';

export type PageHeroProps = {
  badge?: string;
  title: string;
  italicSubtitle?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  align?: 'center' | 'left';
  compact?: boolean;
};

/**
 * Standardized PageHero with synchronized scroll-driven blur and fade.
 * Exactly mirrors the hero scroll animation on the Home page:
 * - Translates upwards (y: 0 -> -45px)
 * - Fades opacity (1 -> 0)
 * - Blurs content (blur(0px) -> blur(8px))
 * Respects prefers-reduced-motion.
 */
export function PageHero({
  badge,
  title,
  italicSubtitle,
  description,
  children,
  className = '',
  align = 'center',
  compact = false,
}: PageHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Track scroll progress through this hero section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Synchronized transform values matching Home page physics
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.75], [0, -45]);
  const filter = useTransform(
    scrollYProgress,
    [0, 0.75],
    ['blur(0px)', 'blur(8px)'],
  );

  const isLeft = align === 'left';

  return (
    <section
      ref={containerRef}
      className={`relative w-full overflow-hidden ${
        compact
          ? 'pt-28 md:pt-32 pb-10 min-h-[340px]'
          : 'pt-32 md:pt-36 pb-16 min-h-[420px]'
      } flex items-center justify-center ${className}`}
    >
      {/* Subtle radial ambient spotlight */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] rounded-full pointer-events-none opacity-20 blur-[90px]"
        style={{
          background:
            'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Hero Content Container with synchronized scroll blur + fade */}
      <motion.div
        className={`relative z-10 max-w-5xl mx-auto px-6 md:px-12 flex flex-col ${
          isLeft ? 'items-start text-left' : 'items-center text-center'
        }`}
        style={{
          opacity: prefersReducedMotion ? 1 : opacity,
          y: prefersReducedMotion || isMobile ? 0 : y,
          filter: prefersReducedMotion || isMobile ? 'none' : filter,
        }}
      >
        {/* Optional Badge */}
        {badge && (
          <Reveal delay={0.1} className="mb-4">
            <span className="liquid-glass inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-body font-semibold tracking-wider uppercase text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {badge}
            </span>
          </Reveal>
        )}

        {/* Title with entrance blur */}
        <h1 className="font-heading italic text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-[-2px] text-[var(--fg)]">
          <BlurText text={title} delay={0.2} />
        </h1>

        {/* Optional Italic Subtitle / Tagline */}
        {italicSubtitle && (
          <Reveal delay={0.35} className="mt-2">
            <p className="font-heading italic text-2xl sm:text-3xl text-[var(--accent)] leading-tight">
              {italicSubtitle}
            </p>
          </Reveal>
        )}

        {/* Description */}
        {description && (
          <Reveal delay={0.45} className="mt-4 max-w-2xl">
            <p className="font-body font-light text-base sm:text-lg text-[var(--fg-muted)] leading-relaxed">
              {description}
            </p>
          </Reveal>
        )}

        {/* Interactive children / action buttons */}
        {children && (
          <Reveal delay={0.55} className="mt-6 w-full">
            {children}
          </Reveal>
        )}
      </motion.div>
    </section>
  );
}
