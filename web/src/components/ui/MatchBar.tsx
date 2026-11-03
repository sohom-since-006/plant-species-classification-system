import { formatPercent } from '@/lib/format';

export type MatchBarProps = {
  value: number; // 0 to 1
  label: string;
  className?: string;
  showDecimals?: boolean;
};

export function MatchBar({
  value,
  label,
  className = '',
  showDecimals = false,
}: MatchBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percentText = formatPercent(clamped, showDecimals ? 1 : 0);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-body text-[var(--fg-muted)] truncate mr-2">{label}</span>
        <span className="font-mono text-xs font-medium text-white shrink-0">
          {percentText}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full relative">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}
