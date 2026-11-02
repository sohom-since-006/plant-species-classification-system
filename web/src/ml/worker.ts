/**
 * ML Web Worker — Phase 4.
 * Handles ONNX model loading and inference off the main thread.
 */

// Minimal handler so TypeScript compiles
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { type: string };
  if (data.type === 'init') {
    self.postMessage({ type: 'init-done' });
  }
};

export {};

