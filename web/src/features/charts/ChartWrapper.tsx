import type { ReactNode } from 'react';

export interface ChartTableColumn {
  key: string;
  header: string;
}

export interface ChartWrapperProps {
  title: string;
  note?: string;
  badge?: string;
  ariaLabel: string;
  tableData?: Array<Record<string, unknown>>;
  tableColumns?: ChartTableColumn[];
  children: ReactNode;
  className?: string;
}

export function ChartWrapper({
  title,
  note,
  badge,
  ariaLabel,
  tableData,
  tableColumns,
  children,
  className = '',
}: ChartWrapperProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`liquid-glass rounded-2xl p-6 border border-white/10 space-y-4 ${className}`}
      data-glow=""
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          {badge && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              {badge}
            </span>
          )}
          <h4 className="font-heading italic text-xl text-white tracking-wide">{title}</h4>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="w-full relative">{children}</div>

      {note && (
        <p className="text-[11px] font-body text-white/60 leading-relaxed italic border-t border-white/10 pt-2.5">
          {note}
        </p>
      )}

      {/* Visually hidden accessible data table for screen readers */}
      {tableData && tableColumns && tableData.length > 0 && (
        <div className="sr-only">
          <table>
            <caption>{ariaLabel}</caption>
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, rIdx) => (
                <tr key={rIdx}>
                  {tableColumns.map((col) => (
                    <td key={col.key}>{String(row[col.key] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

