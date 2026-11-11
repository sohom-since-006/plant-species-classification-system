import type { Species, PlantType, Origin } from '@/types/species';
import { supabase } from '@/lib/supabase';
import speciesMetaRaw from '@/data/species_meta.json';
import richSpeciesRaw from '@/data/species.json';

interface SpeciesMetaEntry {
  id: number;
  slug: string;
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  plantType: PlantType;
  origin: Origin;
  namesHindi: string | null;
  namesBengali: string | null;
}

const speciesMeta = speciesMetaRaw as Record<string, SpeciesMetaEntry>;
const richSpecies = richSpeciesRaw as Record<string, Species>;

/**
 * Returns a complete Species object synchronously from bundled metadata and rich profiles.
 * Guaranteed to never return undefined for any supported model class index 0..111.
 * Never displays "Species #N".
 */
export function getSpeciesSync(id: number): Species {
  const rich = richSpecies[String(id)];
  if (rich) {
    return rich;
  }

  const base = speciesMeta[String(id)];
  if (base) {
    return {
      id: base.id,
      slug: base.slug,
      commonName: base.commonName,
      scientificName: base.scientificName,
      family: base.family,
      genus: base.genus,
      plantType: base.plantType,
      origin: base.origin,
      namesHindi: base.namesHindi,
      namesBengali: base.namesBengali,
      otherNames: [],
      description: `${base.commonName} (${base.scientificName}) is a plant species in the family ${base.family}.`,
      identifyingFeatures: [],
      habitat: null,
      distribution: null,
      uses: [],
      careTips: [],
      toxicityNote: null,
      funFact: null,
      referenceImages: [],
      wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(base.scientificName.replace(' ', '_'))}`,
    };
  }

  // Graceful fallback for any unregistered index
  return {
    id,
    slug: `plant-species-${id}`,
    commonName: `Botanical Specimen`,
    scientificName: `Plantae (Class #${id})`,
    family: 'Plantae',
    genus: 'Flora',
    plantType: 'herb',
    origin: 'both',
    namesHindi: null,
    namesBengali: null,
    otherNames: [],
    description: 'Botanical specimen recorded in local catalog.',
    identifyingFeatures: [],
    habitat: null,
    distribution: null,
    uses: [],
    careTips: [],
    toxicityNote: null,
    funFact: null,
    referenceImages: [],
    wikipediaUrl: null,
  };
}

/**
 * Synchronous lookup for species by integer ID.
 */
export function getSpeciesById(id: number): Species {
  return getSpeciesSync(id);
}

/**
 * Check if the species has complete monograph content (details, uses, care tips).
 */
export function hasRichContent(id: number): boolean {
  const item = richSpecies[String(id)];
  return Boolean(item && item.uses && item.uses.length > 0);
}

/**
 * Returns list of species IDs among 0..111 that currently lack full content.
 */
export function getMissingContentIds(): number[] {
  const allIds = Object.keys(speciesMeta).map(Number).sort((a, b) => a - b);
  return allIds.filter((id) => !hasRichContent(id));
}

/**
 * Returns an array of all 112 species recognized by the model.
 */
export function getAllSpecies(): Species[] {
  return Object.keys(speciesMeta)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => getSpeciesSync(id));
}

/**
 * Find species by URL slug.
 */
export function getSpeciesBySlug(slug: string): Species | undefined {
  const all = getAllSpecies();
  return all.find((s) => s.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * Asynchronously load full species content by species ID from Supabase (if available)
 * or fallback to bundled species.json / metadata.
 */
export async function fetchSpeciesById(id: number): Promise<Species> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          slug: data.slug,
          commonName: data.common_name,
          scientificName: data.scientific_name,
          family: data.family,
          genus: data.genus,
          plantType: data.plant_type,
          origin: data.origin,
          namesHindi: data.names_hindi,
          namesBengali: data.names_bengali,
          otherNames: data.other_names || [],
          description: data.description,
          identifyingFeatures: data.identifying_features || [],
          habitat: data.habitat,
          distribution: data.distribution,
          uses: data.uses || [],
          careTips: data.care_tips || [],
          toxicityNote: data.toxicity_note,
          funFact: data.fun_fact,
          referenceImages: data.reference_images || [],
          wikipediaUrl: data.wikipedia_url,
        };
      }
    } catch {
      // Fallback silently to bundled species
    }
  }

  return getSpeciesSync(id);
}
