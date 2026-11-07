import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AnchorProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type SolidButtonProps = ButtonProps | AnchorProps;

const baseClasses =
  'rounded-full px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-fg)] font-body font-medium text-sm inline-flex items-center gap-2 transition-all hover:opacity-90 active:scale-98';

export function SolidButton(props: SolidButtonProps) {
  const { children, className = '', ...rest } = props;
  if ('href' in rest && rest.href != null) {
    const { href, ...anchorRest } = rest as AnchorProps;
    return (
      <a
        href={href}
        data-glow=""
        className={`${baseClasses} ${className}`}
        {...anchorRest}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      data-glow=""
      className={`${baseClasses} ${className}`}
      {...(rest as ButtonProps)}
    >
      {children}
    </button>
  );
}
