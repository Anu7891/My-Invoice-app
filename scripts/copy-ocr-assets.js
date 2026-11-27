// Copies the free, open-source Tesseract OCR files from node_modules into
// public/ocr so photo scanning works fully offline (no CDN, no API key).
// Runs automatically after `npm install` and before `npm start` / `npm run build`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'ocr');

const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];

let copied = 0;
for (const [from, to] of files) {
  const src = path.join(root, from);
  const dest = path.join(out, to);
  if (!fs.existsSync(src)) {
    console.warn(`[ocr] missing ${from} — run "npm install" first`);
    continue;
  }
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied += 1;
}
if (copied) console.log(`[ocr] copied ${copied} OCR file(s) to public/ocr`);
