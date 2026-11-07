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

interface EvaluationStats {
  per_class_accuracy?: Array<{ species: string; accuracy: number }>;
}

export function PerClassAccuracyChart({ className = '' }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const { data } = useQuery<EvaluationStats | null>({
    queryKey: ['model_eval_per_class_accuracy'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}models/evaluation.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const chartData = data?.per_class_accuracy;

  if (!chartData || chartData.length === 0) {
    return (
      <AvailableAfterTraining
        title="Per-Class Validation Accuracy"
        expectedSource="/models/evaluation.json"
        description="Detailed top-1 classification accuracy benchmarks evaluated on isolated test-set splits for every species."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Per-Class Validation Accuracy"
      ariaLabel="Bar chart of validation accuracy scored per botanical class"
      note="Computed on the held-out test split after PyTorch model convergence."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
            <XAxis dataKey="species" stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <YAxis stroke={CHART_THEME.axis.stroke} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} domain={[0, 1]} />
            <Tooltip content={<GlassTooltip valueFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />} />
            <Bar dataKey="accuracy" fill={CHART_THEME.accent} isAnimationActive={!prefersReduced} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default PerClassAccuracyChart;

