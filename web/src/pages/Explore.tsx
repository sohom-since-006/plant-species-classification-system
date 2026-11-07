import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { ArrowUpRight, Search, Info } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

const SPECIES_DATA = [
  {
    slug: 'hibiscus-rosa-sinensis',
    commonName: 'Chinese Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    family: 'Malvaceae',
    origin: 'Tropical Asia',
    category: 'Flowers',
    imageUrl:
      'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=600&q=80',
    description:
      'Prized for its large, showy crimson flowers and protruding stamens. Widely cultivated across subtropical gardens.',
  },
  {
    slug: 'monstera-deliciosa',
    commonName: 'Swiss Cheese Plant',
    scientificName: 'Monstera deliciosa',
    family: 'Araceae',
    origin: 'Central America',
    category: 'Herbs',
    imageUrl:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80',
    description:
      'Famous for its glossy fenestrated leaves that adapt to low understory rainforest illumination.',
  },
  {
    slug: 'ocimum-tenuiflorum',
    commonName: 'Holy Basil (Tulsi)',
    scientificName: 'Ocimum tenuiflorum',
    family: 'Lamiaceae',
    origin: 'Indian Subcontinent',
    category: 'Herbs',
    imageUrl:
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&q=80',
    description:
      'An aromatic perennial shrub revered in traditional Ayurvedic traditions and household herb gardens.',
  },
  {
    slug: 'ficus-elastica',
    commonName: 'Rubber Fig',
    scientificName: 'Ficus elastica',
    family: 'Moraceae',
    origin: 'South & Southeast Asia',
    category: 'Trees',
    imageUrl:
      'https://images.unsplash.com/photo-1604762524889-3e2fccbc95f8?w=600&q=80',
    description:
      'Stately tree with thick, waxy oval leaves and aerial prop roots that anchor robust forest canopies.',
  },
  {
    slug: 'adansonia-digitata',
    commonName: 'African Baobab',
    scientificName: 'Adansonia digitata',
    family: 'Malvaceae',
    origin: 'Sub-Saharan Africa',
    category: 'Trees',
    imageUrl:
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80',
    description:
      'Iconic succulent tree capable of storing thousands of liters of water in its colossal swollen trunk.',
  },
  {
    slug: 'nephrolepis-exaltata',
    commonName: 'Boston Fern',
    scientificName: 'Nephrolepis exaltata',
    family: 'Lomariopsidaceae',
    origin: 'Pantropical',
    category: 'Ferns',
    imageUrl:
      'https://images.unsplash.com/photo-1596724803730-22c54f5979c1?w=600&q=80',
    description:
      'Graceful arching fronds with pinnate leaflets suited for humid understories and hanging planters.',
  },
];

const CATEGORIES = ['All', 'Flowers', 'Trees', 'Herbs', 'Ferns'];

export function Explore() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecies = SPECIES_DATA.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      item.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.family.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL ARCHIVE"
        title="Explore Species Library"
        italicSubtitle="Taxonomy & Morphology Index"
        description="Browse catalogued flora with scientific classifications, morphological traits, regional distribution, and high-fidelity reference imagery."
      >
        {/* Search input in hero */}
        <div className="w-full max-w-lg mx-auto relative mt-2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by scientific name, common name, or family..."
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
                className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${
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

        {/* Species Grid */}
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredSpecies.map((species) => (
            <StaggerItem key={species.slug}>
              <Link
                to={`/species/${species.slug}`}
                data-glow=""
                className="group liquid-glass-strong rounded-3xl overflow-hidden flex flex-col transition-all hover:scale-[1.01] hover:border-[var(--accent)] h-full"
              >
                {/* Image banner */}
                <div className="relative w-full h-56 bg-black/40 overflow-hidden">
                  <img
                    src={species.imageUrl}
                    alt={species.commonName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-4 right-4 liquid-glass px-3 py-1 rounded-full text-[11px] font-mono uppercase text-[var(--accent)]">
                    {species.family}
                  </span>
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
                    <p className="mt-3 text-xs font-body text-[var(--fg-muted)] line-clamp-2 leading-relaxed">
                      {species.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--glass-edge-mid)] flex items-center justify-between text-xs font-mono text-[var(--fg-subtle)]">
                    <span>Origin: {species.origin}</span>
                    <span className="flex items-center gap-1 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform">
                      Details <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>

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
