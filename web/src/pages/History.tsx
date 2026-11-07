import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { ConfidenceRing } from '@/components/ui/ConfidenceRing';
import { SolidButton } from '@/components/ui/SolidButton';
import { ArrowUpRight, Clock, Camera, Info, X } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { CountUp } from '@/components/motion/CountUp';

const INITIAL_HISTORY = [
  {
    id: 'scan-1',
    timestamp: 'Today, 14:22',
    commonName: 'Chinese Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    confidence: 0.94,
    family: 'Malvaceae',
    organ: 'Flower',
    imageUrl:
      'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=400&q=80',
  },
  {
    id: 'scan-2',
    timestamp: 'Yesterday, 09:15',
    commonName: 'Holy Basil (Tulsi)',
    scientificName: 'Ocimum tenuiflorum',
    confidence: 0.88,
    family: 'Lamiaceae',
    organ: 'Leaf',
    imageUrl:
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&q=80',
  },
  {
    id: 'scan-3',
    timestamp: 'Oct 30, 16:40',
    commonName: 'Swiss Cheese Plant',
    scientificName: 'Monstera deliciosa',
    confidence: 0.96,
    family: 'Araceae',
    organ: 'Foliage',
    imageUrl:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&q=80',
  },
  {
    id: 'scan-4',
    timestamp: 'Oct 28, 11:05',
    commonName: 'Rubber Fig',
    scientificName: 'Ficus elastica',
    confidence: 0.91,
    family: 'Moraceae',
    organ: 'Bark & Leaf',
    imageUrl:
      'https://images.unsplash.com/photo-1604762524889-3e2fccbc95f8?w=400&q=80',
  },
];

export function History() {
  const [items, setItems] = useState(INITIAL_HISTORY);

  const clearHistory = () => {
    setItems([]);
  };

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL FIELD LOG"
        title="Identification History"
        italicSubtitle="Your Personal Herbarium"
        description="Review past plant classifications saved securely in your browser cache. All inference logs and photos are strictly on-device, preserving full field privacy."
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
                    <CountUp value={92.2} decimals={1} />%
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
                <CountUp value={items.length > 0 ? 4 : 0} />
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="liquid-glass rounded-2xl p-4 text-center" data-glow="">
              <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                Storage
              </p>
              <p className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)] mt-1">
                Local
              </p>
            </div>
          </StaggerItem>
        </Stagger>

        {/* Action bar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Recent Identifications ({items.length})
            </p>
            <button
              type="button"
              onClick={clearHistory}
              data-glow=""
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--danger)] hover:opacity-80 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
              Clear Log
            </button>
          </div>
        )}

        {/* History items */}
        {items.length > 0 ? (
          <Stagger className="space-y-4">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <div
                  data-glow=""
                  className="liquid-glass-strong rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[var(--glass-edge-hi)] transition-colors"
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
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[var(--fg-subtle)]">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--glass-edge-mid)]">
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase text-[var(--fg-subtle)]">
                      Confidence
                    </p>
                    <div className="mt-1">
                      <ConfidenceRing
                        value={item.confidence}
                        tier="high"
                        size={48}
                      />
                    </div>
                  </div>
                  <Link
                    to="/classify"
                    className="liquid-glass px-3.5 py-1.5 rounded-full text-xs font-mono text-[var(--fg)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
                  >
                    Rescan <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        ) : (
          <div className="liquid-glass rounded-3xl p-12 text-center space-y-4">
            <Camera className="w-10 h-10 text-[var(--fg-subtle)] mx-auto" />
            <h3 className="font-heading italic text-2xl text-[var(--fg)]">
              No History Recorded Yet
            </h3>
            <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
              Scan plants using your camera or upload images. All classifications are safely recorded in your personal browser session.
            </p>
            <div className="pt-2">
              <Link to="/classify">
                <SolidButton className="text-xs px-5 py-2">
                  Start Your First Scan
                </SolidButton>
              </Link>
            </div>
          </div>
        )}

        {/* Safety Disclaimer */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Safety Disclaimer:</strong> Historic predictions reflect probabilistic neural classifications from specific photos. Do not consume, forage, or harvest plants based on automated predictions.
          </p>
        </div>
      </div>
    </div>
  );
}
