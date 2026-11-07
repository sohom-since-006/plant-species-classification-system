import { useMemo, useState } from 'react';
import type { CountryObservation, StateObservation } from '@/types/distribution';
import {
  INDIA_CARTOGRAM_TILES,
  calculateIndiaStateStats,
} from './distributionUtils';
import { ChartWrapper } from '@/features/charts/ChartWrapper';

export interface IndiaCartogramProps {
  states: StateObservation[];
  countries: CountryObservation[];
  className?: string;
}

export function IndiaCartogram({ states, countries, className = '' }: IndiaCartogramProps) {
  const [hoveredState, setHoveredState] = useState<{
    name: string;
    code: string;
    count: number;
    sharePct: string;
  } | null>(null);

  const { stateStatsMap, recordsWithState, totalIndiaRecords, maxShare } = useMemo(() => {
    return calculateIndiaStateStats(states, countries);
  }, [states, countries]);

  const tableData = useMemo(() => {
    return INDIA_CARTOGRAM_TILES.map((tile) => {
      const stat = stateStatsMap.get(tile.name);
      return {
        state: tile.name,
        code: tile.code,
        count: stat?.count ?? 0,
        share: stat?.sharePct ?? '0.0%',
      };
    });
  }, [stateStatsMap]);

  const tableColumns = [
    { key: 'state', header: 'State / Union Territory' },
    { key: 'count', header: 'Observations' },
    { key: 'share', header: 'Share of State Records' },
  ];

  const noteText = `Based on records that include a state (${recordsWithState.toLocaleString()} of ${totalIndiaRecords.toLocaleString()} India records).`;

  return (
    <ChartWrapper
      title="India Regional Cartogram"
      ariaLabel="Tile-grid cartogram of Indian states and union territories shaded by share of recorded observations"
      note={noteText}
      tableData={tableData}
      tableColumns={tableColumns}
      className={className}
    >
      <div className="space-y-4">
        {/* Dynamic Hover Inspector Banner */}
        <div className="h-10 px-4 rounded-xl liquid-glass-strong border border-white/10 flex items-center justify-between text-xs">
          {hoveredState ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)]" />
                <span className="font-heading italic text-sm text-white font-medium">
                  {hoveredState.name}
                </span>
                <span className="text-[10px] font-mono text-white/50">({hoveredState.code})</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-white/80">
                  <strong className="text-white">{hoveredState.count.toLocaleString()}</strong> records
                </span>
                <span className="text-[var(--accent)] font-semibold">
                  {hoveredState.sharePct} of regional sightings
                </span>
              </div>
            </>
          ) : (
            <span className="text-white/50 font-mono text-[11px] italic">
              Hover over any state tile to inspect regional density
            </span>
          )}
        </div>

        {/* 8x8 Tile-Grid Cartogram (Strictly no borders or map outlines) */}
        <div className="p-3 rounded-2xl liquid-glass border border-white/5 bg-black/20 overflow-x-auto">
          <div
            className="grid grid-cols-8 grid-rows-8 gap-1.5 min-w-[280px] max-w-sm mx-auto aspect-square"
            role="grid"
            aria-label="Indian States Cartogram Grid"
          >
            {INDIA_CARTOGRAM_TILES.map((tile) => {
              const stat = stateStatsMap.get(tile.name);
              const count = stat?.count ?? 0;
              const share = stat?.share ?? 0;
              const sharePct = stat?.sharePct ?? '0.0%';

              // Calculate opacity based on relative share of maxShare
              const isRecorded = count > 0;
              const normalized = maxShare > 0 ? share / maxShare : 0;
              const alpha = isRecorded
                ? Math.max(0.22, Math.min(0.96, 0.22 + normalized * 0.74))
                : 0.04;

              const tileStyle = {
                gridColumnStart: tile.col + 1,
                gridRowStart: tile.row + 1,
                backgroundColor: isRecorded
                  ? `rgba(16, 185, 129, ${alpha})`
                  : 'rgba(255, 255, 255, 0.04)',
              };

              return (
                <div
                  key={tile.code}
                  data-glow=""
                  style={tileStyle}
                  onMouseEnter={() =>
                    setHoveredState({
                      name: tile.name,
                      code: tile.code,
                      count,
                      sharePct,
                    })
                  }
                  onMouseLeave={() => setHoveredState(null)}
                  className={`relative rounded-md flex flex-col items-center justify-center cursor-pointer transition-all duration-150 select-none ${
                    isRecorded
                      ? 'text-white font-semibold hover:ring-2 hover:ring-white/80 hover:scale-105 z-10'
                      : 'text-white/30 border border-white/[0.03] hover:bg-white/10'
                  }`}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${tile.name}: ${count} observations (${sharePct})`}
                >
                  <span className="font-mono text-[10px] sm:text-xs tracking-tight">
                    {tile.code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-white/60 pt-1">
          <span className="uppercase tracking-wider">Observation Share:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-white/[0.04] border border-white/10" />
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/25" />
              <span>&lt; 5%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/60" />
              <span>5 - 15%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/95" />
              <span>&gt; 15%</span>
            </div>
          </div>
        </div>
      </div>
    </ChartWrapper>
  );
}

export default IndiaCartogram;
