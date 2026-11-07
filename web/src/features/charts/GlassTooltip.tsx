import type { ReactNode } from 'react';

export interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string | readonly (number | string)[];
  color?: string;
  fill?: string;
  unit?: ReactNode;
  dataKey?: string | number;
}

export interface GlassTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number | ReactNode;
  unit?: string;
  valueFormatter?: (val: number | string) => string;
}

export function GlassTooltip({
  active,
  payload,
  label,
  unit = '',
  valueFormatter,
}: GlassTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="liquid-glass-strong rounded-xl p-3 border border-white/15 shadow-2xl text-xs space-y-1 min-w-[140px] pointer-events-none z-50">
      {label !== undefined && label !== null && (
        <p className="font-mono text-[11px] text-white/70 uppercase tracking-wider border-b border-white/10 pb-1">
          {label}
        </p>
      )}
      <div className="space-y-1 pt-0.5">
        {payload.map((item, index) => {
          const rawVal = item.value;
          const displayVal =
            valueFormatter && (typeof rawVal === 'number' || typeof rawVal === 'string')
              ? valueFormatter(rawVal)
              : typeof rawVal === 'number'
                ? rawVal.toLocaleString()
                : Array.isArray(rawVal)
                  ? rawVal.join(', ')
                  : String(rawVal ?? '');

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || item.fill || 'var(--accent)' }}
                />
                <span className="font-body text-white/80">{item.name || 'Count'}:</span>
              </div>
              <span className="font-mono font-semibold text-white">
                {displayVal}
                {unit && <span className="text-[10px] text-white/60 ml-0.5">{unit}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
