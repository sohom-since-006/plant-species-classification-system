/**
 * Preprocessing pipeline for on-device plant species classification.
 * Matches TRD Section 5 & web/tests/fixtures/golden/README.md:
 * 1. Aspect-preserving resize: shorter dimension to 256 using bilinear interpolation.
 * 2. Center crop to 224 x 224.
 * 3. Channel normalization using ImageNet statistics (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]).
 * 4. Layout: NCHW float32 array [1, 3, 224, 224].
 * 5. Handles transparent PNGs (white composite), EXIF orientation, and huge images (>2048px).
 */

export const IMAGENET_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
export const IMAGENET_STD: [number, number, number] = [0.229, 0.224, 0.225];
export const RESIZE_SHORTER_DIM = 256;
export const CROP_SIZE = 224;
export const MAX_INPUT_DIMENSION = 2048;

export interface RawImageData {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  channels?: number; // default 3 or 4
}

/**
 * High-fidelity separable bilinear resampling matching Pillow/Torchvision.
 * Uses area-averaging support radius when downsampling to prevent aliasing.
 */
export function pillowBilinearResize(
  srcData: Uint8Array | Uint8ClampedArray,
  inW: number,
  inH: number,
  outW: number,
  outH: number,
  channels = 3,
): Float32Array {
  // Pass 1: Horizontal resize
  const scaleX = outW / inW;
  const filterSupportX = scaleX < 1.0 ? 1.0 / scaleX : 1.0;
  const scaleFilterX = scaleX < 1.0 ? scaleX : 1.0;

  const temp = new Float32Array(outW * inH * 3);
  for (let x = 0; x < outW; x++) {
    const center = ((x + 0.5) * inW) / outW;
    let xMin = Math.floor(center - filterSupportX + 0.5);
    if (xMin < 0) xMin = 0;
    let xMax = Math.ceil(center + filterSupportX - 0.5);
    if (xMax >= inW) xMax = inW - 1;

    const weights: { ix: number; w: number }[] = [];
    let sumW = 0;
    for (let ix = xMin; ix <= xMax; ix++) {
      const d = Math.abs(ix + 0.5 - center) * scaleFilterX;
      if (d < 1.0) {
        const w = 1.0 - d;
        weights.push({ ix, w });
        sumW += w;
      }
    }

    if (sumW === 0) sumW = 1.0;

    for (let y = 0; y < inH; y++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const item of weights) {
        const normW = item.w / sumW;
        const idx = (y * inW + item.ix) * channels;
        // Composite transparent pixels over solid white if alpha is present
        let pr = srcData[idx] ?? 0;
        let pg = srcData[idx + 1] ?? 0;
        let pb = srcData[idx + 2] ?? 0;
        if (channels === 4) {
          const a = (srcData[idx + 3] ?? 255) / 255.0;
          pr = Math.round(pr * a + 255 * (1.0 - a));
          pg = Math.round(pg * a + 255 * (1.0 - a));
          pb = Math.round(pb * a + 255 * (1.0 - a));
        }
        r += pr * normW;
        g += pg * normW;
        b += pb * normW;
      }
      const outIdx = (y * outW + x) * 3;
      temp[outIdx] = r;
      temp[outIdx + 1] = g;
      temp[outIdx + 2] = b;
    }
  }

  // Pass 2: Vertical resize
  const scaleY = outH / inH;
  const filterSupportY = scaleY < 1.0 ? 1.0 / scaleY : 1.0;
  const scaleFilterY = scaleY < 1.0 ? scaleY : 1.0;

  const out = new Float32Array(outW * outH * 3);
  for (let y = 0; y < outH; y++) {
    const center = ((y + 0.5) * inH) / outH;
    let yMin = Math.floor(center - filterSupportY + 0.5);
    if (yMin < 0) yMin = 0;
    let yMax = Math.ceil(center + filterSupportY - 0.5);
    if (yMax >= inH) yMax = inH - 1;

    const weights: { iy: number; w: number }[] = [];
    let sumW = 0;
    for (let iy = yMin; iy <= yMax; iy++) {
      const d = Math.abs(iy + 0.5 - center) * scaleFilterY;
      if (d < 1.0) {
        const w = 1.0 - d;
        weights.push({ iy, w });
        sumW += w;
      }
    }

    if (sumW === 0) sumW = 1.0;

    for (let x = 0; x < outW; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const item of weights) {
        const normW = item.w / sumW;
        const idx = (item.iy * outW + x) * 3;
        r += (temp[idx] ?? 0) * normW;
        g += (temp[idx + 1] ?? 0) * normW;
        b += (temp[idx + 2] ?? 0) * normW;
      }
      const outIdx = (y * outW + x) * 3;
      out[outIdx] = r;
      out[outIdx + 1] = g;
      out[outIdx + 2] = b;
    }
  }

  return out;
}

