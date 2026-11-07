import type { ReactNode } from 'react';
import { BarChart } from '@/components/icons';

export interface AvailableAfterTrainingProps {
  title: string;
  expectedSource: string;
  icon?: ReactNode;
  description?: string;
  className?: string;
}

export function AvailableAfterTraining({
  title,
  expectedSource,
  icon,
  description = 'Detailed visualizations will populate here once model training and validation pipeline phases complete. In accordance with data integrity guidelines, no synthetic metrics are fabricated.',
  className = '',
}: AvailableAfterTrainingProps) {
  return (
    <div
      className={`liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-4 ${className}`}
      data-glow=""
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[var(--accent)] shrink-0">
            {icon || <BarChart className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-heading italic text-lg text-white">{title}</h4>
            <p className="text-[10px] font-mono text-white/50">Expected: {expectedSource}</p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
          Available after training
        </span>
      </div>

      <div className="py-6 text-center space-y-2">
        <div className="w-10 h-10 mx-auto rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30">
          <span className="font-mono text-xs">TBD</span>
        </div>
        <p className="text-xs font-body text-white/60 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px] font-mono text-white/40">
        <span>Artifact: {expectedSource}</span>
        <span>Awaiting Pipeline Execution</span>
      </div>
    </div>
  );
}
