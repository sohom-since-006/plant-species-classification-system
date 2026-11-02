import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Toggle } from '@/components/ui/Toggle';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight, Menu, X } from '@/components/icons';

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

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16" role="navigation">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Monogram */}
          <Link
            to="/"
            className="liquid-glass h-12 w-12 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
            aria-label="Plant Species Classification System Home"
          >
            <span className="font-heading italic text-2xl leading-none text-[var(--fg)]">P</span>
          </Link>

          {/* Center nav pill — hidden on mobile */}
          <div className="hidden md:flex liquid-glass rounded-full p-1.5 items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === '/'}>
                {link.label}
              </NavLink>
            ))}
            <Link to="/classify" tabIndex={-1}>
              <SolidButton className="ml-1 text-xs px-4 py-1.5">
                Identify <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </SolidButton>
            </Link>
          </div>

          {/* Right: theme toggle + mobile menu */}
          <div className="flex items-center gap-2">
            <Toggle />
            <button
              className="liquid-glass h-10 w-10 rounded-full flex items-center justify-center md:hidden text-[var(--fg)]"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              type="button"
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
            <div className="flex justify-end">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)]"
                aria-label="Close menu"
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
