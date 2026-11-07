import { useQuery } from '@tanstack/react-query';
import type { DistributionDataFile, SpeciesDistributionRecord } from '@/types/distribution';

async function fetchDistributionData(): Promise<DistributionDataFile | null> {
  const url = `${import.meta.env.BASE_URL}data/species_distribution.json`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to load species distribution data (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Loads /data/species_distribution.json once via TanStack Query and extracts
 * the distribution record for the requested species ID.
 */
export function useDistribution(speciesId: number | undefined | null) {
  const query = useQuery<DistributionDataFile | null>({
    queryKey: ['species_distribution'],
    queryFn: fetchDistributionData,
    staleTime: Infinity, // Static dataset, cache for entire app session
    gcTime: 1000 * 60 * 60, // Keep in memory for 1 hour
    retry: 1,
  });

  const record: SpeciesDistributionRecord | null =
    speciesId !== undefined && speciesId !== null && query.data?.species
      ? query.data.species[String(speciesId)] || null
      : null;

  return {
    distribution: record,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

