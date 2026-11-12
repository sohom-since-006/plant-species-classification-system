import { lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowUpRight, Info, Leaf, AlertTriangle, ExternalLink } from '@/components/icons';
import { useSpeciesDetailQuery } from '@/features/species/useSpeciesQueries';

const DistributionPanel = lazy(() => import('@/features/distribution/DistributionPanel'));

export function SpeciesDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useSpeciesDetailQuery(slug);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 space-y-8 text-[var(--fg)]">
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.species) {
    return (
      <div className="max-w-xl mx-auto px-6 py-28 text-center space-y-4 text-[var(--fg)]">
        <h2 className="font-heading italic text-3xl">Species Not Found</h2>
        <p className="text-xs text-[var(--fg-muted)]">
          The requested botanical monograph could not be retrieved from the catalog.
        </p>
        <div className="pt-4">
          <Link to="/explore">
            <SolidButton className="text-xs px-5 py-2">Return to Catalog</SolidButton>
          </Link>
        </div>
      </div>
    );
  }

  const { species, lookAlikes } = data;
  const regionalNames = [species.namesHindi, species.namesBengali].filter(Boolean).join(' • ');

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge={`TAXONOMY / ${species.family.toUpperCase()}`}
        title={species.commonName}
        italicSubtitle={species.scientificName}
        description={species.description}
      >
        {regionalNames && (
          <p className="text-sm font-medium text-[var(--accent)] font-body text-center -mt-2">
            Regional Names: {regionalNames}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <Link to="/classify">
            <SolidButton className="text-xs px-5 py-2">
              Scan This Plant <ArrowUpRight className="w-3.5 h-3.5" />
            </SolidButton>
          </Link>
          <Link
            to="/explore"
            className="liquid-glass text-xs font-mono px-5 py-2 rounded-full text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
          >
            ← Back to Archive
          </Link>
          {species.wikipediaUrl && (
            <a
              href={species.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass text-xs font-mono px-4 py-2 rounded-full text-white/70 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              Wikipedia <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </PageHero>

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-12">
        {/* Specimen Media & Taxonomy overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="w-full h-96 rounded-3xl overflow-hidden bg-black/40 border border-[var(--glass-edge-mid)] relative">
            <img
              src={species.referenceImages?.[0] || '/species/neutral_leaf.svg'}
              alt={species.commonName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/species/neutral_leaf.svg';
              }}
            />
            {species.isToxic && (
              <div className="absolute top-4 left-4 bg-rose-500/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Toxic Specimen</span>
              </div>
            )}
            {species.imageCredit && (
              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-[var(--fg-subtle)] flex items-center gap-1.5 border border-white/10 max-w-[90%] truncate">
                <span className="truncate">Photo: {species.imageCredit.observer || 'Dataset observation'}</span>
                {species.imageCredit.license && <span className="shrink-0">• {species.imageCredit.license}</span>}
                {species.imageCredit.source_url && (
                  <a
                    href={species.imageCredit.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[var(--accent)] hover:underline ml-0.5 inline-flex items-center shrink-0"
                    aria-label="View source observation"
                  >
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="liquid-glass-strong rounded-3xl p-8 space-y-6">
            <h2 className="font-heading italic text-2xl text-[var(--fg)]">
              Taxonomic Classification
            </h2>

            <dl className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Family</dt>
                <dd className="text-[var(--fg)] font-semibold">{species.family}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Genus</dt>
                <dd className="text-[var(--fg)] font-semibold italic">{species.genus}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Plant Type</dt>
                <dd className="text-[var(--accent)] font-semibold capitalize">{species.plantType}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Origin</dt>
                <dd className="text-[var(--fg)] font-semibold capitalize">{species.origin}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Habitat</dt>
                <dd className="text-[var(--fg)] font-semibold max-w-[200px] text-right truncate">
                  {species.habitat || 'Tropical and subtropical zones'}
                </dd>
              </div>
              <div className="flex justify-between pb-1">
                <dt className="text-[var(--fg-subtle)]">Distribution</dt>
                <dd className="text-[var(--fg)] font-semibold max-w-[200px] text-right truncate">
                  {species.distribution || 'Subcontinental flora'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Identifying Features */}
        {species.identifyingFeatures && species.identifyingFeatures.length > 0 && (
          <div className="liquid-glass rounded-3xl p-8 space-y-4">
            <h3 className="font-heading italic text-2xl text-[var(--fg)]">
              Morphological &amp; Identifying Features
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body text-[var(--fg-muted)]">
              {species.identifyingFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent)] text-base leading-none">•</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Traditional Uses & Care Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {species.uses && species.uses.length > 0 && (
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4">
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Traditional Uses</h3>
              <ul className="space-y-2 text-xs font-body text-[var(--fg-muted)]">
                {species.uses.map((u, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {species.careTips && species.careTips.length > 0 && (
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4">
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Cultivation &amp; Care</h3>
              <ul className="space-y-2 text-xs font-body text-[var(--fg-muted)]">
                {species.careTips.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Toxicity / Safety Notice */}
        {species.isToxic ? (
          <div className="rounded-3xl p-6 bg-rose-500/10 border border-rose-500/30 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-heading italic text-lg text-rose-300">Toxicity Warning</h4>
              <p className="text-xs font-body text-rose-200/90 leading-relaxed">
                {species.toxicityNote}
              </p>
            </div>
          </div>
        ) : species.toxicityNote ? (
          <div className="liquid-glass rounded-3xl p-6 border border-[var(--glass-edge-mid)] flex items-start gap-4">
            <Info className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-heading italic text-lg text-[var(--fg)]">Safety &amp; Edibility Profile</h4>
              <p className="text-xs font-body text-[var(--fg-muted)] leading-relaxed">
                {species.toxicityNote}
              </p>
            </div>
          </div>
        ) : null}

        {/* Fun Fact */}
        {species.funFact && (
          <div className="liquid-glass rounded-2xl p-6 border-l-4 border-[var(--accent)]">
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
              Botanical Fact
            </p>
            <p className="mt-1 text-xs font-body italic text-[var(--fg)] leading-relaxed">
              &ldquo;{species.funFact}&rdquo;
            </p>
          </div>
        )}

        {/* Look-alikes comparison */}
        {lookAlikes && lookAlikes.length > 0 && (
          <div className="liquid-glass rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-heading italic text-2xl text-[var(--fg)]">
                Diagnostic Look-alikes &amp; Confusions
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lookAlikes.map((item) => (
                <div
                  key={item.id}
                  className="liquid-glass-strong rounded-2xl p-5 space-y-2 border border-[var(--glass-edge-mid)]"
                >
                  <h4 className="font-heading italic text-lg text-[var(--fg)]">
                    {item.species.commonName} ({item.species.scientificName})
                  </h4>
                  <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                    {item.distinction}
                  </p>
                  <Link
                    to={`/species/${item.species.slug}`}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline pt-1"
                  >
                    View look-alike monograph →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Where It's Found - Coarse Occurrence Distribution */}
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
            <DistributionPanel speciesId={species.id} />
          </Suspense>
        </div>

        {/* Safety & Medicinal Disclaimer per Rule 8 */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Botanical Safety Disclaimer:</strong>{' '}
            Morphological profiles are for taxonomic identification purposes only. Never ingest, apply, or use any wild or cultivated species medicinally without consulting a certified pharmacologist or healthcare provider.
          </p>
        </div>
      </div>
    </div>
  );
}
