import { Link } from 'react-router-dom';
import { ScrollBlur } from '@/components/motion/ScrollBlur';
import { BrandLogo } from '@/components/brand';

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
      <ScrollBlur className="max-w-7xl mx-auto px-8 lg:px-16 py-12">
        {/* Top brand & navigation row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 w-fit" aria-label="PlantAI Home">
            <div className="liquid-glass h-10 w-10 rounded-full flex items-center justify-center shrink-0">
              <BrandLogo size={22} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading italic text-xl text-white tracking-wide leading-none">
                PlantAI
              </span>
              <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
                Private On-Device Botanical Intelligence
              </span>
            </div>
          </Link>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-glow=""
                className="text-xs font-body font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors py-2 rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom copyright & disclaimers */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6 text-xs font-body text-[var(--fg-subtle)]">
          <p className="leading-relaxed max-w-2xl">
            ⚠️ Identification is probabilistic. Never eat or use a wild plant based solely on computer vision output.
            Medicinal monographs are for educational reference and do not constitute clinical guidance.
          </p>
          <div className="shrink-0 text-left md:text-right font-mono text-[11px]">
            <p>PlantAI © {new Date().getFullYear()} • MIT License</p>
            <p className="text-[10px] text-[var(--fg-subtle)] mt-0.5">
              Biodiversity data via{' '}
              <a
                href="https://www.gbif.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                GBIF
              </a>{' '}
              &amp;{' '}
              <a
                href="https://www.inaturalist.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                iNaturalist
              </a>
            </p>
          </div>
        </div>
      </ScrollBlur>
    </footer>
  );
}
