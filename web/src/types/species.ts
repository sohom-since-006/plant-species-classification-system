export type PlantType = 'herb' | 'shrub' | 'tree' | 'climber' | 'grass' | 'succulent' | 'aquatic' | 'crop';
export type Origin = 'indian' | 'global' | 'both';

export interface Species {
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
  otherNames: string[];
  description: string;
  identifyingFeatures: string[];
  habitat: string | null;
  distribution: string | null;
  uses: string[];
  careTips: string[];
  toxicityNote: string | null;
  funFact: string | null;
  referenceImages: string[];
  wikipediaUrl: string | null;
}

export interface SpeciesLookAlike {
  speciesId: number;
  lookAlikeId: number;
  howToTellApart: string;
  /** Joined species data for display */
  lookAlike?: Species;
}
