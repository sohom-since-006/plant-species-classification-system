import type { Tier } from '@/types/prediction';

export type TierBadgeProps = {
  tier: Tier;
  className?: string;
};

const tierConfig: Record<Tier, { label: string; colorClass: string }> = {
  high: { label: 'High', colorClass: 'bg-[var(--accent)]' },
  medium: { label: 'Medium', colorClass: 'bg-[var(--warn)]' },
  low: { label: 'Low', colorClass: 'bg-[var(--danger)]' },
  unknown: { label: 'Unknown', colorClass: 'bg-neutral-500' },
};

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const config = tierConfig[tier];
  return (
    <span
      className={`liquid-glass rounded-full px-3 py-1 text-[11px] font-body font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${className}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full ${config.colorClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

