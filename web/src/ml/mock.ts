import type { ClassificationResult } from '@/types/prediction';

/** Whether mock mode is explicitly requested */
export const isMockMode = import.meta.env.VITE_MOCK_ML === 'true';

/**
 * Fast FNV-1a 32-bit hash function for deterministic fixture selection.
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Deterministically hashes a file, string or object to select mock fixtures.
 */
export function hashImageInput(input: File | Blob | string | { name?: string; size?: number }): number {
  if (typeof input === 'string') {
    return hashString(input);
  }
  if (input instanceof File) {
    const key = `${input.name}_${input.size}_${input.type}_${input.lastModified}`;
    return hashString(key);
  }
  if (input instanceof Blob) {
    const key = `blob_${input.size}_${input.type}`;
    return hashString(key);
  }
  return hashString(JSON.stringify(input));
}

/**
 * Generates a synthetic 7x7 class activation map (CAM) centered on leaf traits.
 */
function generateSyntheticCam(): Float32Array {
  const cam = new Float32Array(49);
  const centerX = 3;
  const centerY = 3;
  const sigma = 1.6;

  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const distSq = (x - centerX) ** 2 + (y - centerY) ** 2;
      const raw = Math.exp(-distSq / (2 * sigma ** 2));
      // Add slight organic asymmetry
      const noise = ((x * 13 + y * 7) % 10) * 0.02;
      cam[y * 7 + x] = Math.min(1.0, Math.max(0.05, raw + noise));
    }
  }
  return cam;
}

/**
 * 4 Pre-defined Fixtures per docs/TRD.md and docs/MasterPrompt.md:
 *  0: High Confidence (> 0.85) - Tulsi
 *  1: Medium Confidence (0.60 - 0.85) - Tropical Hibiscus
 *  2: Low Confidence (< 0.60) with Genus Fallback - Sweet Basil vs Tulsi (genus Ocimum)
 *  3: Unknown / Not a Plant (prob < 0.35, rejected)
 */
export const MOCK_FIXTURES: Record<number, ClassificationResult> = {
  // Case 0: High confidence (> 0.85) - Tulsi
  0: {
    top3: [
      { speciesId: 0, prob: 0.94 }, // Tulsi (Holy Basil)
      { speciesId: 97, prob: 0.04 }, // Sweet Basil
      { speciesId: 1, prob: 0.01 }, // Neem
    ],
    tier: 'high',
    unknown: false,
    similar: [
      { speciesId: 97, ml: 0.04, visual: 0.84, final: 0.360 }, // Sweet Basil (Same genus Ocimum bonus +0.05)
      { speciesId: 9, ml: 0.005, visual: 0.58, final: 0.235 }, // Curry Leaf
      { speciesId: 1, ml: 0.01, visual: 0.44, final: 0.182 }, // Neem
    ],
    camData: generateSyntheticCam(),
    modelVersion: 'mock-v1.0.0-calibrated',
    genusFallback: null,
  },

  // Case 1: Medium confidence (0.60 to 0.85) - Hibiscus
  1: {
    top3: [
      { speciesId: 20, prob: 0.74 }, // Tropical Hibiscus
      { speciesId: 9, prob: 0.16 }, // Curry Leaf
      { speciesId: 80, prob: 0.07 }, // Money Plant
    ],
    tier: 'medium',
    unknown: false,
    similar: [
      { speciesId: 9, ml: 0.16, visual: 0.62, final: 0.344 },
      { speciesId: 80, ml: 0.07, visual: 0.51, final: 0.246 },
      { speciesId: 0, ml: 0.02, visual: 0.39, final: 0.168 },
    ],
    camData: generateSyntheticCam(),
    modelVersion: 'mock-v1.0.0-calibrated',
    genusFallback: null,
  },

  // Case 2: Low confidence (< 0.60) with Genus Fallback - Sweet Basil vs Tulsi (genus Ocimum)
  2: {
    top3: [
      { speciesId: 97, prob: 0.52 }, // Sweet Basil (Ocimum)
      { speciesId: 0, prob: 0.38 }, // Tulsi (Ocimum)
      { speciesId: 97, prob: 0.07 }, // Ocimum relative
    ],
    tier: 'low',
    unknown: false,
    similar: [
      { speciesId: 0, ml: 0.38, visual: 0.91, final: 0.648 },
      { speciesId: 9, ml: 0.03, visual: 0.48, final: 0.210 },
    ],
    camData: generateSyntheticCam(),
    modelVersion: 'mock-v1.0.0-calibrated',
    genusFallback: 'Ocimum',
  },

  // Case 3: Unknown / Not a plant (prob < 0.35, rejected)
  3: {
    top3: [
      { speciesId: 80, prob: 0.23 },
      { speciesId: 2, prob: 0.17 },
      { speciesId: 1, prob: 0.11 },
    ],
    tier: 'unknown',
    unknown: true,
    similar: [],
    camData: null,
    modelVersion: 'mock-v1.0.0-calibrated',
    genusFallback: null,
  },
};

/**
 * Returns deterministic mock classification results matching the exact TRD specification.
 * If input is provided, selects the fixture deterministically based on image hash.
 */
export function getMockResult(
  input?: File | Blob | string | { name?: string; size?: number },
  forcedIndex?: number,
): ClassificationResult {
  if (typeof forcedIndex === 'number' && forcedIndex in MOCK_FIXTURES) {
    const fixture = MOCK_FIXTURES[forcedIndex]!;
    return {
      ...fixture,
      top3: [...fixture.top3],
      similar: [...fixture.similar],
      camData: fixture.camData ? new Float32Array(fixture.camData) : null,
    };
  }

  const hash = input ? hashImageInput(input) : 0;
  const fixtureIndex = hash % 4;
  const fixture = MOCK_FIXTURES[fixtureIndex] ?? MOCK_FIXTURES[0]!;

  return {
    ...fixture,
    top3: [...fixture.top3],
    similar: [...fixture.similar],
    camData: fixture.camData ? new Float32Array(fixture.camData) : null,
  };
}
