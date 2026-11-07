import { useQuery } from '@tanstack/react-query';
import { AvailableAfterTraining } from './AvailableAfterTraining';
import { ChartWrapper } from '@/features/charts/ChartWrapper';

interface ConfusionMatrixData {
  classes?: string[];
  matrix?: number[][];
}

export function ConfusionMatrixChart({ className = '' }: { className?: string }) {
  const { data } = useQuery<ConfusionMatrixData | null>({
    queryKey: ['model_eval_confusion_matrix'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}models/confusion_matrix.json`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: 0,
  });

  const matrix = data?.matrix;
  const classes = data?.classes;

  if (!matrix || !classes || matrix.length === 0) {
    return (
      <AvailableAfterTraining
        title="Diagnostic Confusion Matrix"
        expectedSource="/models/confusion_matrix.json"
        description="Heatmap showing empirical classification overlap between visual look-alike pairs (e.g., Tulsi vs Sweet Basil vs Mint)."
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title="Diagnostic Confusion Matrix"
      ariaLabel="Confusion matrix showing model predictions versus true species labels"
      note="Normalized confusion density between true and predicted plant classes."
      className={className}
    >
      <div className="overflow-x-auto p-2">
        <div className="min-w-[320px] text-center text-xs font-mono text-white/60">
          Confusion matrix visualization rendered from /models/confusion_matrix.json
        </div>
      </div>
    </ChartWrapper>
  );
}

export default ConfusionMatrixChart;

