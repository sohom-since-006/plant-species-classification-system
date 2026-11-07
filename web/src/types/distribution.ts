export interface CountryObservation {
  code: string;
  name: string;
  count: number;
}

export interface StateObservation {
  name: string;
  count: number;
}

export interface SpeciesDistributionRecord {
  species_id: number;
  scientific_name: string;
  common_name: string;
  total: number;
  countries: CountryObservation[];
  india_states: StateObservation[];
  months: number[]; // 12 monthly counts [Jan..Dec]
  generated_at: string;
  source: string;
  label: string;
}

export interface DistributionDataFile {
  version: string;
  generated_at: string;
  label: string;
  source: string;
  species: Record<string, SpeciesDistributionRecord>;
}

