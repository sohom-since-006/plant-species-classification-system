import { create } from 'zustand';
import type { SavedPrediction } from '@/types/prediction';

const SESSION_STORAGE_KEY = 'plant_session_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Defensive schema validator to ignore corrupt, malformed, or obsolete entries
 * stored in sessionStorage across deployments.
 */
function isValidPrediction(item: unknown): item is SavedPrediction {
  if (!item || typeof item !== 'object') return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    (typeof p.speciesId === 'number' || p.speciesId === null) &&
    typeof p.confidence === 'number' &&
    !Number.isNaN(p.confidence) &&
    typeof p.tier === 'string' &&
    ['high', 'medium', 'low', 'unknown'].includes(p.tier) &&
    Array.isArray(p.top3) &&
    typeof p.createdAt === 'string' &&
    p.createdAt.length > 0
  );
}

function loadSessionHistory(): SavedPrediction[] {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPrediction);
  } catch {
    return [];
  }
}

function persistSessionHistory(items: SavedPrediction[]): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
  try {
    // Only persist valid predictions
    const valid = items.filter(isValidPrediction);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(valid));
  } catch {
    // SessionStorage quota exceeded or storage disabled
  }
}

export type HistoryState = {
  predictions: SavedPrediction[];
  loading: boolean;
  addPrediction: (prediction: SavedPrediction) => void;
  deletePrediction: (id: string) => void;
  clearHistory: () => void;
};

export const useHistoryStore = create<HistoryState>((set) => ({
  predictions: loadSessionHistory(),
  loading: false,

  addPrediction: (prediction) =>
    set((state) => {
      // Validate incoming prediction
      if (!isValidPrediction(prediction)) return state;

      // Remove duplicate if same id exists, place newest first, cap at 50
      const filtered = state.predictions.filter((p) => p.id !== prediction.id);
      const updated = [prediction, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      persistSessionHistory(updated);
      return { predictions: updated };
    }),

  deletePrediction: (id) =>
    set((state) => {
      const updated = state.predictions.filter((p) => p.id !== id);
      persistSessionHistory(updated);
      return { predictions: updated };
    }),

  clearHistory: () =>
    set(() => {
      persistSessionHistory([]);
      return { predictions: [] };
    }),
}));
