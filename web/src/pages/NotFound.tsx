import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight } from '@/components/icons';

export function NotFound() {
  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="404 BOTANICAL VOID"
        title="Specimen Not Found"
        italicSubtitle="Lost in the Canopy"
        description="The page or botanical specimen you are searching for does not exist or has been relocated to another part of the herbarium."
      >
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <Link to="/">
            <SolidButton className="text-xs px-5 py-2">
              Return Home
            </SolidButton>
          </Link>
          <Link
            to="/explore"
            className="liquid-glass text-xs font-mono px-5 py-2 rounded-full text-[var(--fg)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
          >
            Explore Library <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </PageHero>

      <div className="max-w-2xl mx-auto px-6 text-center space-y-4">
        <div className="liquid-glass rounded-3xl p-8 space-y-3">
          <p className="text-xs font-mono uppercase text-[var(--fg-subtle)]">
            Suggested Navigation
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-mono text-[var(--accent)]">
            <Link to="/classify" className="hover:underline">
              → Classify Image
            </Link>
            <Link to="/explore" className="hover:underline">
              → Species Catalog
            </Link>
            <Link to="/history" className="hover:underline">
              → Past History
            </Link>
            <Link to="/dashboard" className="hover:underline">
              → Model Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
