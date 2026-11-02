export type Tier = 'high' | 'medium' | 'low' | 'unknown';

export interface Prediction {
  speciesId: number;
  prob: number;
}

export interface SimilarMatch {
  speciesId: number;
  ml: number;
  visual: number;
  final: number;
}

export interface ClassificationResult {
  top3: Prediction[];
  tier: Tier;
  unknown: boolean;
  similar: SimilarMatch[];
  camData: Float32Array | null;
  modelVersion: string;
  genusFallback: string | null;
}

export interface SavedPrediction {
  id: string;
  speciesId: number | null;
  confidence: number;
  tier: Tier;
  top3: Prediction[];
  similar: SimilarMatch[] | null;
  imagePath: string | null;
  modelVersion: string | null;
  createdAt: string;
  /** For display: joined species name */
  speciesName?: string;
}
