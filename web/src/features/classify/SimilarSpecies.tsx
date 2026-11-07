import { formatPercent } from '@/lib/format';
import { Leaf } from '@/components/icons';
import { MOCK_LOOKALIKES } from '@/data/mockSpecies';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import type { SimilarMatch } from '@/types/prediction';
import type { Species } from '@/types/species';

export type SimilarSpeciesProps = {
  similarMatches: SimilarMatch[];
  topSpecies?: Species;
  speciesMap: Map<number, Species>;
  onSelectSpecies?: (species: Species) => void;
};

export function SimilarSpecies({
  similarMatches,
  topSpecies,
  speciesMap,
  onSelectSpecies,
}: SimilarSpeciesProps) {
  if (similarMatches.length === 0) {
    return (
      <div className="liquid-glass rounded-2xl p-8 text-center text-white/60 text-xs">
        No direct look-alike candidates registered for this specimen.
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Introduction note */}
      <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-xs text-white/80 flex items-start gap-3">
        <Leaf className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The engine fuses <strong>ML classification probability</strong> (60%) with{' '}
          <strong>visual centroid cosine distance</strong> (40%) and a genus bonus (+5%) to surface
          subtle botanical look-alikes.
        </p>
      </div>

      {/* Comparative Table */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 font-mono text-[11px] uppercase tracking-wider text-white/70">
                <th className="py-3 px-4">Candidate Species</th>
                <th className="py-3 px-4 text-right">ML Prob</th>
                <th className="py-3 px-4 text-right">Visual Match</th>
                <th className="py-3 px-4 text-right">Final Fusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {similarMatches.map((match) => {
                const spec = speciesMap.get(match.speciesId);
                const isSameGenus =
                  topSpecies && spec && topSpecies.genus === spec.genus;

                return (
                  <tr
                    key={match.speciesId}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => spec && onSelectSpecies?.(spec)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white group-hover:text-[var(--accent)] transition-colors">
                        {spec ? spec.commonName : `Species #${match.speciesId}`}
                      </div>
                      <div className="font-heading italic text-white/60 text-xs">
                        {spec?.scientificName}
                        {isSameGenus && (
                          <span className="ml-2 font-mono text-[10px] text-[var(--accent)] not-italic bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Same Genus
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white/80">
                      {formatPercent(match.ml, 1)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white/80">
                      {formatPercent(match.visual, 1)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[var(--accent)]">
                      {formatPercent(match.final, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Comparative Bars */}
      <div className="space-y-4">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
          Comparative Match Strength
        </p>
        <Stagger className="space-y-3">
          {similarMatches.map((match) => {
            const spec = speciesMap.get(match.speciesId);
            const label = spec ? spec.commonName : `Species #${match.speciesId}`;
            return (
              <StaggerItem key={match.speciesId}>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/90 font-medium">{label}</span>
                    <span className="font-mono text-xs text-[var(--accent)]">
                      {formatPercent(match.final, 1)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden w-full flex">
                    {/* ML component (60%) */}
                    <div
                      className="h-full bg-emerald-500 opacity-90 transition-all duration-700"
                      style={{ width: `${Math.min(100, match.ml * 60)}%` }}
                      title={`ML Prob: ${formatPercent(match.ml, 1)}`}
                    />
                    {/* Visual component (40%) */}
                    <div
                      className="h-full bg-teal-400 opacity-75 transition-all duration-700"
                      style={{ width: `${Math.min(100, match.visual * 40)}%` }}
                      title={`Visual Cosine: ${formatPercent(match.visual, 1)}`}
                    />
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
        <div className="flex items-center justify-end gap-4 text-[10px] font-mono text-white/60 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>ML Model (60%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-400" />
            <span>Visual Features (40%)</span>
          </div>
        </div>
      </div>

      {/* How to Tell Apart cards */}
      {topSpecies && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
            How to Tell Them Apart
          </p>
          <div className="space-y-3">
            {similarMatches.map((match) => {
              const lookAlike = MOCK_LOOKALIKES.find(
                (la) =>
                  (la.speciesId === topSpecies.id && la.lookAlikeId === match.speciesId) ||
                  (la.speciesId === match.speciesId && la.lookAlikeId === topSpecies.id),
              );

              if (!lookAlike) return null;
              const other = speciesMap.get(match.speciesId);

              return (
                <div
                  key={`diff-${match.speciesId}`}
                  className="liquid-glass rounded-2xl p-4 border border-white/10 space-y-2 text-xs"
                >
                  <div className="font-heading italic text-base text-white">
                    {topSpecies.commonName} vs. {other?.commonName}
                  </div>
                  <p className="text-white/80 leading-relaxed font-light">
                    {lookAlike.howToTellApart}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
