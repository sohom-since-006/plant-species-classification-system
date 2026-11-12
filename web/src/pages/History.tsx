import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { ConfidenceRing } from '@/components/ui/ConfidenceRing';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight, Clock, Camera, Info, X, Trash2 } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { CountUp } from '@/components/motion/CountUp';
import { useHistoryService } from '@/features/history/useHistoryService';
import { useSession } from '@/features/auth/useSession';
import { getSpeciesById } from '@/services/speciesService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/components/ui/useToast';

export function History() {
  const { user } = useSession();
  const { showToast } = useToast();
  const { predictions, isLoading, deletePrediction, clearHistory } = useHistoryService();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = useMemo(() => {
    return predictions.map((pred) => {
      const sp = pred.speciesId !== null ? getSpeciesById(pred.speciesId) : undefined;
      const regional = [sp?.namesHindi, sp?.namesBengali].filter(Boolean).join(' • ');
      return {
        id: pred.id,
        timestamp: new Date(pred.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        commonName: sp?.commonName || pred.speciesName || 'Botanical Specimen',
        scientificName: sp?.scientificName || 'Plantae',
        regionalNames: regional,
        confidence: pred.confidence,
        tier: pred.tier,
        family: sp?.family || 'Plantae',
        organ: 'Specimen Scan',
        imageUrl:
          pred.imagePath ||
          sp?.referenceImages?.[0] ||
          'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=400&q=80',
        slug: sp?.slug,
      };
    });
  }, [predictions]);

  // Dynamic KPI Stats
  const avgConfidence = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, curr) => acc + curr.confidence, 0);
    return (sum / items.length) * 100;
  }, [items]);

  const uniqueFamilies = useMemo(() => {
    const fams = new Set(items.map((i) => i.family).filter((f) => f && f !== 'Plantae'));
    return fams.size;
  }, [items]);

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deletePrediction(id);
      showToast('Record removed from history.');
    } catch {
      showToast('Could not delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmClear = async () => {
    try {
      await clearHistory();
      setShowClearConfirm(false);
      showToast('Identification log cleared.');
    } catch {
      showToast('Could not clear history.');
    }
  };

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Hero */}
      <PageHero
        badge="BOTANICAL FIELD LOG"
        title="Identification History"
        italicSubtitle="Your Personal Herbarium"
        description={
          user
            ? 'Review past classifications synced securely to your cloud account. User photos are stored only if opted in; botanical metadata is synced with strict Row Level Security.'
            : 'Review past plant classifications saved securely in your browser cache. All inference logs and photos are strictly on-device, preserving full field privacy.'
        }
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-8">
        {/* KPI Summary Strip */}
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StaggerItem>
            <div className="liquid-glass rounded-2xl p-4 text-center" data-glow="">
              <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                Total Scans
              </p>
              <p className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)] mt-1">
                <CountUp value={items.length} />
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="liquid-glass rounded-2xl p-4 text-center" data-glow="">
              <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                Avg. Confidence
              </p>
              <p className="font-heading italic text-3xl sm:text-4xl text-[var(--accent)] mt-1">
                {items.length > 0 ? (
                  <>
                    <CountUp value={avgConfidence} decimals={1} />%
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="liquid-glass rounded-2xl p-4 text-center" data-glow="">
              <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                Families
              </p>
              <p className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)] mt-1">
                <CountUp value={uniqueFamilies} />
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="liquid-glass rounded-2xl p-4 text-center" data-glow="">
              <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                Storage
              </p>
              <p className="font-heading italic text-2xl sm:text-3xl text-[var(--fg)] mt-2">
                {user && isSupabaseConfigured ? 'Cloud Sync' : 'Local Device'}
              </p>
            </div>
          </StaggerItem>
        </Stagger>

        {/* Action bar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Logged Identifications ({items.length})
            </p>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              data-glow=""
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--danger)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Log
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && items.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="liquid-glass-strong rounded-2xl p-5 h-24 animate-pulse bg-white/5"
              />
            ))}
          </div>
        )}

        {/* History items */}
        {items.length > 0 ? (
          <Stagger className="space-y-4">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <div
                  data-glow=""
                  className="liquid-glass-strong rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[var(--glass-edge-hi)] transition-colors relative group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-[var(--glass-edge-mid)]">
                      <img
                        src={item.imageUrl}
                        alt={item.commonName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase text-[var(--accent)]">
                          {item.family}
                        </span>
                        <span className="text-xs text-[var(--fg-subtle)]">•</span>
                        <span className="text-[11px] font-mono text-[var(--fg-subtle)]">
                          {item.organ}
                        </span>
                      </div>
                      <h3 className="font-heading italic text-2xl text-[var(--fg)]">
                        {item.commonName}
                      </h3>
                      <p className="font-heading italic text-xs text-[var(--fg-muted)]">
                        {item.scientificName}
                      </p>
                      {item.regionalNames && (
                        <p className="font-body text-[11px] text-[var(--accent)] mt-0.5">
                          {item.regionalNames}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[var(--fg-subtle)]">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--glass-edge-mid)]">
                    <div className="text-right">
                      <p className="text-[10px] font-mono uppercase text-[var(--fg-subtle)]">
                        Confidence
                      </p>
                      <div className="mt-1">
                        <ConfidenceRing
                          value={item.confidence}
                          tier={item.tier === 'high' || item.tier === 'medium' || item.tier === 'low' ? item.tier : 'high'}
                          size={48}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.slug ? (
                        <Link
                          to={`/species/${item.slug}`}
                          className="liquid-glass px-3.5 py-1.5 rounded-full text-xs font-mono text-[var(--fg)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
                        >
                          Monograph <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          to="/classify"
                          className="liquid-glass px-3.5 py-1.5 rounded-full text-xs font-mono text-[var(--fg)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
                        >
                          Rescan <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}

                      {/* Delete individual row */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        disabled={deletingId === item.id}
                        title="Delete this record"
                        className="p-2 rounded-full text-white/40 hover:text-[var(--danger)] hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        ) : !isLoading ? (
          <div className="liquid-glass rounded-3xl p-12 text-center space-y-4">
            <Camera className="w-10 h-10 text-[var(--fg-subtle)] mx-auto" />
            <h3 className="font-heading italic text-2xl text-[var(--fg)]">
              No History Recorded Yet
            </h3>
            <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
              Scan plants using your camera or upload photos. All classifications are safely recorded in your herbarium log.
            </p>
            <div className="pt-2">
              <Link to="/classify">
                <SolidButton className="text-xs px-5 py-2">
                  Start Your First Scan
                </SolidButton>
              </Link>
            </div>
          </div>
        ) : null}

        {/* Safety Disclaimer */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Safety Disclaimer:</strong> Historic predictions reflect probabilistic neural classifications from specific photos. Do not consume, forage, or harvest plants based on automated predictions.
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Clear History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="liquid-glass-strong rounded-2xl p-6 max-w-sm w-full space-y-4 border border-rose-500/30">
            <h3 className="font-heading italic text-xl text-white">Clear All History?</h3>
            <p className="text-xs text-white/70 leading-relaxed font-body">
              This will permanently delete all saved identification logs from your account and device. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="liquid-glass px-4 py-2 rounded-xl text-xs text-white/80 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
