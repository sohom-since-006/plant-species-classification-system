import type { Species, SpeciesLookAlike } from '@/types/species';
import {
  getAllSpecies,
  getSpeciesById as getSpeciesByIdService,
  getSpeciesBySlug as getSpeciesBySlugService,
} from '@/services/speciesService';

export const MOCK_SPECIES: Species[] = getAllSpecies();

export const MOCK_LOOKALIKES: SpeciesLookAlike[] = [
  {
    speciesId: 0, // Tulsi
    lookAlikeId: 97, // Sweet Basil
    howToTellApart:
      'Tulsi exhibits woody square stems with purplish hues and has a peppery, clove-forward aroma. Sweet Basil possesses tender green stems with glossy, cupped leaves and a sweet anise fragrance.',
  },
  {
    speciesId: 97, // Sweet Basil
    lookAlikeId: 0, // Tulsi
    howToTellApart:
      'Sweet Basil foliage is lighter green, softer, and broader with a sweet herbal aroma, whereas Tulsi features darker serrated leaves and a sharp pungent fragrance.',
  },
  {
    speciesId: 1, // Neem
    lookAlikeId: 9, // Curry Leaf
    howToTellApart:
      'Neem leaflets are distinctly sickle-shaped with jagged saw-toothed margins and an intensely bitter taste. Curry leaf leaflets are smaller, aromatic, slightly dentate, and savory when bruised.',
  },
  {
    speciesId: 9, // Curry Leaf
    lookAlikeId: 1, // Neem
    howToTellApart:
      'Curry leaf emits a fragrant savory kitchen aroma with smaller delicate leaflets, whereas Neem has larger, intensely bitter, curved asymmetrical leaves.',
  },
  {
    speciesId: 17, // Peepal
    lookAlikeId: 18, // Banyan
    howToTellApart:
      'Peepal leaves have an unmistakable elongated tail-like drip tip and flutter gently on long slender stalks. Banyan leaves are oval, leathery, and thicker without the long drip tip.',
  },
  {
    speciesId: 18, // Banyan
    lookAlikeId: 17, // Peepal
    howToTellApart:
      'Banyan develops massive aerial prop roots descending from horizontal limbs and produces paired scarlet figs in leaf axils. Peepal has no aerial prop roots and has dark purple figs.',
  },
  {
    speciesId: 40, // Mango
    lookAlikeId: 12, // Arjuna (Terminalia arjuna)
    howToTellApart:
      'Mango leaves have undulating wavy margins and emit a characteristic turpentine/resinous aroma when crushed, with large branched inflorescences. Arjuna leaves are oblong with two small glands at the base of the petiole.',
  },
];

export function getSpeciesById(id: number): Species | undefined {
  return getSpeciesByIdService(id);
}

export function getSpeciesBySlug(slug: string): Species | undefined {
  return getSpeciesBySlugService(slug);
}
