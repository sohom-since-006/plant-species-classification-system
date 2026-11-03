import type { Tier } from '@/types/prediction';

export type ConfidenceRingProps = {
  value: number; // 0 to 1
  tier: Tier;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
};

const tierColors: Record<Tier, string> = {
  high: '#6EE7A8',
  medium: '#F5C26B',
  low: '#F27C7C',
  unknown: 'rgba(255,255,255,0.4)',
};

export function ConfidenceRing({
  value,
  tier,
  size = 80,
  strokeWidth = 6,
  className = '',
  showLabel,
}: ConfidenceRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percentInt = Math.round(clamped * 100);

  // Geometry
  const effectiveStroke = strokeWidth ?? Math.max(3, Math.round(size * 0.08));
  const radius = (size - effectiveStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clamped * circumference;

  // Prevent round caps from colliding at high percentages (e.g. 93-99%)
  const isNearFull = strokeDashoffset < effectiveStroke * 1.8;
  const isFull = clamped >= 0.99;
  const linecap = isFull || isNearFull ? 'butt' : 'round';

  // Typography scaling
  const showTextLabel = showLabel ?? size >= 90;
  const numberFontSize = Math.max(12, Math.round(size * (showTextLabel ? 0.24 : 0.3)));
  const percentFontSize = Math.max(9, Math.round(numberFontSize * 0.65));
  const labelFontSize = Math.max(8, Math.round(size * 0.11));

  const color = tierColors[tier] || tierColors.high;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percentInt}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percentInt}% confidence`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 block"
        style={{ overflow: 'visible' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={effectiveStroke}
          fill="none"
        />

        {/* Animated fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={effectiveStroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={linecap}
          fill="none"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 ${Math.max(2, size * 0.05)}px ${color}40)`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none leading-none px-1">
        <div
          className="flex items-baseline justify-center font-body font-semibold tracking-tight text-white"
          style={{ fontSize: numberFontSize }}
        >
          <span>{percentInt}</span>
          <span
            className="font-normal opacity-80"
            style={{ fontSize: percentFontSize, marginLeft: '1px' }}
          >
            %
          </span>
        </div>

        {showTextLabel && (
          <span
            className="font-mono uppercase tracking-wider text-[var(--fg-subtle)] mt-1"
            style={{ fontSize: labelFontSize }}
          >
            Confidence
          </span>
        )}
      </div>
    </div>
  );
}
