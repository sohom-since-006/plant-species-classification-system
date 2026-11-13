import { useState, useCallback } from 'react';
import { useHistoryStore } from './useHistoryStore';
import { getSpeciesById } from '@/services/speciesService';
import type { ClassificationResult, SavedPrediction } from '@/types/prediction';

export function useHistoryService() {
  const store = useHistoryStore();
  const [isSaving, setIsSaving] = useState(false);

  const savePrediction = useCallback(
    async ({ result }: { result: ClassificationResult }): Promise<SavedPrediction> => {
      setIsSaving(true);
      try {
        const topId = result.top3[0]?.speciesId ?? null;
        const confidence = result.top3[0]?.prob ?? 0;
        const nowIso = new Date().toISOString();
        const predictionId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `pred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const sp = topId !== null ? getSpeciesById(topId) : undefined;
        const entry: SavedPrediction = {
          id: predictionId,
          speciesId: topId,
          confidence,
          tier: result.tier,
          top3: result.top3,
          similar: result.similar,
          imagePath: sp?.referenceImages?.[0] ?? null,
          modelVersion: result.modelVersion,
          createdAt: nowIso,
          speciesName: sp?.commonName,
        };

        store.addPrediction(entry);
        return entry;
      } finally {
        setIsSaving(false);
      }
    },
    [store],
  );

  const deletePrediction = useCallback(
    async (id: string): Promise<void> => {
      store.deletePrediction(id);
    },
    [store],
  );

  const clearHistory = useCallback(async (): Promise<void> => {
    store.clearHistory();
  }, [store]);

  return {
    predictions: store.predictions,
    isLoading: store.loading,
    isError: false,
    savePrediction,
    isSaving,
    deletePrediction,
    clearHistory,
  };
}
