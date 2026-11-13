import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export type ParallaxLayerProps = {
  speed?: number; // e.g. 0.2, 0.5, -0.3
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function ParallaxLayer({
  speed = 0.2,
  children,
  className = '',
  style = {},
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const yMovement = speed * 150;
  const y = useTransform(scrollYProgress, [0, 1], [-yMovement, yMovement]);

  if (prefersReducedMotion || isMobile) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ y, ...style }}>
      {children}
    </motion.div>
  );
}
