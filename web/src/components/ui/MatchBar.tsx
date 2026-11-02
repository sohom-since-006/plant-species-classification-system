import { formatPercent } from '@/lib/format';

export type MatchBarProps = {
  value: number; // 0 to 1
  label: string;
  className?: string;
};

export function MatchBar({ value, label, className = '' }: MatchBarProps) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <div className="flex justify-between items-center text-xs font-body">
        <span className="text-[var(--fg-muted)]">{label}</span>
        <span className="font-medium text-[var(--fg)]">{formatPercent(clamped)}</span>
      </div>
      <div className="liquid-glass h-2 rounded-full overflow-hidden w-full relative">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}

