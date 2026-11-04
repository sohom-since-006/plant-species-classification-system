import { create } from 'zustand';
import type { SavedPrediction } from '@/types/prediction';

const STORAGE_KEY = 'plant_history_predictions';

function loadInitial(): SavedPrediction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items: SavedPrediction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded or private mode
  }
}

type HistoryState = {
  predictions: SavedPrediction[];
  loading: boolean;
  addPrediction: (prediction: SavedPrediction) => void;
  deletePrediction: (id: string) => void;
  clearHistory: () => void;
};

export const useHistoryStore = create<HistoryState>((set) => ({
  predictions: loadInitial(),
  loading: false,

  addPrediction: (prediction) =>
    set((state) => {
      // Avoid duplicate consecutive saves of identical id
      const filtered = state.predictions.filter((p) => p.id !== prediction.id);
      const updated = [prediction, ...filtered];
      persist(updated);
      return { predictions: updated };
    }),

  deletePrediction: (id) =>
    set((state) => {
      const updated = state.predictions.filter((p) => p.id !== id);
      persist(updated);
      return { predictions: updated };
    }),

  clearHistory: () =>
    set(() => {
      persist([]);
      return { predictions: [] };
    }),
}));
