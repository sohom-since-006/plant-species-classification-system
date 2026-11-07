import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { CountryObservation } from '@/types/distribution';
import { groupTopCountries } from './distributionUtils';
import { ChartWrapper } from '@/features/charts/ChartWrapper';
import { GlassTooltip } from '@/features/charts/GlassTooltip';
import { CHART_THEME } from '@/features/charts/chartTheme';
import { usePrefersReducedMotion } from '@/lib/motion';

export interface TopCountriesChartProps {
  countries: CountryObservation[];
  className?: string;
}

export function TopCountriesChart({ countries, className = '' }: TopCountriesChartProps) {
  const prefersReduced = usePrefersReducedMotion();

  const data = useMemo(() => {
    return groupTopCountries(countries, 8);
  }, [countries]);

  const tableColumns = [
    { key: 'name', header: 'Country' },
    { key: 'count', header: 'Recorded Observations' },
  ];

  return (
    <ChartWrapper
      title="Top Recorded Countries"
      ariaLabel="Ranked horizontal bar chart of top countries by recorded plant sightings"
      note="Ranked observations by country recorded on GBIF (top 8 plus combined other countries)."
      tableData={data as unknown as Array<Record<string, unknown>>}
      tableColumns={tableColumns}
      className={className}
    >
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke={CHART_THEME.grid.stroke}
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
            />
            <XAxis
              type="number"
              stroke={CHART_THEME.axis.stroke}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.axis.fill,
                fontSize: CHART_THEME.axis.fontSize,
                fontFamily: CHART_THEME.axis.fontFamily,
              }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={CHART_THEME.axis.stroke}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.axis.fill,
                fontSize: CHART_THEME.axis.fontSize,
                fontFamily: CHART_THEME.axis.fontFamily,
              }}
              width={110}
            />
            <Tooltip
              content={<GlassTooltip unit="observations" />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />
            <Bar
              dataKey="count"
              name="Observations"
              fill={CHART_THEME.accent}
              radius={[0, 4, 4, 0]}
              isAnimationActive={!prefersReduced}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default TopCountriesChart;

