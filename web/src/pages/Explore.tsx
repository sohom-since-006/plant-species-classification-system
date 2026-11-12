import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { ArrowUpRight, Search, Info, AlertTriangle } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { useSpeciesListQuery } from '@/features/species/useSpeciesQueries';

const CATEGORIES = [
  'All',
  'Herb',
  'Tree',
  'Shrub',
  'Climber',
  'Succulent',
  'Crop',
  'Indian',
  'Global',
];

export function Explore() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: speciesList = [], isLoading } = useSpeciesListQuery();

  const filteredSpecies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return speciesList.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        item.plantType.toLowerCase() === selectedCategory.toLowerCase() ||
        item.origin.toLowerCase() === selectedCategory.toLowerCase();

      const matchesQuery =
        !q ||
        item.commonName.toLowerCase().includes(q) ||
        item.scientificName.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q) ||
        (item.namesHindi && item.namesHindi.toLowerCase().includes(q)) ||
        (item.namesBengali && item.namesBengali.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [speciesList, selectedCategory, searchQuery]);

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL ARCHIVE"
        title="Explore Species Library"
        italicSubtitle="112 Catalogued Species"
        description="Browse the complete flora catalogue with scientific classifications, morphological traits, regional distribution, and verified reference imagery."
      >
        {/* Search input in hero */}
        <div className="w-full max-w-lg mx-auto relative mt-2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by scientific, common, or Hindi/Bengali name..."
            className="w-full liquid-glass rounded-full pl-11 pr-5 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>
      </PageHero>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-8">
        {/* Category Pills */}
        <Stagger className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <StaggerItem key={cat}>
              <button
                type="button"
                onClick={() => setSelectedCategory(cat)}
                data-glow=""
                className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] font-semibold shadow-sm'
                    : 'liquid-glass text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {cat}
              </button>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Results Counter */}
        <div className="text-center text-xs font-mono text-[var(--fg-subtle)]">
          Showing {filteredSpecies.length} of {speciesList.length} botanical species
        </div>

        {/* Species Grid */}
        {isLoading && filteredSpecies.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="liquid-glass-strong rounded-3xl h-96 animate-pulse bg-white/5"
              />
            ))}
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {filteredSpecies.map((species) => {
              const regionalNames = [species.namesHindi, species.namesBengali]
                .filter(Boolean)
                .join(' • ');

              return (
                <StaggerItem key={species.slug}>
                  <Link
                    to={`/species/${species.slug}`}
                    data-glow=""
                    className="group liquid-glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.01] hover:border-[var(--accent)] h-full"
                  >
                    {/* Image banner */}
                    <div className="relative w-full h-56 bg-black/40 overflow-hidden">
                      <img
                        src={species.referenceImages?.[0] || '/species/neutral_leaf.svg'}
                        alt={species.commonName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/species/neutral_leaf.svg';
                        }}
                      />
                      <span className="absolute top-4 right-4 liquid-glass px-3 py-1 rounded-full text-[11px] font-mono uppercase text-[var(--accent)]">
                        {species.family}
                      </span>
                      {species.isToxic && (
                        <span className="absolute bottom-3 left-3 bg-rose-500/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Toxic
                        </span>
                      )}
                    </div>

                    {/* Text content */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-heading italic text-2xl text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                          {species.commonName}
                        </h3>
                        <p className="font-heading italic text-sm text-[var(--fg-muted)]">
                          {species.scientificName}
                        </p>
                        {regionalNames && (
                          <p className="font-body text-xs text-[var(--accent)] mt-1 font-medium">
                            {regionalNames}
                          </p>
                        )}
                        <p className="mt-3 text-xs font-body text-[var(--fg-muted)] line-clamp-2 leading-relaxed">
                          {species.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--glass-edge-mid)] flex items-center justify-between text-xs font-mono text-[var(--fg-subtle)]">
                        <span className="capitalize">{species.plantType} • {species.origin}</span>
                        <span className="flex items-center gap-1 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform">
                          Monograph <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}

        {/* Botanical Safety Disclaimer */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)] mt-12">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Medicinal &amp; Botanical Disclaimer:</strong>{' '}
            Species profiles and traditional uses are catalogued for educational and botanical taxonomic reference only. Always consult a qualified medical or botanical professional prior to handling or using any plant substances.
          </p>
        </div>
      </div>
    </div>
  );
}
