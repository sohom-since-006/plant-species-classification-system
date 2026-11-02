import type { Tier } from '@/types/prediction';
import { formatPercent } from '@/lib/format';

export type ConfidenceRingProps = {
  value: number; // 0 to 1
  tier: Tier;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const tierColors: Record<Tier, string> = {
  high: 'var(--accent)',
  medium: 'var(--warn)',
  low: 'var(--danger)',
  unknown: 'rgba(255,255,255,0.4)',
};

export function ConfidenceRing({
  value,
  tier,
  size = 110,
  strokeWidth = 8,
  className = '',
}: ConfidenceRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clamped * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--glass-edge-mid)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tierColors[tier]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading italic text-2xl leading-none text-[var(--fg)]">
          {formatPercent(clamped, 0)}
        </span>
        <span className="text-[10px] font-body text-[var(--fg-subtle)] uppercase tracking-wider">
          Confidence
        </span>
      </div>
    </div>
  );
}

