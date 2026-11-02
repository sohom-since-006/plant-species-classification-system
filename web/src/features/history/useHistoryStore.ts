import { create } from 'zustand';
import type { SavedPrediction } from '@/types/prediction';

type HistoryState = {
  predictions: SavedPrediction[];
  loading: boolean;
};

/** Placeholder store — full implementation in Phase 5. */
export const useHistoryStore = create<HistoryState>()(() => ({
  predictions: [],
  loading: false,
}));

