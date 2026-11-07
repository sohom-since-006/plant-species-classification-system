import type { HTMLAttributes } from 'react';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

/**
 * Liquid glass skeleton loader with continuous horizontal shimmer sweep.
 * Respects prefers-reduced-motion via the global reduced motion CSS rules.
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`liquid-glass relative overflow-hidden rounded-xl bg-white/[0.03] dark:bg-white/[0.03] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

