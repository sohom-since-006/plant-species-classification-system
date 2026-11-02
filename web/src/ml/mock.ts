import type { ClassificationResult } from '@/types/prediction';

/** Whether mock mode is enabled */
export const isMockMode = import.meta.env.VITE_MOCK_ML === 'true';

/**
 * Returns a deterministic mock classification result.
 * Used when VITE_MOCK_ML=true so the UI can be built and tested
 * without real model files. Never present these as real metrics.
 */
export function getMockResult(): ClassificationResult {
  return {
    top3: [
      { speciesId: 0, prob: 0.92 },
      { speciesId: 1, prob: 0.05 },
      { speciesId: 2, prob: 0.02 },
    ],
    tier: 'high',
    unknown: false,
    similar: [
      { speciesId: 1, ml: 0.05, visual: 0.42, final: 0.198 },
      { speciesId: 2, ml: 0.02, visual: 0.35, final: 0.152 },
      { speciesId: 3, ml: 0.005, visual: 0.28, final: 0.115 },
    ],
    camData: null,
    modelVersion: 'mock-v1',
    genusFallback: null,
  };
}
