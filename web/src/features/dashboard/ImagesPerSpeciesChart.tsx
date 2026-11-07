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

interface DatasetStats {
  images_per_species?: Array<{ species: string; count: number }>;
}

export function ImagesPerSpeciesChart({ className = '' }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const { data } = useQuery<DatasetStats | null>({
    queryKey: ['dataset_stats_images_per_species'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/dataset_stats.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const chartData = data?.images_per_species;

  if (!chartData || chartData.length === 0) {
    return (
      <AvailableAfterTraining
        title="Training Images per Species"
        expectedSource="/data/dataset_stats.json"
        description="Displays the distribution of validated training images collected per botanical species. Populated upon completion of Phase 3 dataset curation."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Training Images per Species"
      ariaLabel="Bar chart of training images collected per plant species"
      note="Aggregated image counts from iNaturalist research-grade dataset."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
            <XAxis dataKey="species" stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <YAxis stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <Tooltip content={<GlassTooltip unit="images" />} />
            <Bar dataKey="count" fill={CHART_THEME.accent} isAnimationActive={!prefersReduced} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default ImagesPerSpeciesChart;

