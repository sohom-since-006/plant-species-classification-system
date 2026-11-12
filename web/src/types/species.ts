export type PlantType = 'herb' | 'shrub' | 'tree' | 'climber' | 'grass' | 'succulent' | 'aquatic' | 'crop' | 'epiphyte';
export type Origin = 'indian' | 'global' | 'both';

export interface SpeciesSource {
  name: string;
  url: string;
}

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
  isToxic?: boolean;
  funFact: string | null;
  referenceImages: string[];
  imageCredit?: {
    observer?: string;
    license?: string;
    source_url?: string;
  } | null;
  wikipediaUrl: string | null;
  sources?: SpeciesSource[];
}

export interface SpeciesLookAlike {
  speciesId: number;
  lookAlikeId: number;
  howToTellApart: string;
  /** Joined species data for display */
  lookAlike?: Species;
}
