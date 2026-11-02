import { Link } from 'react-router-dom';

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/classify', label: 'Identify' },
  { to: '/explore', label: 'Explore' },
  { to: '/history', label: 'History' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--glass-edge-mid)] bg-[var(--bg)]/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-8 lg:px-16 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex flex-wrap gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs font-body font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs font-body text-[var(--fg-subtle)]">
            MIT License &middot; {new Date().getFullYear()}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-body text-[var(--fg-subtle)] leading-relaxed max-w-2xl">
            ⚠️ Identification is probabilistic. Never eat or use a plant based only on this result.
            Medicinal information is educational only and is not medical advice.
          </p>
          <p className="text-xs font-body text-[var(--fg-subtle)]">
            Built on open biodiversity data from{' '}
            <a
              href="https://www.gbif.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline transition-colors"
            >
              GBIF
            </a>{' '}
            and{' '}
            <a
              href="https://www.inaturalist.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline transition-colors"
            >
              iNaturalist
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
