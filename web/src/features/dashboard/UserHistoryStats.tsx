import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { useHistoryService } from '@/features/history/useHistoryService';
import { computeUserStats } from './userStats';
import { Skeleton } from '@/components/ui/Skeleton';
import { SolidButton } from '@/components/ui/SolidButton';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Sparkles, Leaf, History, ArrowUpRight } from '@/components/icons';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}

function DarkTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) return null;
  const item = payload[0];

  const displayName =
    item.name ||
    (item.payload && typeof item.payload.name === 'string' ? item.payload.name : '') ||
    (item.payload && typeof item.payload.family === 'string' ? item.payload.family : '');

  return (
    <div className="liquid-glass-strong rounded-xl p-3 border border-white/20 shadow-xl text-xs font-mono">
      {label && <p className="text-[var(--fg-subtle)] mb-1">{label}</p>}
      <p className="text-[var(--accent)] font-semibold">
        {displayName || 'Specimens'}: {item.value}
      </p>
    </div>
  );
}

export function UserHistoryStats() {
  const { predictions, isLoading: historyLoading } = useHistoryService();

  const stats = useMemo(() => {
    return computeUserStats(predictions || []);
  }, [predictions]);

  // Loading skeleton
  if (historyLoading) {
    return (
      <div className="space-y-6" aria-busy="true" role="status" aria-label="Loading personal scan telemetry">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Zero scans in this session - Empty State
  if (stats.totalScans === 0) {
    return (
      <div className="liquid-glass-strong rounded-3xl p-8 md:p-12 border border-[var(--glass-edge-mid)] text-center space-y-6" data-glow="">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <Leaf className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="font-heading italic text-2xl text-[var(--fg)]">
            No Session Telemetry Yet
          </h2>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
            You haven't saved any botanical classifications in this browser session yet. Scan a plant or test one of the sample specimens to see real-time session telemetry.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/classify">
            <SolidButton className="text-xs px-6 py-2.5">
              <Sparkles className="w-4 h-4" />
              Classify Your First Specimen
            </SolidButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <h2 className="font-heading italic text-2xl text-[var(--fg)] flex items-center gap-2.5">
            <History className="w-6 h-6 text-[var(--accent)]" />
            Personal Field Telemetry
          </h2>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Aggregated diagnostics from your saved botanical specimen verifications.
          </p>
        </div>
        <Link
          to="/history"
          className="liquid-glass text-xs font-mono px-4 py-1.5 rounded-full text-[var(--accent)] hover:text-white flex items-center gap-1 self-start sm:self-auto transition-colors"
        >
          View Field Journal <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="liquid-glass-strong rounded-2xl p-5 border border-white/10" data-glow="">
            <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">Total Scans</p>
            <p className="font-heading italic text-3xl sm:text-4xl text-[var(--accent)] mt-2">
              {stats.totalScans}
            </p>
            <p className="text-[11px] font-mono text-[var(--fg-muted)] mt-1">Recorded verifications</p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="liquid-glass-strong rounded-2xl p-5 border border-white/10" data-glow="">
            <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">Avg Confidence</p>
            <p className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)] mt-2">
              {stats.avgConfidence}%
            </p>
            <p className="text-[11px] font-mono text-[var(--fg-muted)] mt-1">Across all specimens</p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="liquid-glass-strong rounded-2xl p-5 border border-white/10" data-glow="">
            <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">High Confidence</p>
            <p className="font-heading italic text-3xl sm:text-4xl text-emerald-400 mt-2">
              {stats.highConfidenceRatio}%
            </p>
            <p className="text-[11px] font-mono text-[var(--fg-muted)] mt-1">&gt;85% calibrated tier</p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="liquid-glass-strong rounded-2xl p-5 border border-white/10" data-glow="">
            <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">Species Diversity</p>
            <p className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)] mt-2">
              {stats.uniqueSpeciesCount}
            </p>
            <p className="text-[11px] font-mono text-[var(--fg-muted)] mt-1">Unique flora cataloged</p>
          </div>
        </StaggerItem>
      </Stagger>

      {/* Grid of Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Split Donut */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading italic text-lg text-[var(--fg)]">Confidence Tier Split</h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Proportion of high, medium, low, and rejected predictions.
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.tierSplit}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {stats.tierSplit.map((entry) => (
                    <Cell key={`cell-${entry.tier}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            {stats.tierSplit.map((t) => (
              <div key={t.tier} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-[var(--fg-muted)] truncate">{t.label}:</span>
                <span className="text-[var(--fg)] font-semibold">{t.count} ({t.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scans Over Time Area Chart */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading italic text-lg text-[var(--fg)]">Scans Over Time</h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Daily frequency of specimen classifications recorded in your field log.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scanGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] font-mono text-[var(--fg-subtle)] text-right pt-2 border-t border-white/10">
            {stats.timeline.length} active observation date(s)
          </p>
        </div>

        {/* Top Species Frequency */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading italic text-lg text-[var(--fg)]">Most Scanned Species</h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Taxa you have encountered and verified most frequently.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topSpecies} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Identifications" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] font-mono text-[var(--fg-subtle)] pt-2 border-t border-white/10">
            Top {stats.topSpecies.length} most prevalent species
          </p>
        </div>

        {/* Family Breakdown */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading italic text-lg text-[var(--fg)]">Botanical Families</h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Distribution of plant families in your personal collection.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.familyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="family" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Specimens" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] font-mono text-[var(--fg-subtle)] pt-2 border-t border-white/10">
            Coverage across {stats.familyBreakdown.length} distinct botanical families
          </p>
        </div>
      </div>
    </div>
  );
}
