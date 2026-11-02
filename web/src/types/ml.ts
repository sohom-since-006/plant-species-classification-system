/** Messages sent from main thread to the ML worker */
export type WorkerRequest =
  | { type: 'init' }
  | { type: 'classify'; imageData: ImageBitmap; id: string }
  | { type: 'classify-multi'; images: ImageBitmap[]; id: string };

/** Messages sent from the ML worker to the main thread */
export type WorkerResponse =
  | { type: 'init-progress'; progress: number; status: string }
  | { type: 'init-done' }
  | { type: 'init-error'; error: string }
  | { type: 'result'; id: string; result: import('./prediction').ClassificationResult }
  | { type: 'error'; id: string; error: string };

/** Model metadata loaded from model_meta.json */
export interface ModelMeta {
  version: string;
  temperature: number;
  tau: number;
  threshold: number;
  mlWeight: number;
  visualWeight: number;
  mean: [number, number, number];
  std: [number, number, number];
  numSpecies: number;
  inputSize: number;
}
