import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight, Menu, X, User as UserIcon } from '@/components/icons';
import { BrandLogo } from '@/components/brand';
import { useSession } from '@/features/auth/useSession';

const links = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/history', label: 'History' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3.5 py-1.5 text-sm font-body font-medium transition-colors rounded-full ${
    isActive ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
  }`;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut, openAuthModal } = useSession();

  const userDisplayName =
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Botanist';

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 lg:px-16" role="navigation">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo Monogram & Name */}
          <Link
            to="/"
            data-glow=""
            className="flex items-center gap-3 shrink-0 hover:opacity-95 transition-opacity"
            aria-label="PlantAI - Plant Species Classification System Home"
          >
            <div className="liquid-glass h-12 w-12 rounded-full flex items-center justify-center shrink-0">
              <BrandLogo size={28} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading italic text-2xl text-white tracking-wide leading-none">
                PlantAI
              </span>
              <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider hidden sm:inline">
                Neural Vision
              </span>
            </div>
          </Link>

          {/* Center nav pill — hidden on mobile */}
          <div className="hidden md:flex liquid-glass rounded-full p-1.5 items-center gap-1" data-glow="">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                data-glow=""
                className={navLinkClass}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/classify" tabIndex={-1}>
              <SolidButton className="ml-1 text-xs px-4 py-1.5">
                Identify <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </SolidButton>
            </Link>
          </div>

          {/* Right: Auth controls on desktop */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="liquid-glass rounded-full px-3 py-1 flex items-center gap-2 text-xs border border-white/10" data-glow="">
                <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-mono font-bold text-[10px]">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[var(--fg)] font-body truncate max-w-[110px]" title={userDisplayName}>
                  {userDisplayName}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-[11px] font-mono text-[var(--fg-subtle)] hover:text-rose-400 ml-1 transition-colors"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                data-glow=""
                className="liquid-glass rounded-full px-4 py-2 text-xs font-body font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1.5 border border-white/10 hover:border-white/20 transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Right: mobile menu toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              className="liquid-glass h-11 w-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-[var(--fg)]"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              type="button"
              data-glow=""
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-72 liquid-glass-strong p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BrandLogo size={22} />
                <span className="font-heading italic text-xl text-[var(--fg)]">PlantAI</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)]"
                aria-label="Close navigation menu"
                type="button"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2.5 text-sm font-body font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)]'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Mobile Auth button */}
            <div className="pt-2 border-t border-white/10">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-mono font-bold text-xs">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-[var(--fg)] font-body truncate">{userDisplayName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-body text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    openAuthModal();
                    setMobileOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-body text-[var(--fg)] liquid-glass border border-white/10 flex items-center justify-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>

            <Link to="/classify" onClick={() => setMobileOpen(false)}>
              <SolidButton className="w-full justify-center">
                Identify <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </SolidButton>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
