import * as ort from 'onnxruntime-web';

export interface ModelMetadata {
  version: string;
  numSpecies: number;
  inputSize: number;
  resize: number;
  crop: number;
  mean: [number, number, number];
  std: [number, number, number];
  temperature: number;
  tau: number;
  threshold: number;
  tierBoundaries: {
    high: number;
    medium: number;
  };
  mlWeight: number;
  visualWeight: number;
  genusBonus: number;
  camWeightsShape: [number, number];
  modelFile: string;
  camWeightsFile: string;
  centroidsFile: string;
  labelsFile: string;
  metricsFile: string;
}

export interface SpeciesLabel {
  species_id: number;
  common_name: string;
  scientific_name: string;
  family: string;
  genus: string;
}

export interface ModelBundle {
  meta: ModelMetadata;
  session: ort.InferenceSession;
  labels: Record<string, SpeciesLabel>;
  centroids: Record<string, number[]>;
  camWeights: ArrayBuffer;
  genusList: Record<number, string>;
  backend: 'webgpu' | 'wasm' | 'cpu';
}

export interface ProgressCallback {
  (event: {
    stage: 'metadata' | 'model' | 'centroids' | 'cam_weights' | 'labels' | 'session';
    progress: number; // 0 to 1
    loadedBytes?: number;
    totalBytes?: number;
    message: string;
  }): void;
}

let cachedBundle: ModelBundle | null = null;
let loadingPromise: Promise<ModelBundle> | null = null;

/**
 * Configure onnxruntime-web environment defaults.
 */
function configureOrtEnvironment() {
  if (typeof ort !== 'undefined' && ort.env?.wasm) {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    // Set fallback wasm CDN path matching pinned version 1.31.1
    if (!ort.env.wasm.wasmPaths) {
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
    }
  }
}

/**
 * Helper to fetch a resource with Cache API integration and progress reporting.
 */
async function fetchWithCache(
  url: string,
  cacheName: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  // Check Cache API if available
  const hasCacheApi = typeof caches !== 'undefined';
  if (hasCacheApi) {
    try {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) {
        onProgress?.(1, 1);
        return await cached.arrayBuffer();
      }
    } catch {
      // Ignore cache open/match errors and fallback to fetch
    }
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status}: ${res.statusText})`);
  }

  const contentLengthHeader = res.headers.get('content-length');
  const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

  let buffer: ArrayBuffer;
  if (res.body && total > 0 && typeof ReadableStream !== 'undefined') {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress?.(received, total);
      }
    }

    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    buffer = combined.buffer;
  } else {
    buffer = await res.arrayBuffer();
    onProgress?.(1, 1);
  }

  // Save to Cache API if supported
  if (hasCacheApi) {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(url, new Response(buffer.slice(0), { headers: res.headers }));
    } catch {
      // Ignore cache put failures
    }
  }

  return buffer;
}

/**
 * Loads the complete plant classification model bundle:
 * 1. Fetches model_meta.json (no-cache)
 * 2. Checks Cache API and downloads versioned ONNX model, labels, centroids, and cam_weights
 * 3. Creates ONNX session trying WebGPU first, then WASM
 */
export async function loadModelBundle(
  baseUrl = '/models',
  onProgress?: ProgressCallback,
): Promise<ModelBundle> {
  if (cachedBundle) {
    return cachedBundle;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    configureOrtEnvironment();

    onProgress?.({
      stage: 'metadata',
      progress: 0.05,
      message: 'Fetching model configuration...',
    });

    // 1. Fetch model_meta.json (no-cache)
    const metaUrl = `${baseUrl}/model_meta.json`;
    const metaRes = await fetch(metaUrl, { cache: 'no-cache' });
    if (!metaRes.ok) {
      throw new Error(`Failed to load model metadata from ${metaUrl} (status ${metaRes.status})`);
    }
    const meta = (await metaRes.json()) as ModelMetadata;

    const cacheName = `plant-model-v${meta.version || '1.0.0'}`;

    // 2. Fetch labels.json
    onProgress?.({
      stage: 'labels',
      progress: 0.15,
      message: 'Loading botanical species taxonomy...',
    });
    const labelsUrl = `${baseUrl}/${meta.labelsFile || 'labels.json'}`;
    const labelsBuffer = await fetchWithCache(labelsUrl, cacheName);
    const labelsText = new TextDecoder().decode(labelsBuffer);
    const labels = JSON.parse(labelsText) as Record<string, SpeciesLabel>;

    // Build genus lookup map
    const genusList: Record<number, string> = {};
    for (const [key, item] of Object.entries(labels)) {
      const id = parseInt(key, 10);
      if (item.genus) {
        genusList[id] = item.genus;
      }
    }

    // 3. Fetch centroids.json
    onProgress?.({
      stage: 'centroids',
      progress: 0.30,
      message: 'Loading species visual centroids...',
    });
    const centroidsUrl = `${baseUrl}/${meta.centroidsFile || 'centroids.v1.json'}`;
    const centroidsBuffer = await fetchWithCache(centroidsUrl, cacheName);
    const centroidsText = new TextDecoder().decode(centroidsBuffer);
    const centroids = JSON.parse(centroidsText) as Record<string, number[]>;

    // 4. Fetch cam_weights.bin
    onProgress?.({
      stage: 'cam_weights',
      progress: 0.45,
      message: 'Loading visual attention weights...',
    });
    const camUrl = `${baseUrl}/${meta.camWeightsFile || 'cam_weights.v1.bin'}`;
    const camWeights = await fetchWithCache(camUrl, cacheName);

    // 5. Fetch ONNX model file with real progress tracking
    const modelUrl = `${baseUrl}/${meta.modelFile || 'plant_model.v1.onnx'}`;
    const modelBuffer = await fetchWithCache(
      modelUrl,
      cacheName,
      (loaded, total) => {
        const ratio = total > 0 ? loaded / total : 0.5;
        const mapped = 0.50 + ratio * 0.35; // 0.50 to 0.85
        onProgress?.({
          stage: 'model',
          progress: mapped,
          loadedBytes: loaded,
          totalBytes: total,
          message: `Downloading neural network (${Math.round((loaded / 1024 / 1024) * 10) / 10} MB)...`,
        });
      },
    );

    // 6. Create InferenceSession (WebGPU first, fallback to WASM)
    onProgress?.({
      stage: 'session',
      progress: 0.90,
      message: 'Initializing hardware-accelerated session...',
    });

    let session: ort.InferenceSession;
    let backend: 'webgpu' | 'wasm' | 'cpu' = 'wasm';

    try {
      session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
      });
      backend = 'webgpu';
    } catch {
      // WebGPU failed or unsupported, fallback to WASM
      try {
        session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        backend = 'wasm';
      } catch (wasmErr) {
        throw new Error(
          `Hardware acceleration and WASM inference initialization failed: ${wasmErr instanceof Error ? wasmErr.message : String(wasmErr)}`,
        );
      }
    }

    onProgress?.({
      stage: 'session',
      progress: 1.0,
      message: 'Neural model ready.',
    });

    cachedBundle = {
      meta,
      session,
      labels,
      centroids,
      camWeights,
      genusList,
      backend,
    };

    return cachedBundle;
  })();

  return loadingPromise;
}

/**
 * Returns the currently cached model bundle, or null if not yet loaded.
 */
export function getLoadedBundle(): ModelBundle | null {
  return cachedBundle;
}
