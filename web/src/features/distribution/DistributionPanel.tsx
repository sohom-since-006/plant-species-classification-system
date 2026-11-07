import { Suspense, lazy } from 'react';
import { useDistribution } from './useDistribution';
import { IndiaCartogram } from './IndiaCartogram';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowUpRight, Globe, Info } from '@/components/icons';

// Lazy-load the Recharts-backed visualizations so Recharts is never bundled in the main entry chunk
const TopCountriesChart = lazy(() => import('./TopCountriesChart'));
const MonthSeasonalityChart = lazy(() => import('./MonthSeasonalityChart'));

export interface DistributionPanelProps {
  speciesId: number | undefined | null;
  className?: string;
}

export function DistributionPanel({ speciesId, className = '' }: DistributionPanelProps) {
  const { distribution, isLoading } = useDistribution(speciesId);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // Empty state if species has no recorded observations or is unrecognized
  if (!distribution || distribution.total === 0) {
    return (
      <div
        className={`liquid-glass rounded-3xl p-8 text-center space-y-4 border border-white/10 ${className}`}
        data-glow=""
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-[var(--accent)]">
          <Globe className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-heading italic text-2xl text-white">
            No Recorded Observations
          </h4>
          <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
            No recorded observation data is currently indexed on GBIF for this species. This reflects regional observer sampling density rather than botanical absence.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="https://www.gbif.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:underline"
          >
            <span>Explore GBIF Global Biodiversity Facility</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const labelTitle = distribution.label || 'Recorded observations';

  return (
    <div className={`space-y-8 ${className}`}>
      {/* ─── Header: Label & Mandatory Non-Native Range Clarification ─── */}
      <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 border border-white/15 space-y-3" data-glow="">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
                Global &amp; Regional Distribution
              </span>
            </div>
            <h3 className="font-heading italic text-2xl md:text-3xl text-white mt-1">
              {labelTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass border border-white/10 text-xs font-mono text-white/90 shrink-0">
            <span className="text-white/60">Total Sightings:</span>
            <span className="font-semibold text-[var(--accent)]">
              {distribution.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Mandatory Non-Native Range Botanical Clarification */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Counts of recorded observations on GBIF. <strong className="text-white">This is not the plant's native range.</strong> Sighting numbers reflect biodiversity observer activity and cultivation locations rather than ecological endemism.
          </p>
        </div>
      </div>

      {/* ─── Grid: Top Countries & India States Cartogram ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Ranked Horizontal Bar Chart */}
        <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
          <TopCountriesChart countries={distribution.countries} />
        </Suspense>

        {/* India States Cartogram Grid */}
        <IndiaCartogram
          states={distribution.india_states}
          countries={distribution.countries}
        />
      </div>

      {/* ─── 12-Month Seasonality Bar Chart ────────────────────────────── */}
      <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}>
        <MonthSeasonalityChart months={distribution.months} />
      </Suspense>

      {/* ─── Source Attribution Link ───────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-mono text-white/50">
        <div className="flex items-center gap-1.5">
          <span>Data:</span>
          <a
            href="https://www.gbif.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>GBIF (Global Biodiversity Information Facility)</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <span>Coarse regional counts • Privacy preserved</span>
      </div>
    </div>
  );
}

export default DistributionPanel;

