import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/features/auth/useSession';
import { useHistoryStore } from './useHistoryStore';
import { getSpeciesById } from '@/services/speciesService';
import { createSafeThumbnail } from './imageUpload';
import type { ClassificationResult, SavedPrediction } from '@/types/prediction';
import type { Database, Json } from '@/types/database';

type DbPredictionRow = Database['public']['Tables']['predictions']['Row'];

function mapDbToSaved(row: DbPredictionRow): SavedPrediction {
  const species = row.species_id !== null ? getSpeciesById(row.species_id) : undefined;
  return {
    id: row.id,
    speciesId: row.species_id,
    confidence: Number(row.confidence),
    tier: row.tier,
    top3: (row.top3 as unknown as SavedPrediction['top3']) || [],
    similar: (row.similar as unknown as SavedPrediction['similar']) || [],
    imagePath: row.image_path,
    modelVersion: row.model_version,
    createdAt: row.created_at,
    speciesName: species?.commonName,
  };
}

export function useHistoryService() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const localStore = useHistoryStore();

  const historyQuery = useQuery<SavedPrediction[], Error>({
    queryKey: ['history', user?.id ?? 'local'],
    queryFn: async () => {
      // If user is not authenticated or Supabase is not available, use local store
      if (!user || !supabase || !isSupabaseConfigured) {
        return localStore.predictions;
      }

      try {
        const { data, error } = await supabase
          .from('predictions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error || !data) {
          return localStore.predictions;
        }

        const cloudItems = data.map(mapDbToSaved);
        return cloudItems;
      } catch {
        return localStore.predictions;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    initialData: () => localStore.predictions,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      result,
      imageSource,
      optInUpload,
    }: {
      result: ClassificationResult;
      imageSource?: Blob | HTMLCanvasElement | HTMLImageElement | string | null;
      optInUpload: boolean;
    }) => {
      const predictionId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
      let cloudImagePath: string | null = null;
      let localImageUrl: string | null = null;

      // Privacy by default: Only upload thumbnail if the user explicitly opted in
      if (optInUpload && imageSource && user && supabase && isSupabaseConfigured) {
        try {
          const thumbnailBlob = await createSafeThumbnail(imageSource);
          const storagePath = `${user.id}/${predictionId}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, thumbnailBlob, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadError) {
            // Get signed URL for private bucket (valid 1 year) or fallback to path
            const { data: signedData } = await supabase.storage
              .from('uploads')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            cloudImagePath = signedData?.signedUrl ?? storagePath;
            localImageUrl = cloudImagePath;
          }
        } catch (err) {
          console.warn('Thumbnail upload failed; saving without photo', err);
        }
      }

      const topId = result.top3[0]?.speciesId ?? null;
      const confidence = result.top3[0]?.prob ?? 0;
      const nowIso = new Date().toISOString();

      // If user is logged in, write to Supabase predictions table with RLS
      if (user && supabase && isSupabaseConfigured) {
        await supabase.from('predictions').insert({
          id: predictionId,
          user_id: user.id,
          species_id: topId,
          confidence,
          tier: result.tier,
          top3: result.top3 as unknown as Json,
          similar: (result.similar || []) as unknown as Json,
          image_path: cloudImagePath,
          model_version: result.modelVersion,
          created_at: nowIso,
        });
      }

      // Always save to local store for instant UI feedback and offline access
      const sp = topId !== null ? getSpeciesById(topId) : undefined;
      const localEntry: SavedPrediction = {
        id: predictionId,
        speciesId: topId,
        confidence,
        tier: result.tier,
        top3: result.top3,
        similar: result.similar,
        imagePath: localImageUrl ?? sp?.referenceImages?.[0] ?? null,
        modelVersion: result.modelVersion,
        createdAt: nowIso,
        speciesName: sp?.commonName,
      };

      localStore.addPrediction(localEntry);
      return localEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // If user is authenticated, delete from cloud
      if (user && supabase && isSupabaseConfigured) {
        try {
          await supabase.from('predictions').delete().eq('id', id);
        } catch {
          // Ignore cloud network error
        }
      }
      localStore.deletePrediction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (user && supabase && isSupabaseConfigured) {
        try {
          await supabase.from('predictions').delete().eq('user_id', user.id);
        } catch {
          // Ignore cloud network error
        }
      }
      localStore.clearHistory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  return {
    predictions: historyQuery.data ?? localStore.predictions,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    savePrediction: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deletePrediction: deleteMutation.mutateAsync,
    clearHistory: clearMutation.mutateAsync,
  };
}
