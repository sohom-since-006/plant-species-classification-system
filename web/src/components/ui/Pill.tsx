import type { ReactNode } from 'react';

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Pill({ children, className = '', ...props }: PillProps) {
  return (
    <span
      className={`liquid-glass rounded-full px-3 py-1 text-[11px] font-body font-medium whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

