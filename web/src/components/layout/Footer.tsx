import { Link } from 'react-router-dom';

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/classify', label: 'Classify' },
  { to: '/explore', label: 'Explore' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--glass-edge-mid)]">
      <div className="mx-auto max-w-[1200px] px-8 md:px-16 lg:px-20 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs font-body text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
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
          <p className="text-xs font-body text-[var(--fg-subtle)] leading-relaxed max-w-prose">
            ⚠️ Identification is probabilistic. Never eat or use a plant based only on this result.
            Medicinal information is educational only and is not medical advice.
          </p>
          <p className="text-xs font-body text-[var(--fg-subtle)]">
            Built on open biodiversity data from{' '}
            <a
              href="https://www.gbif.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
            >
              GBIF
            </a>{' '}
            and{' '}
            <a
              href="https://www.inaturalist.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
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

