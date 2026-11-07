import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AvailableAfterTraining } from './AvailableAfterTraining';
import { ChartWrapper } from '@/features/charts/ChartWrapper';
import { GlassTooltip } from '@/features/charts/GlassTooltip';
import { CHART_THEME } from '@/features/charts/chartTheme';
import { usePrefersReducedMotion } from '@/lib/motion';

interface FamilyStats {
  family_breakdown?: Array<{ family: string; count: number }>;
}

export function FamilyBreakdownChart({ className = '' }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const { data } = useQuery<FamilyStats | null>({
    queryKey: ['dataset_stats_family_breakdown'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/dataset_stats.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const chartData = data?.family_breakdown;

  if (!chartData || chartData.length === 0) {
    return (
      <AvailableAfterTraining
        title="Botanical Family Breakdown"
        expectedSource="/data/dataset_stats.json"
        description="Ranks the representation of major plant families (e.g. Lamiaceae, Fabaceae, Moraceae) across the dataset."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Botanical Family Breakdown"
      ariaLabel="Horizontal bar chart of species counts grouped by botanical family"
      note="Families represented across the curated training taxonomy."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke={CHART_THEME.grid.stroke} />
            <XAxis type="number" stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <YAxis type="category" dataKey="family" stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} width={90} />
            <Tooltip content={<GlassTooltip unit="species" />} />
            <Bar dataKey="count" fill="rgba(56, 189, 248, 0.85)" isAnimationActive={!prefersReduced} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default FamilyBreakdownChart;
