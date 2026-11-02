import type { ClassificationResult } from '@/types/prediction';

/**
 * Apply temperature scaling, compute tiers, and the unknown rule.
 * Full implementation in Phase 4.
 */
export function postprocess(
  _logits: Float32Array,
  _temperature: number,
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

