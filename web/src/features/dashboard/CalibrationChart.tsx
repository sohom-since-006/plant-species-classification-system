import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

interface CalibrationData {
  reliability_curve?: Array<{ bin_confidence: number; empirical_accuracy: number }>;
}

export function CalibrationChart({ className = '' }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const { data } = useQuery<CalibrationData | null>({
    queryKey: ['model_eval_calibration'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}models/calibration.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const chartData = data?.reliability_curve;

  if (!chartData || chartData.length === 0) {
    return (
      <AvailableAfterTraining
        title="Confidence Calibration Curve"
        expectedSource="/models/calibration.json"
        description="Reliability diagram showing model output confidence probabilities versus empirical ground-truth accuracy (Platt scaling verification)."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Confidence Calibration Curve"
      ariaLabel="Reliability diagram plotting predicted confidence against actual empirical accuracy"
      note="Reliability curve before and after temperature scaling calibration."
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
            <CartesianGrid stroke={CHART_THEME.grid.stroke} />
            <XAxis dataKey="bin_confidence" stroke={CHART_THEME.axis.stroke} domain={[0, 1]} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <YAxis stroke={CHART_THEME.axis.stroke} domain={[0, 1]} tick={{ fill: CHART_THEME.axis.fill, fontSize: 10 }} />
            <Tooltip content={<GlassTooltip valueFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />} />
            <Line type="monotone" dataKey="empirical_accuracy" stroke={CHART_THEME.accent} isAnimationActive={!prefersReduced} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

export default CalibrationChart;
