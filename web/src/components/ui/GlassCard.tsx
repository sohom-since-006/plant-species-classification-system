import type { HTMLAttributes, ReactNode } from 'react';

export type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function GlassCard({
  children,
  interactive = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`liquid-glass rounded-[1.25rem] p-6 ${
        interactive ? 'cursor-pointer transition-all hover:scale-[1.01]' : ''
      } ${className}`}
      {...(interactive ? { 'data-glow': '' } : {})}
      {...props}
    >
      {children}
    </div>
  );
}
