import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getAllSpecies, getSpeciesBySlug, getSpeciesById } from '@/services/speciesService';
import type { Species } from '@/types/species';
import type { Database } from '@/types/database';

type DbSpeciesRow = Database['public']['Tables']['species']['Row'];

export function mapDbSpeciesToClient(row: DbSpeciesRow): Species {
  return {
    id: row.id,
    slug: row.slug,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    family: row.family,
    genus: row.genus,
    plantType: row.plant_type,
    origin: row.origin,
    namesHindi: row.names_hindi,
    namesBengali: row.names_bengali,
    otherNames: row.other_names || [],
    description: row.description,
    identifyingFeatures: row.identifying_features || [],
    habitat: row.habitat,
    distribution: row.distribution,
    uses: row.uses || [],
    careTips: row.care_tips || [],
    toxicityNote: row.toxicity_note,
    funFact: row.fun_fact,
    referenceImages: row.reference_images || [],
    wikipediaUrl: row.wikipedia_url,
  };
}

/**
 * TanStack Query hook to fetch all 112 species catalog from Supabase,
 * with bundled species.json as seamless offline fallback.
 */
export function useSpeciesListQuery() {
  return useQuery<Species[], Error>({
    queryKey: ['species', 'list'],
    queryFn: async () => {
      if (!supabase || !isSupabaseConfigured) {
        return getAllSpecies();
      }
      try {
        const { data, error } = await supabase
          .from('species')
          .select('*')
          .order('id', { ascending: true });

        if (error || !data || data.length === 0) {
          return getAllSpecies();
        }
        return data.map(mapDbSpeciesToClient);
      } catch {
        return getAllSpecies();
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    initialData: getAllSpecies,
  });
}

export interface LookAlikeItem {
  id: number;
  species: Species;
  distinction: string;
}

/**
 * TanStack Query hook for single species detail and its look-alikes.
 */
export function useSpeciesDetailQuery(slug: string | undefined) {
  return useQuery<{ species: Species; lookAlikes: LookAlikeItem[] } | null, Error>({
    queryKey: ['species', 'detail', slug],
    queryFn: async () => {
      if (!slug) return null;

      const fallbackSpecies = getSpeciesBySlug(slug);

      if (!supabase || !isSupabaseConfigured) {
        if (!fallbackSpecies) return null;
        return { species: fallbackSpecies, lookAlikes: [] };
      }

      try {
        const { data: speciesRow, error: spError } = await supabase
          .from('species')
          .select('*')
          .eq('slug', slug)
          .single();

        if (spError || !speciesRow) {
          if (!fallbackSpecies) return null;
          return { species: fallbackSpecies, lookAlikes: [] };
        }

        const clientSpecies = mapDbSpeciesToClient(speciesRow);

        // Fetch look-alikes
        const { data: lookAlikeRows } = await supabase
          .from('species_look_alikes')
          .select('look_alike_id, how_to_tell_apart')
          .eq('species_id', clientSpecies.id);

        const lookAlikes: LookAlikeItem[] = (lookAlikeRows || [])
          .map((row) => {
            const match = getSpeciesById(row.look_alike_id);
            if (!match) return null;
            return {
              id: row.look_alike_id,
              species: match,
              distinction: row.how_to_tell_apart,
            };
          })
          .filter((item): item is LookAlikeItem => item !== null);

        return { species: clientSpecies, lookAlikes };
      } catch {
        if (!fallbackSpecies) return null;
        return { species: fallbackSpecies, lookAlikes: [] };
      }
    },
    staleTime: 1000 * 60 * 30,
    enabled: Boolean(slug),
  });
}
