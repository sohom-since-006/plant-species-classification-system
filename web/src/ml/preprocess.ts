/**
 * Preprocess an image for model input.
 * Resize shorter side to 256, center crop 224, normalize with ImageNet stats.
 * Full implementation in Phase 4.
 */
export function preprocessImage(_image: ImageBitmap): Float32Array {
  return new Float32Array(3 * 224 * 224);
}

