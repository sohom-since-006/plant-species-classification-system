import { lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowUpRight, Info, Leaf } from '@/components/icons';
import { MOCK_SPECIES } from '@/data/mockSpecies';

const DistributionPanel = lazy(() => import('@/features/distribution/DistributionPanel'));

type SpeciesDetailData = {
  commonName: string;
  scientificName: string;
  family: string;
  order: string;
  origin: string;
  habitat: string;
  sunlight: string;
  water: string;
  imageUrl: string;
  description: string;
  lookAlikes: { name: string; distinction: string }[];
};

const DEFAULT_SPECIES: SpeciesDetailData = {
  commonName: 'Chinese Hibiscus',
  scientificName: 'Hibiscus rosa-sinensis',
  family: 'Malvaceae',
  order: 'Malvales',
  origin: 'Vanuatu & Tropical Asia',
  habitat: 'Tropical and subtropical lowlands',
  sunlight: 'Full direct sunlight (6+ hours)',
  water: 'Consistent moisture, well-draining soil',
  imageUrl:
    'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=800&q=80',
  description:
    'A flamboyant evergreen flowering shrub renowned globally for its large, trumpet-shaped blossoms. Features glossy ovate leaves with serrated margins and an elongated staminal column typical of Malvaceae.',
  lookAlikes: [
    {
      name: 'Hibiscus syriacus (Rose of Sharon)',
      distinction: 'Deciduous shrub, hardier in colder climates with lobed leaves.',
    },
    {
      name: 'Malvaviscus arboreus (Turk’s Cap)',
      distinction: 'Blossoms remain tightly closed and pendulous.',
    },
  ],
};

const SPECIES_CATALOG: Record<string, SpeciesDetailData> = {
  'hibiscus-rosa-sinensis': DEFAULT_SPECIES,
  'monstera-deliciosa': {
    commonName: 'Swiss Cheese Plant',
    scientificName: 'Monstera deliciosa',
    family: 'Araceae',
    order: 'Alismatales',
    origin: 'Tropical rainforests of Southern Mexico',
    habitat: 'Humid rainforest understory',
    sunlight: 'Bright indirect light',
    water: 'Allow top 5 cm of soil to dry between waterings',
    imageUrl:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&q=80',
    description:
      'An epiphytic climbing vine that develops large perforated leaves (fenestrations) allowing light and heavy rain winds to pass through without tearing the foliage.',
    lookAlikes: [
      {
        name: 'Monstera adansonii',
        distinction: 'Significantly smaller leaves with enclosed oval holes.',
      },
      {
        name: 'Epipremnum pinnatum (Cebu Blue)',
        distinction: 'Narrower leaf blade with pinnate incisions.',
      },
    ],
  },
  'ocimum-tenuiflorum': {
    commonName: 'Holy Basil (Tulsi)',
    scientificName: 'Ocimum tenuiflorum',
    family: 'Lamiaceae',
    order: 'Lamiales',
    origin: 'Indian Subcontinent & Southeast Asia',
    habitat: 'Tropical warm plains, sacred herb gardens',
    sunlight: 'Full morning to afternoon sun',
    water: 'Moderate regular watering',
    imageUrl:
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&q=80',
    description:
      'An erect, much-branched subshrub with green or purple ovate serrated leaves and pungent fragrant essential oils containing eugenol.',
    lookAlikes: [
      {
        name: 'Ocimum basilicum (Sweet Basil)',
        distinction: 'Leaves are smoother, glossier, and sweeter in scent without hairy stems.',
      },
      {
        name: 'Ocimum gratissimum (African Basil)',
        distinction: 'Coarser, larger foliage with strong clove-like aroma.',
      },
    ],
  },
};

export function SpeciesDetail() {
  const { slug } = useParams<{ slug: string }>();

  const species = (slug && SPECIES_CATALOG[slug]) || DEFAULT_SPECIES;
  const matchedMock = MOCK_SPECIES.find(
    (s) => s.slug === slug || s.scientificName.toLowerCase() === species.scientificName.toLowerCase(),
  );

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge={`TAXONOMY / ${species.family.toUpperCase()}`}
        title={species.commonName}
        italicSubtitle={species.scientificName}
        description={species.description}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
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
        </div>
      </PageHero>

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-12">
        {/* Specimen Media & Taxonomy overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="w-full h-96 rounded-3xl overflow-hidden bg-black/40 border border-[var(--glass-edge-mid)]">
            <img
              src={species.imageUrl}
              alt={species.commonName}
              className="w-full h-full object-cover"
            />
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
                <dt className="text-[var(--fg-subtle)]">Order</dt>
                <dd className="text-[var(--fg)] font-semibold">{species.order}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Native Origin</dt>
                <dd className="text-[var(--fg)] font-semibold">{species.origin}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Natural Habitat</dt>
                <dd className="text-[var(--fg)] font-semibold">{species.habitat}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-edge-mid)] pb-2">
                <dt className="text-[var(--fg-subtle)]">Light Requirement</dt>
                <dd className="text-[var(--accent)] font-semibold">{species.sunlight}</dd>
              </div>
              <div className="flex justify-between pb-1">
                <dt className="text-[var(--fg-subtle)]">Moisture Regime</dt>
                <dd className="text-[var(--accent)] font-semibold">{species.water}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Look-alikes comparison */}
        <div className="liquid-glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-heading italic text-2xl text-[var(--fg)]">
              Diagnostic Look-alikes &amp; Confusions
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {species.lookAlikes.map((item) => (
              <div
                key={item.name}
                className="liquid-glass-strong rounded-2xl p-5 space-y-2 border border-[var(--glass-edge-mid)]"
              >
                <h4 className="font-heading italic text-lg text-[var(--fg)]">
                  {item.name}
                </h4>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                  {item.distinction}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Where It's Found - Coarse Occurrence Distribution */}
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
            <DistributionPanel speciesId={matchedMock?.id} />
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
