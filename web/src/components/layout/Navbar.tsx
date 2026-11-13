import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight, Menu, X } from '@/components/icons';
import { BrandLogo } from '@/components/brand';

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

          {/* Desktop right balance spacer */}
          <div className="hidden md:block w-36" aria-hidden="true" />

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
