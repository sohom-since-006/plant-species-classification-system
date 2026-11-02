import type { ReactNode } from 'react';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Badge({ children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`liquid-glass rounded-full px-3 py-1 text-[11px] font-body font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

