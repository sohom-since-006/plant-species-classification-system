import type { ClassificationResult } from '@/types/prediction';

/**
 * Fuse predictions from multiple images by averaging probabilities and embeddings.
 * Full implementation in Phase 4.
 */
export function fuseResults(
  _results: ClassificationResult[],
): ClassificationResult {
  return {
    top3: [],
    tier: 'unknown',
    unknown: true,
    similar: [],
    camData: null,
    modelVersion: '',
    genusFallback: null,
  };
}

