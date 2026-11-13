/**
 * Startup self-check module for browser ML inference environment.
 * Verifies WebAssembly, SIMD, Web Workers, model asset routing, and WASM binary MIME headers.
 */

export interface StartupCheckResult {
  ok: boolean;
  error?: string;
  backendSuggested?: 'webgpu' | 'wasm';
  details: {
    webAssembly: boolean;
    simd: boolean;
    worker: boolean;
    modelMeta: boolean;
    wasmBinary: boolean;
  };
}

let cachedCheckPromise: Promise<StartupCheckResult> | null = null;

export async function runMlStartupSelfCheck(): Promise<StartupCheckResult> {
  if (cachedCheckPromise) {
    return cachedCheckPromise;
  }

  cachedCheckPromise = (async (): Promise<StartupCheckResult> => {
    const details = {
      webAssembly: false,
      simd: false,
      worker: false,
      modelMeta: false,
      wasmBinary: false,
    };

    // 1. Check WebAssembly support
    if (typeof WebAssembly === 'undefined' || typeof WebAssembly.instantiate !== 'function') {
      return {
        ok: false,
        error: 'WebAssembly is not supported or is disabled in your browser.',
        details,
      };
    }
    details.webAssembly = true;

    // 2. Check WebAssembly SIMD support
    try {
      details.simd = WebAssembly.validate(
        new Uint8Array([
          0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0,
          253, 15, 26, 11,
        ]),
      );
    } catch {
      details.simd = false;
    }

    // 3. Check Web Worker support
    if (typeof Worker === 'undefined') {
      return {
        ok: false,
        error: 'Web Workers are not supported in your browser environment.',
        details,
      };
    }
    details.worker = true;

    // 4. Verify /models/model_meta.json
    try {
      const metaRes = await fetch('/models/model_meta.json', { cache: 'no-cache' });
      if (!metaRes.ok) {
        return {
          ok: false,
          error: `Model configuration file /models/model_meta.json could not be reached (HTTP ${metaRes.status}).`,
          details,
        };
      }
      const contentType = metaRes.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return {
          ok: false,
          error:
            'Model metadata /models/model_meta.json returned HTML instead of JSON. The SPA rewrite rule may be intercepting static model files.',
          details,
        };
      }
      const metaJson = await metaRes.json();
      if (!metaJson || typeof metaJson !== 'object') {
        return {
          ok: false,
          error: 'Model configuration file /models/model_meta.json is malformed.',
          details,
        };
      }
      details.modelMeta = true;
    } catch (err) {
      return {
        ok: false,
        error: `Failed to load model metadata: ${err instanceof Error ? err.message : String(err)}`,
        details,
      };
    }

    // 5. Verify local WASM binary accessibility and Content-Type
    try {
      const wasmUrl = '/wasm/ort-wasm-simd-threaded.wasm';
      const wasmRes = await fetch(wasmUrl, {
        headers: { Range: 'bytes=0-1023' },
      });
      if (!wasmRes.ok && wasmRes.status !== 206) {
        return {
          ok: false,
          error: `ONNX WebAssembly binary at ${wasmUrl} could not be loaded (HTTP ${wasmRes.status}). Ensure wasm assets are deployed.`,
          details,
        };
      }
      const wasmContentType = wasmRes.headers.get('content-type') || '';
      if (wasmContentType.includes('text/html')) {
        return {
          ok: false,
          error: `ONNX WebAssembly binary at ${wasmUrl} returned HTML instead of application/wasm. The SPA rewrite rule is intercepting .wasm files.`,
          details,
        };
      }
      details.wasmBinary = true;
    } catch (err) {
      return {
        ok: false,
        error: `Failed to reach WebAssembly binary: ${err instanceof Error ? err.message : String(err)}`,
        details,
      };
    }

    // Determine backend recommendation
    let backendSuggested: 'webgpu' | 'wasm' = 'wasm';
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as { gpu?: unknown }).gpu) {
      backendSuggested = 'webgpu';
    }

    return {
      ok: true,
      backendSuggested,
      details,
    };
  })();

  return cachedCheckPromise;
}

