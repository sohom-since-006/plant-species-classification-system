import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as ort from 'onnxruntime-web';
import { preprocessRawData } from '@/ml/preprocess';
import { computeCalibratedProbabilities } from '@/ml/postprocess';

interface ExpectedFixture {
  fixture_id: number;
  filename: string;
  temperature: number;
  top5_predictions: Array<{
    rank: number;
    class_idx: number;
    species_id: number;
    common_name: string;
    scientific_name: string;
    probability: number;
  }>;
  embedding_first_8: number[];
}

interface ExpectedJson {
  temperature: number;
  fixtures: ExpectedFixture[];
}

/**
 * Pure TypeScript PNG decoder using Node's built-in zlib.
 * Ensures zero external native dependency requirements during Vitest execution.
 */
function decodePngFile(filePath: string) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      colorType = buf[pos + 17] ?? 2;
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = 1 + width * channels;
  const data = new Uint8Array(width * height * channels);
  let prevRow = new Uint8Array(width * channels);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filter = decompressed[rowStart];
    const currRow = new Uint8Array(width * channels);

    for (let x = 0; x < width * channels; x++) {
      const raw = decompressed[rowStart + 1 + x] ?? 0;
      const a = x >= channels ? (currRow[x - channels] ?? 0) : 0;
      const b = prevRow[x] ?? 0;
      const c = x >= channels ? (prevRow[x - channels] ?? 0) : 0;

      let val = raw;
      if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
        val = (raw + pr) & 0xff;
      }
      currRow[x] = val;
    }

    data.set(currRow, y * width * channels);
    prevRow = currRow;
  }

  return { width, height, channels, data };
}

describe('Golden Parity Test (PyTorch vs Browser ONNX Runtime)', () => {
  const goldenDir = path.resolve(__dirname, '../../tests/fixtures/golden');
  const expectedJsonPath = path.join(goldenDir, 'expected_outputs.json');
  const modelV2Path = path.resolve(__dirname, '../../public/models/plant_model.v2.1.0.onnx');
  const modelDefaultPath = path.resolve(__dirname, '../../public/models/plant_model.onnx');
  const modelPath = fs.existsSync(modelV2Path) ? modelV2Path : modelDefaultPath;

  const hasGolden = fs.existsSync(expectedJsonPath);
  const hasModel = fs.existsSync(modelPath);

  it.skipIf(!hasGolden || !hasModel)('verifies exact parity on 10 deterministic golden fixtures', async () => {
    const rawExpected = fs.readFileSync(expectedJsonPath, 'utf-8');
    const expected = JSON.parse(rawExpected) as ExpectedJson;
    const temperature = expected.temperature || 0.7181;

    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
    });

    let maxProbDiffAcrossAll = 0;
    let sumProbDiff = 0;
    let countPredictions = 0;

    for (const fixture of expected.fixtures) {
      const imgPath = path.join(goldenDir, fixture.filename);
      const decoded = decodePngFile(imgPath);
      const tensor = preprocessRawData(decoded);

      const inputTensor = new ort.Tensor('float32', tensor, [1, 3, 224, 224]);
      const outputs = await session.run({ input: inputTensor });

      const logits = outputs.logits?.data as Float32Array;
      const embedding = outputs.embedding?.data as Float32Array;

      expect(logits).toBeDefined();
      expect(embedding).toBeDefined();

      // Calibrated probabilities with temperature scaling
      const probs = computeCalibratedProbabilities(logits, temperature);

      // Verify top-5 predictions against PyTorch ground truth
      for (const expectedPred of fixture.top5_predictions) {
        const actualProb = probs[expectedPred.species_id] ?? 0;
        const diff = Math.abs(actualProb - expectedPred.probability);

        if (diff > maxProbDiffAcrossAll) {
          maxProbDiffAcrossAll = diff;
        }
        sumProbDiff += diff;
        countPredictions++;

        // Each individual prediction matches within 2.0e-3
        expect(diff).toBeLessThan(2.0e-3);
      }

      // Verify embedding first 8 values match PyTorch embeddings within 0.05
      for (let i = 0; i < 8; i++) {
        const actualVal = embedding[i] ?? 0;
        const expectedVal = fixture.embedding_first_8[i] ?? 0;
        expect(Math.abs(actualVal - expectedVal)).toBeLessThan(0.05);
      }
    }

    const meanProbDiff = sumProbDiff / countPredictions;
    // Mean difference across all 50 predictions is well under 5e-4
    expect(meanProbDiff).toBeLessThan(5e-4);
    expect(maxProbDiffAcrossAll).toBeLessThan(2.0e-3);
  }, 30000);
});
