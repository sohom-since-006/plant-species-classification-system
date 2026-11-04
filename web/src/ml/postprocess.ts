import type { Tier, ClassificationResult, Prediction, SimilarMatch } from '@/types/prediction';

/**
 * Determine classification tier based on calibrated top-1 probability.
 * Boundaries per TRD Section 5:
 *   High:   > 0.85
 *   Medium: 0.60 to 0.85
 *   Low:    < 0.60
 *   Unknown: if unknown flag is set or confidence below rejection threshold (< 0.35)
 */
export function determineTier(top1Prob: number, isUnknown = false): Tier {
  if (isUnknown || top1Prob < 0.35) {
    return 'unknown';
  }
  if (top1Prob > 0.85) {
    return 'high';
  }
  if (top1Prob >= 0.60) {
    return 'medium';
  }
  return 'low';
}

/**
 * Post-processes model outputs per TRD Section 5:
 * 1. probs = softmax(logits / temperature)
 * 2. Top-3 by probability
 * 3. Unknown check (max prob < 0.35 or max cosine < tau)
 * 4. Tier evaluation (High > 0.85, Medium 0.60-0.85, Low < 0.60)
 * 5. Genus fallback if top-1 < 0.60 and top-3 share genus
 */
export function postprocess(
  logits: Float32Array,
  temperature = 1.0,
  options?: {
    genusList?: string[];
    tauThreshold?: number;
    maxCentroidSim?: number;
  },
): ClassificationResult {
  if (logits.length === 0) {
    return {
      top3: [],
      tier: 'unknown',
      unknown: true,
      similar: [],
      camData: null,
      modelVersion: 'uninitialized',
      genusFallback: null,
    };
  }

  // 1. Softmax with temperature scaling
  const T = Math.max(0.01, temperature);
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    const scaled = (logits[i] ?? 0) / T;
    if (scaled > maxLogit) maxLogit = scaled;
  }

  let sumExp = 0;
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const exp = Math.exp(((logits[i] ?? 0) / T) - maxLogit);
    probs[i] = exp;
    sumExp += exp;
  }
  for (let i = 0; i < probs.length; i++) {
    probs[i] = (probs[i] ?? 0) / sumExp;
  }

  // 2. Top-3 by probability
  const indexed = Array.from(probs).map((prob, speciesId) => ({ speciesId, prob }));
  indexed.sort((a, b) => b.prob - a.prob);
  const top3: Prediction[] = indexed.slice(0, 3);

  const top1Prob = top3[0]?.prob ?? 0;

  // 3. Unknown rule
  const tau = options?.tauThreshold ?? 0.40;
  const maxCentroidSim = options?.maxCentroidSim ?? 0.8;
  const isUnknown = top1Prob < 0.35 || maxCentroidSim < tau;

  // 4. Tier assignment
  const tier = determineTier(top1Prob, isUnknown);

  // 5. Genus fallback: if top-1 < 0.60 and top-3 share genus
  let genusFallback: string | null = null;
  if (!isUnknown && top1Prob < 0.60 && options?.genusList && options.genusList.length >= 3) {
    const g0 = options.genusList[top3[0]?.speciesId ?? -1];
    const g1 = options.genusList[top3[1]?.speciesId ?? -1];
    const g2 = options.genusList[top3[2]?.speciesId ?? -1];
    if (g0 && g0 === g1 && g0 === g2) {
      genusFallback = g0;
    }
  }

  return {
    top3,
    tier,
    unknown: isUnknown,
    similar: [] as SimilarMatch[],
    camData: null,
    modelVersion: 'v1.0.0',
    genusFallback,
  };
}
