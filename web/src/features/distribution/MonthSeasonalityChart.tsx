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
import { formatMonthSeasonality } from './distributionUtils';
import { ChartWrapper } from '@/features/charts/ChartWrapper';
import { GlassTooltip } from '@/features/charts/GlassTooltip';
import { CHART_THEME } from '@/features/charts/chartTheme';
import { usePrefersReducedMotion } from '@/lib/motion';

export interface MonthSeasonalityChartProps {
  months: number[];
  className?: string;
}

export function MonthSeasonalityChart({ months, className = '' }: MonthSeasonalityChartProps) {
  const prefersReduced = usePrefersReducedMotion();

  const data = useMemo(() => {
    return formatMonthSeasonality(months);
  }, [months]);

  const tableColumns = [
    { key: 'month', header: 'Month' },
    { key: 'count', header: 'Recorded Sightings' },
  ];

  return (
    <ChartWrapper
      title="Sightings by month"
      ariaLabel="12-month bar chart of recorded botanical observations by month"
      note="Shows when sightings were recorded, which reflects when people photograph plants, not necessarily the flowering season."
      tableData={data as unknown as Array<Record<string, unknown>>}
      tableColumns={tableColumns}
      className={className}
    >
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: -16, bottom: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={CHART_THEME.grid.stroke}
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
            />
            <XAxis
              dataKey="shortMonth"
              stroke={CHART_THEME.axis.stroke}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.axis.fill,
                fontSize: CHART_THEME.axis.fontSize,
                fontFamily: CHART_THEME.axis.fontFamily,
              }}
            />
            <YAxis
              stroke={CHART_THEME.axis.stroke}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.axis.fill,
                fontSize: CHART_THEME.axis.fontSize,
                fontFamily: CHART_THEME.axis.fontFamily,
              }}
              allowDecimals={false}
            />
            <Tooltip
              content={<GlassTooltip unit="sightings" />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />
            <Bar
              dataKey="count"
              name="Sightings"
              fill={CHART_THEME.accent}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReduced}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default MonthSeasonalityChart;
