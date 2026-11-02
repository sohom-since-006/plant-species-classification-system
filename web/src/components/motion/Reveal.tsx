import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

export type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  yOffset?: number;
};

export function Reveal({ children, delay = 0, className = '', yOffset = 20 }: RevealProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants: Variants = {
    hidden: prefersReducedMotion
      ? { opacity: 0 }
      : { filter: 'blur(10px)', opacity: 0, y: yOffset },
    visible: prefersReducedMotion
      ? {
          opacity: 1,
          transition: { duration: 0.3, delay, ease: 'easeOut' },
        }
      : {
          filter: 'blur(0px)',
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
        },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
