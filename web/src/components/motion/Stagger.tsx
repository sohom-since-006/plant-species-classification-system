import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { staggerContainer, staggerItem, usePrefersReducedMotion } from '@/lib/motion';

export type StaggerProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
};

export function Stagger({
  children,
  staggerDelay = 0.06,
  delayChildren = 0,
  className = '',
  ...props
}: StaggerProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerContainer(staggerDelay, delayChildren)}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type StaggerItemProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

export function StaggerItem({ children, className = '', ...props }: StaggerItemProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}

