import { ConfidenceRing } from '@/components/ui/ConfidenceRing';
import { TierBadge } from '@/components/ui/TierBadge';
import { MatchBar } from '@/components/ui/MatchBar';
import { Info, Leaf, Lightbulb } from '@/components/icons';
import type { ClassificationResult } from '@/types/prediction';
import type { Species } from '@/types/species';

export type ResultCardProps = {
  result: ClassificationResult;
  topSpecies?: Species;
  candidateSpecies?: (Species | undefined)[];
};

export function ResultCard({ result, topSpecies, candidateSpecies = [] }: ResultCardProps) {
  const topProb = result.top3[0]?.prob ?? 0;
  const isUnknown = result.unknown || result.tier === 'unknown';
  const isLowConfidence = result.tier === 'low' && !isUnknown;

  return (
    <div className="w-full space-y-6">
      {/* ─── Main Header Banner ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1.5">
          {/* Family tag and tier badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {topSpecies && !isUnknown ? (
              <span className="text-xs font-mono uppercase text-[var(--accent)] tracking-wider">
                Family: {topSpecies.family}
              </span>
            ) : (
              <span className="text-xs font-mono uppercase text-amber-400 tracking-wider">
                Botanical Scan
              </span>
            )}
            <TierBadge tier={result.tier} />
          </div>

          {/* Species Names */}
          {isUnknown ? (
            <div>
              <h2 className="font-heading italic text-3xl sm:text-4xl text-white">
                Unrecognized Specimen
              </h2>
              <p className="font-body text-sm text-white/70 mt-1">
                Specimen does not match any known botanical class with sufficient confidence.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-heading italic text-3xl sm:text-4xl text-white">
                {topSpecies ? topSpecies.commonName : `Species ID #${result.top3[0]?.speciesId}`}
              </h2>
              <p className="font-heading italic text-lg sm:text-xl text-[var(--accent)]">
                {topSpecies?.scientificName}
              </p>
            </div>
          )}
        </div>

        {/* Confidence Ring Indicator */}
        <div className="shrink-0 flex items-center gap-3">
          <ConfidenceRing
            value={topProb}
            tier={result.tier}
            size={88}
            strokeWidth={7}
            showLabel
          />
        </div>
      </div>

      {/* ─── Edge Messages from docs/PRODUCT.md ───────────────────── */}

      {/* 1. Unknown / Not a Plant message */}
      {isUnknown && (
        <div className="liquid-glass rounded-2xl p-5 border border-amber-500/30 bg-amber-950/15 text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm text-amber-100">
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>This doesn't look like a plant we know yet.</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-200/90 font-light">
            Our on-device model specializes in 120+ plant species across Indian and global flora. If your photo is blurry, taken in extreme lighting, or contains non-plant objects, try capturing a well-lit close-up of a single leaf or blossom.
          </p>
        </div>
      )}

      {/* 2. Low confidence message */}
      {isLowConfidence && (
        <div className="liquid-glass rounded-2xl p-5 border border-amber-500/30 bg-amber-950/15 text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm text-amber-100">
            <Info className="w-4 h-4 text-amber-300" />
            <span>We're not sure. Here are the closest matches.</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-200/90 font-light">
            Confidence is under 60%. Try a clearer photo of a single leaf, flower, or bark with uniform lighting and a clean background.
          </p>
        </div>
      )}

      {/* 3. Genus fallback note */}
      {result.genusFallback && (
        <div className="liquid-glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-start gap-3 text-xs">
          <Leaf className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Likely genus {result.genusFallback}:</strong> Confidence
            is distributed across closely related species in this genus. Inspect the similar species tab to verify distinct botanical traits.
          </p>
        </div>
      )}

      {/* ─── Top-3 Probability Breakdown ─────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--fg-muted)] tracking-wider">
          <span>Top Candidate Matches</span>
          <span>Probability</span>
        </div>
        <div className="space-y-2.5">
          {result.top3.map((pred, idx) => {
            const spec = candidateSpecies[idx];
            const displayName = spec
              ? `${spec.commonName} (${spec.scientificName})`
              : `Species #${pred.speciesId}`;
            return (
              <MatchBar
                key={`${pred.speciesId}-${idx}`}
                label={displayName}
                value={pred.prob}
                showDecimals
              />
            );
          })}
        </div>
      </div>

      {/* ─── Safety copy from docs/PRODUCT.md & Rule 8 ───────────── */}
      <div className="liquid-glass rounded-2xl p-4 border border-white/10 flex items-start gap-3 text-xs font-body text-[var(--fg-muted)]">
        <span className="text-base" aria-hidden="true">⚠️</span>
        <div className="space-y-1">
          <p className="text-white/90 font-medium">
            Identification is probabilistic. Never eat or use a plant based only on this result.
          </p>
          <p className="text-white/60 text-[11px]">
            Medicinal and culinary information is educational only, not medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
