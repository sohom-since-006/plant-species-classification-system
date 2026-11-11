/**
 * Class Activation Map (CAM) computation.
 * Per TRD Section 7:
 * Head is GlobalAveragePool + Linear, so CAM is exact:
 *   CAM = ReLU(sum_c W[class, c] * features[c])
 * Upsampled over the image and normalized to [0, 1].
 *
 * cam_weights ships as N x 1280 float16 binary (little-endian).
 */

/**
 * Decodes a 16-bit IEEE 754 half-precision float into a standard JavaScript number (float32/float64).
 */
export function decodeFloat16(h: number): number {
  const sign = (h >> 15) & 1;
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;

  if (exp === 0) {
    // Subnormal or zero
    return (sign ? -1 : 1) * Math.pow(2, -14) * (mant / 1024);
  }
  if (exp === 31) {
    // Infinity or NaN
    return mant === 0 ? (sign ? -Infinity : Infinity) : NaN;
  }
  // Normalized
  return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
}

/**
 * Decodes an entire ArrayBuffer / Uint8Array of little-endian float16 values into a Float32Array.
 */
export function decodeFloat16Buffer(
  buffer: ArrayBuffer | Uint8Array,
  count?: number,
): Float32Array {
  const view = buffer instanceof Uint8Array
    ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new DataView(buffer);

  const totalElements = count ?? Math.floor(view.byteLength / 2);
  const out = new Float32Array(totalElements);

  for (let i = 0; i < totalElements; i++) {
    const uint16 = view.getUint16(i * 2, true); // true = little-endian
    out[i] = decodeFloat16(uint16);
  }

  return out;
}

/**
 * Extracts class weights [1280] for a given class index from either decoded Float32Array
 * or raw Float16 buffer.
 */
export function getClassWeights(
  camWeights: Float32Array | ArrayBuffer | Uint8Array,
  classIdx: number,
  numChannels = 1280,
): Float32Array {
  if (camWeights instanceof Float32Array) {
    const start = classIdx * numChannels;
    return camWeights.subarray(start, start + numChannels);
  }

  // Raw float16 buffer
  const view = camWeights instanceof Uint8Array
    ? new DataView(camWeights.buffer, camWeights.byteOffset, camWeights.byteLength)
    : new DataView(camWeights);

  const out = new Float32Array(numChannels);
  const startByte = classIdx * numChannels * 2;
  for (let c = 0; c < numChannels; c++) {
    const uint16 = view.getUint16(startByte + c * 2, true);
    out[c] = decodeFloat16(uint16);
  }
  return out;
}

/**
 * Computes the 7x7 spatial Class Activation Map (CAM) for the specified class index.
 * features: [1, 1280, 7, 7] or [1280, 7, 7] in CHW layout.
 * camWeights: [numClasses, 1280] float16 binary or decoded Float32Array.
 * Returns a normalized Float32Array of 49 values in [0, 1].
 */
export function computeCAM(
  features: Float32Array,
  camWeights: Float32Array | ArrayBuffer | Uint8Array,
  classIdx: number,
  numChannels = 1280,
  gridH = 7,
  gridW = 7,
): Float32Array {
  const spatialPoints = gridH * gridW;
  const weights = getClassWeights(camWeights, classIdx, numChannels);
  const rawCam = new Float32Array(spatialPoints);

  // Compute CAM[y, x] = ReLU(sum_c W[class, c] * features[c, y, x])
  for (let i = 0; i < spatialPoints; i++) {
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      const featVal = features[c * spatialPoints + i] ?? 0;
      const weightVal = weights[c] ?? 0;
      sum += weightVal * featVal;
    }
    // ReLU activation
    rawCam[i] = Math.max(0, sum);
  }

  // Min-max normalization into [0, 1]
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < spatialPoints; i++) {
    const v = rawCam[i] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min;
  const normalized = new Float32Array(spatialPoints);
  if (range > 1e-6) {
    for (let i = 0; i < spatialPoints; i++) {
      normalized[i] = ((rawCam[i] ?? 0) - min) / range;
    }
  }

  return normalized;
}

/**
 * Bilinear upsamples a 7x7 grid into an arbitrary target (e.g. 224x224 or canvas).
 */
export function upsampleCAM(
  cam7x7: Float32Array,
  targetW: number,
  targetH: number,
  srcW = 7,
  srcH = 7,
): Float32Array {
  const out = new Float32Array(targetW * targetH);
  const scaleX = targetW / srcW;
  const scaleY = targetH / srcH;

  for (let y = 0; y < targetH; y++) {
    const srcY = ((y + 0.5) / scaleY) - 0.5;
    const y0 = Math.max(0, Math.floor(srcY));
    const y1 = Math.min(srcH - 1, Math.ceil(srcY));
    const dy = srcY - y0;

    for (let x = 0; x < targetW; x++) {
      const srcX = ((x + 0.5) / scaleX) - 0.5;
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(srcW - 1, Math.ceil(srcX));
      const dx = srcX - x0;

      const p00 = cam7x7[y0 * srcW + x0] ?? 0;
      const p10 = cam7x7[y0 * srcW + x1] ?? 0;
      const p01 = cam7x7[y1 * srcW + x0] ?? 0;
      const p11 = cam7x7[y1 * srcW + x1] ?? 0;

      const top = p00 * (1 - dx) + p10 * dx;
      const bot = p01 * (1 - dx) + p11 * dx;
      out[y * targetW + x] = top * (1 - dy) + bot * dy;
    }
  }

  return out;
}
