import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../node_modules/onnxruntime-web/dist');
const destDir = path.resolve(__dirname, '../public/wasm');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  let count = 0;
  for (const file of files) {
    if (
      file.startsWith('ort-wasm-simd-threaded') &&
      (file.endsWith('.wasm') || file.endsWith('.mjs'))
    ) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
      count++;
    }
  }
  console.log(`[copy-ort-wasm] Successfully copied ${count} WASM/MJS assets to public/wasm/`);
} else {
  console.warn(`[copy-ort-wasm] Source directory ${srcDir} does not exist. Skipping copy.`);
}
