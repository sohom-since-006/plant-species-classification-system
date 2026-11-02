import type { ReactNode } from 'react';

export type IconBoxProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function IconBox({ children, className = '', ...props }: IconBoxProps) {
  return (
    <div
      className={`liquid-glass h-11 w-11 rounded-[0.75rem] flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

