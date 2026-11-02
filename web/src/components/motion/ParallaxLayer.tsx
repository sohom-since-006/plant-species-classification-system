import type { ReactNode } from 'react';

export type ParallaxLayerProps = {
  speed?: number;
  children: ReactNode;
  className?: string;
};

export function ParallaxLayer({ children, className = '' }: ParallaxLayerProps) {
  // Phase 1 shell: renders children, motion hooked up in Phase 2
  return <div className={className}>{children}</div>;
}