/**
 * Preprocesses raw RGB/RGBA image data into an NCHW [1, 3, 224, 224] Float32Array.
 */
export function preprocessRawData(raw: RawImageData): Float32Array {
  const { width, height, data, channels = 3 } = raw;
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  // 1. Determine aspect-preserving dimensions (shorter side to 256)
  let targetW: number;
  let targetH: number;
  if (width < height) {
    targetW = RESIZE_SHORTER_DIM;
    targetH = Math.round((RESIZE_SHORTER_DIM * height) / width);
  } else {
    targetH = RESIZE_SHORTER_DIM;
    targetW = Math.round((RESIZE_SHORTER_DIM * width) / height);
  }

  // 2. Bilinear resize
  const resizedRgb = pillowBilinearResize(data, width, height, targetW, targetH, channels);

  // 3. Center crop 224x224
  const cropLeft = Math.floor((targetW - CROP_SIZE) / 2);
  const cropTop = Math.floor((targetH - CROP_SIZE) / 2);

  // 4. Normalize and pack into NCHW layout
  const tensor = new Float32Array(3 * CROP_SIZE * CROP_SIZE);
  const channelStride = CROP_SIZE * CROP_SIZE;

  for (let c = 0; c < 3; c++) {
    const mean = IMAGENET_MEAN[c] ?? 0.485;
    const std = IMAGENET_STD[c] ?? 0.229;
    const offset = c * channelStride;

    for (let y = 0; y < CROP_SIZE; y++) {
      const srcY = cropTop + y;
      const rowOffset = srcY * targetW;
      const destRowOffset = offset + y * CROP_SIZE;

      for (let x = 0; x < CROP_SIZE; x++) {
        const srcX = cropLeft + x;
        const pixelVal = resizedRgb[(rowOffset + srcX) * 3 + c] ?? 0;
        // ImageNet normalization: (pixel / 255.0 - mean) / std
        tensor[destRowOffset + x] = (pixelVal / 255.0 - mean) / std;
      }
    }
  }

  return tensor;
}

/**
 * Preprocesses browser image sources (ImageBitmap, HTMLImageElement, HTMLCanvasElement, ImageData).
 */
export function preprocessImage(
  image: ImageBitmap | HTMLImageElement | HTMLCanvasElement | ImageData | RawImageData,
): Float32Array {
  // If already raw data structure
  if ('data' in image && typeof image.width === 'number' && typeof image.height === 'number') {
    return preprocessRawData(image as RawImageData);
  }

  // Browser Canvas environment: extract RGBA pixels
  const width = 'width' in image ? Number(image.width) : 0;
  const height = 'height' in image ? Number(image.height) : 0;

  // Handle huge images: downscale if larger than MAX_INPUT_DIMENSION
  let processW = width;
  let processH = height;
  if (width > MAX_INPUT_DIMENSION || height > MAX_INPUT_DIMENSION) {
    if (width > height) {
      processW = MAX_INPUT_DIMENSION;
      processH = Math.round((MAX_INPUT_DIMENSION * height) / width);
    } else {
      processH = MAX_INPUT_DIMENSION;
      processW = Math.round((MAX_INPUT_DIMENSION * width) / height);
    }
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(processW, processH);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = processW;
    canvas.height = processH;
  } else {
    throw new Error('Canvas rendering context is not available in this environment.');
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas rendering context.');
  }

  // Ensure high-quality antialiasing when downscaling large photos
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw white background to handle transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, processW, processH);
  // Draw the image
  ctx.drawImage(image as CanvasImageSource, 0, 0, processW, processH);

  const imgData = ctx.getImageData(0, 0, processW, processH);
  return preprocessRawData({
    data: imgData.data,
    width: processW,
    height: processH,
    channels: 4,
  });
}
