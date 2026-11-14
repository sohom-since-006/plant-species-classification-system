import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { ArrowUpRight, Search, Info, AlertTriangle, Leaf } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { useSpeciesListQuery } from '@/features/species/useSpeciesQueries';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { SolidButton } from '@/components/ui/SolidButton';

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
  useDocumentTitle('Explore Herbarium');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
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

  const visibleSpecies = useMemo(() => {
    return filteredSpecies.slice(0, visibleCount);
  }, [filteredSpecies, visibleCount]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setVisibleCount(24);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(24);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 24, filteredSpecies.length));
  };

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL ARCHIVE"
        title="Explore Species Library"
        italicSubtitle="150 Cataloged Species"
        description="Search across hundreds of verified specimens, regional ethnobotanical names, ecological distributions, and diagnostic morphology."
      >
        {/* Real-time search input */}
        <div className="w-full max-w-xl mx-auto mt-6 relative">
          <Search className="w-4 h-4 text-[var(--fg-subtle)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by common, scientific, Hindi or Bengali name..."
            aria-label="Search plant species"
            className="w-full liquid-glass rounded-full pl-11 pr-5 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>
      </PageHero>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-8">
        {/* Filter Categories Chips with Accessible Min-Height */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
          role="tablist"
          aria-label="Filter flora by category"
        >
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCategorySelect(category)}
                data-glow=""
                className={`px-5 py-2.5 min-h-[44px] rounded-full text-xs font-mono transition-all whitespace-nowrap shrink-0 flex items-center justify-center ${
                  isActive
                    ? 'bg-[var(--accent)] text-black font-semibold shadow-lg'
                    : 'liquid-glass text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Counter Header */}
        <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-subtle)] pt-2 border-b border-white/10 pb-3">
          <span>
            Showing {Math.min(visibleSpecies.length, filteredSpecies.length)} of {filteredSpecies.length} species
          </span>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="text-[var(--accent)] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Grid or Empty/Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="liquid-glass-strong rounded-3xl h-96 animate-pulse" />
            ))}
          </div>
        ) : filteredSpecies.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-12 border border-white/10">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--fg-subtle)]">
              <Leaf className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-heading italic text-xl text-[var(--fg)]">No specimens match your search</p>
              <p className="text-xs text-[var(--fg-muted)]">
                Try searching with a scientific genus name or resetting category filters.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="liquid-glass text-xs font-mono px-5 py-2 rounded-full text-[var(--accent)] hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <>
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {visibleSpecies.map((species) => {
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
                      {/* Image banner with fixed aspect-ratio and explicit dimensions */}
                      <div className="relative w-full h-56 aspect-[16/9] bg-black/40 overflow-hidden">
                        <img
                          src={species.referenceImages?.[0] || '/species/neutral_leaf.svg'}
                          alt={species.commonName}
                          width={400}
                          height={224}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
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

            {/* Load More Button */}
            {visibleCount < filteredSpecies.length && (
              <div className="flex justify-center pt-8">
                <SolidButton
                  onClick={handleLoadMore}
                  className="text-xs px-8 py-3 min-h-[44px]"
                >
                  Load More Species ({visibleCount} of {filteredSpecies.length})
                </SolidButton>
              </div>
            )}
          </>
        )}

        {/* Botanical Safety Disclaimer */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)] mt-12">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Medicinal &amp; Botanical Disclaimer:</strong>{' '}
            Species profiles and traditional uses are cataloged for educational and botanical taxonomic reference only. Always consult a qualified medical or botanical professional prior to handling or using any plant substances.
          </p>
        </div>
      </div>
    </div>
  );
}
