# Golden Parity Test Fixtures

This directory contains 10 synthetic, procedurally generated botanical textures and their
exact ground-truth PyTorch outputs. These fixtures are used by browser integration tests
(Playwright / Vitest in the Web Worker) to guarantee zero numerical drift between the Python
inference pipeline and TypeScript/WASM client execution.

## Files
- `images/golden_01.png` to `golden_10.png`: Procedural 8-bit RGB test images.
- `expected_outputs.json`: Expected calibrated top-5 species probabilities and first 8 embedding values.
- `README.md`: This specification file.

## Exact Preprocessing Steps (TRD Section 5)
Browser client code must strictly match these steps:

1. **Color Decoding**: Load image into an RGB representation (uint8 in `[0, 255]`, 3 channels).
2. **Aspect-Preserving Resize**:
   - Determine shorter dimension: `min(width, height)`.
   - Scale the shorter dimension to exactly **256 pixels** while preserving the aspect ratio.
   - Resize algorithm: **Bilinear interpolation** (`Image.Resampling.BILINEAR` / HTML5 Canvas 2D bilinear drawImage).
3. **Center Crop**:
   - Crop a 224 x 224 square from the center of the 256-resized image:
     - `left = (resized_width - 224) // 2`
     - `top = (resized_height - 224) // 2`
     - `right = left + 224`
     - `bottom = top + 224`
4. **Channel Normalization (ImageNet Standard)**:
   - Convert pixel byte values to `float32` in `[0.0, 1.0]`: `pixel / 255.0`.
   - Normalize per channel: `normalized_val = (val - mean[c]) / std[c]`
   - Mean: `[0.485, 0.456, 0.406]` (R, G, B)
   - Std: `[0.229, 0.224, 0.225]` (R, G, B)
5. **Tensor Shape**:
   - Shape: `[1, 3, 224, 224]` in NCHW layout (channel first).
6. **Calibration**:
   - Raw model logits are divided by temperature **T = 0.7181** before softmax.
