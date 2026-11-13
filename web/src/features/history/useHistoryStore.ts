import { create } from 'zustand';
import type { SavedPrediction } from '@/types/prediction';

const SESSION_STORAGE_KEY = 'plant_session_history';
const MAX_HISTORY_ITEMS = 50;

function loadSessionHistory(): SavedPrediction[] {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessionHistory(items: SavedPrediction[]): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(items));
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
