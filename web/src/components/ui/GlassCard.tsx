import type { ReactNode } from 'react';

export type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function GlassCard({ children, className = '', ...props }: GlassCardProps) {
  return (
    <div className={`liquid-glass rounded-[1.25rem] p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

