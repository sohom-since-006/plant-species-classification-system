import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '@/features/history/useHistoryStore';
import type { SavedPrediction } from '@/types/prediction';

function createMockPrediction(index: number, speciesId = 1): SavedPrediction {
  return {
    id: `test-pred-${index}`,
    speciesId,
    confidence: 0.95,
    tier: 'high',
    top3: [
      { speciesId, prob: 0.95 },
      { speciesId: 2, prob: 0.03 },
      { speciesId: 3, prob: 0.01 },
    ],
    similar: null,
    imagePath: null,
    modelVersion: 'plant_model.v1.onnx',
    createdAt: new Date(Date.now() + index * 1000).toISOString(),
    speciesName: `Species ${speciesId}`,
  };
}

describe('Session History Store (sessionStorage)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useHistoryStore.getState().clearHistory();
  });

  it('saves a prediction to session history with required fields', () => {
    const store = useHistoryStore.getState();
    const mock = createMockPrediction(1, 42);

    store.addPrediction(mock);

    const updated = useHistoryStore.getState().predictions;
    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe('test-pred-1');
    expect(updated[0]?.speciesId).toBe(42);
    expect(updated[0]?.confidence).toBe(0.95);
    expect(updated[0]?.tier).toBe('high');
    expect(updated[0]?.top3).toHaveLength(3);
    expect(updated[0]?.createdAt).toBeDefined();

    // Verify written to sessionStorage
    const stored = JSON.parse(sessionStorage.getItem('plant_session_history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('test-pred-1');
  });

  it('orders entries newest first', () => {
    const store = useHistoryStore.getState();
    const p1 = createMockPrediction(1, 10);
    const p2 = createMockPrediction(2, 20);
    const p3 = createMockPrediction(3, 30);

    store.addPrediction(p1);
    store.addPrediction(p2);
    store.addPrediction(p3);

    const predictions = useHistoryStore.getState().predictions;
    expect(predictions).toHaveLength(3);
    expect(predictions[0]?.id).toBe('test-pred-3');
    expect(predictions[1]?.id).toBe('test-pred-2');
    expect(predictions[2]?.id).toBe('test-pred-1');
  });

  it('caps session history strictly at 50 entries', () => {
    const store = useHistoryStore.getState();

    for (let i = 1; i <= 65; i++) {
      store.addPrediction(createMockPrediction(i, i % 10));
    }

    const predictions = useHistoryStore.getState().predictions;
    expect(predictions).toHaveLength(50);
    // Newest entry (#65) must be first
    expect(predictions[0]?.id).toBe('test-pred-65');
    // Oldest preserved entry (#16) must be last (entries 1..15 were dropped)
    expect(predictions[49]?.id).toBe('test-pred-16');

    // Also verify sessionStorage persistence
    const stored = JSON.parse(sessionStorage.getItem('plant_session_history') || '[]');
    expect(stored).toHaveLength(50);
    expect(stored[0].id).toBe('test-pred-65');
  });

  it('deletes an individual record by id', () => {
    const store = useHistoryStore.getState();
    const p1 = createMockPrediction(1);
    const p2 = createMockPrediction(2);

    store.addPrediction(p1);
    store.addPrediction(p2);

    store.deletePrediction('test-pred-1');

    const predictions = useHistoryStore.getState().predictions;
    expect(predictions).toHaveLength(1);
    expect(predictions[0]?.id).toBe('test-pred-2');

    const stored = JSON.parse(sessionStorage.getItem('plant_session_history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('test-pred-2');
  });

  it('clears all session history', () => {
    const store = useHistoryStore.getState();
    store.addPrediction(createMockPrediction(1));
    store.addPrediction(createMockPrediction(2));

    store.clearHistory();

    const predictions = useHistoryStore.getState().predictions;
    expect(predictions).toHaveLength(0);

    const stored = JSON.parse(sessionStorage.getItem('plant_session_history') || '[]');
    expect(stored).toHaveLength(0);
  });
});
