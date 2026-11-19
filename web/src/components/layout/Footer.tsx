import { Link } from 'react-router-dom';
import { ScrollBlur } from '@/components/motion/ScrollBlur';
import { BrandLogo } from '@/components/brand';
import { ShieldCheck, Info } from '@/components/icons';

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/classify', label: 'Identify' },
  { to: '/explore', label: 'Explore' },
  { to: '/identify-traits', label: 'Traits' },
  { to: '/history', label: 'History' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/help', label: 'Help' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--glass-edge-mid)] bg-[var(--bg)]/40 backdrop-blur-md">
      <ScrollBlur className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 py-10">
        {/* Top brand & navigation row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
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
                className="text-xs font-body font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors py-1.5 rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Compact Credits, Privacy & Limitations Section */}
        <div className="py-6 border-b border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[var(--fg-muted)]">
          {/* Privacy Guarantee */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] uppercase">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Zero-Cloud Privacy</span>
            </div>
            <p className="leading-relaxed">
              100% client-side inference. Your photos are processed in local browser memory and never leave your device.
            </p>
          </div>

          {/* Dataset Credits & Licenses */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[11px] uppercase">
              <span>Open Science Data</span>
            </div>
            <p className="leading-relaxed">
              Imagery from iNaturalist naturalists via GBIF (CC0, CC-BY, CC-BY-NC). Model: EfficientNet-B0 (83.88% Top-1).{' '}
              <a
                href="/species/credits.json"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                Photo Credits JSON
              </a>
            </p>
          </div>

          {/* Key Limitations & Safety */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] uppercase">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Scope &amp; Safety</span>
            </div>
            <p className="leading-relaxed">
              Identification is probabilistic (scope: 150 species; accuracy depends on the photo). Strictly educational: never ingest wild plants.{' '}
              <Link to="/help#credits-limitations" className="text-emerald-400 underline hover:text-emerald-300">
                Full credits &amp; limitations →
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 text-xs font-body text-[var(--fg-subtle)]">
          <p className="text-[11px]">
            PlantAI © {new Date().getFullYear()} • Open-Source Botanical Computer Vision
          </p>
          <div className="font-mono text-[11px]">
            <span>
              Biodiversity records mediated via{' '}
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
            </span>
          </div>
        </div>
      </ScrollBlur>
    </footer>
  );
}
