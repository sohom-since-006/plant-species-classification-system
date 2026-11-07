import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { AvailableAfterTraining } from './AvailableAfterTraining';
import { ChartWrapper } from '@/features/charts/ChartWrapper';
import { GlassTooltip } from '@/features/charts/GlassTooltip';
import { CHART_THEME } from '@/features/charts/chartTheme';
import { usePrefersReducedMotion } from '@/lib/motion';

interface OriginStats {
  indian_vs_global?: Array<{ name: string; value: number }>;
}

const SPLIT_COLORS = [CHART_THEME.accent, 'rgba(56, 189, 248, 0.85)', 'rgba(251, 191, 36, 0.85)'];

export function DatasetSplitChart({ className = '' }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const { data } = useQuery<OriginStats | null>({
    queryKey: ['dataset_stats_origin_split'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/dataset_stats.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const chartData = data?.indian_vs_global;

  if (!chartData || chartData.length === 0) {
    return (
      <AvailableAfterTraining
        title="Indian vs Global Origin Split"
        expectedSource="/data/dataset_stats.json"
        description="Depicts the proportional breakdown between native Indian endemic flora and cosmopolitan/introduced botanical species."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Indian vs Global Origin Split"
      ariaLabel="Donut chart showing ratio of Indian to Global plant species"
      note="Origin breakdown classified from botanical literature records."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={!prefersReduced}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={SPLIT_COLORS[index % SPLIT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip unit="species" />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: CHART_THEME.axis.fontFamily, color: 'white' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default DatasetSplitChart;

