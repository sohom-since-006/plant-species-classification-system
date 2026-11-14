import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getExifOrientation,
  getTransformedDimensions,
} from '@/ml/exif';
import {
  pillowBilinearResize,
  preprocessRawData,
  CROP_SIZE,
} from '@/ml/preprocess';

describe('EXIF Orientation and Large Image Preprocessing Regression Tests', () => {
  const photoPath = path.resolve(__dirname, '../../../ml/data/my_photos/aloe_vera/20261113_153035.jpg');

  it('correctly detects EXIF Orientation 6 on real phone photo (4000x3000)', () => {
    if (!fs.existsSync(photoPath)) {
      return;
    }
    const buf = fs.readFileSync(photoPath);
    const orientation = getExifOrientation(buf.buffer);
    expect(orientation).toBe(6);
  });

  it('correctly maps all 8 EXIF orientations to transformed dimensions', () => {
    // Landscape photo: 4000 wide x 3000 tall
    const rawW = 4000;
    const rawH = 3000;

    // Orientations 1-4 preserve dimensions
    expect(getTransformedDimensions(rawW, rawH, 1)).toEqual({ width: 4000, height: 3000 });
    expect(getTransformedDimensions(rawW, rawH, 2)).toEqual({ width: 4000, height: 3000 });
    expect(getTransformedDimensions(rawW, rawH, 3)).toEqual({ width: 4000, height: 3000 });
    expect(getTransformedDimensions(rawW, rawH, 4)).toEqual({ width: 4000, height: 3000 });

    // Orientations 5-8 swap width and height (portrait orientation when upright)
    expect(getTransformedDimensions(rawW, rawH, 5)).toEqual({ width: 3000, height: 4000 });
    expect(getTransformedDimensions(rawW, rawH, 6)).toEqual({ width: 3000, height: 4000 });
    expect(getTransformedDimensions(rawW, rawH, 7)).toEqual({ width: 3000, height: 4000 });
    expect(getTransformedDimensions(rawW, rawH, 8)).toEqual({ width: 3000, height: 4000 });
  });

  it('correctly detects all 8 EXIF orientations from synthetic test suite if present', () => {
    const scratchDir = path.resolve(__dirname, '../../../scratch_exif');
    if (!fs.existsSync(scratchDir)) return;

    for (let o = 1; o <= 8; o++) {
      const file = path.join(scratchDir, `orient_${o}.jpg`);
      if (fs.existsSync(file)) {
        const buf = fs.readFileSync(file);
        const detected = getExifOrientation(buf.buffer);
        expect(detected).toBe(o);
      }
    }
  });

  it('resizes large raw image data (2048x1536) to [1, 3, 224, 224] without NaN or Inf', () => {
    const w = 2048;
    const h = 1536;
    // Generate synthetic patterned data
    const data = new Uint8Array(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (i * 17) & 0xff; // R
      data[i + 1] = (i * 31) & 0xff; // G
      data[i + 2] = (i * 47) & 0xff; // B
      data[i + 3] = 255; // A
    }

    const tensor = preprocessRawData({
      data,
      width: w,
      height: h,
      channels: 4,
    });

    expect(tensor.length).toBe(3 * CROP_SIZE * CROP_SIZE);
    expect(tensor.length).toBe(150528);

    // Verify all values are valid finite normalized floats
    for (let i = 0; i < tensor.length; i++) {
      expect(Number.isFinite(tensor[i])).toBe(true);
      // Normalized values typically stay within [-3.0, 3.0]
      expect(tensor[i]).toBeGreaterThan(-4.0);
      expect(tensor[i]).toBeLessThan(4.0);
    }
  });

  it('pillowBilinearResize downscales correctly preserving area average support', () => {
    const inW = 100;
    const inH = 100;
    const outW = 25;
    const outH = 25;
    const src = new Uint8Array(inW * inH * 3).fill(128);

    const out = pillowBilinearResize(src, inW, inH, outW, outH, 3);
    expect(out.length).toBe(outW * outH * 3);

    // Solid color 128 should resize to solid color ~128
    for (let i = 0; i < out.length; i++) {
      expect(Math.abs(out[i]! - 128)).toBeLessThan(1.0);
    }
  });
});
