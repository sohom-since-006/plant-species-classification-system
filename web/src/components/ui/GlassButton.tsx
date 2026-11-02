import type { ReactNode, ButtonHTMLAttributes } from 'react';

export type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function GlassButton({ children, className = '', ...props }: GlassButtonProps) {
  return (
    <button
      className={`liquid-glass-strong rounded-full px-5 py-2.5 font-body font-medium text-sm inline-flex items-center gap-2 transition-opacity hover:opacity-80 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

