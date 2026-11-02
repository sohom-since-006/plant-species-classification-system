import type { ReactNode } from 'react';

export type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function Reveal({ children, className = '' }: RevealProps) {
  // Phase 1 shell: renders children, reveal animation in Phase 2
  return <div className={className}>{children}</div>;
}

