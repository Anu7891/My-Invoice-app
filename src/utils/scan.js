// Photo scanning (OCR) — 100% free and offline.
// Uses Tesseract (open source) running inside the browser. The engine and the
// English language file are served from /public/ocr (copied there by
// scripts/copy-ocr-assets.js), so no internet, account or API key is needed.

const BASE = `${process.env.PUBLIC_URL || ''}/ocr`;
// Note: printed slips read well. Handwriting can't be read reliably by free OCR —
// those fields are left for the user (with smart defaults) in the scan screen.
let workerPromise = null;
let progressListener = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng', 1, {
        workerPath: `${BASE}/worker.min.js`,
        corePath: `${BASE}/core`,
        langPath: `${BASE}/lang`,
        gzip: true,
        logger: (m) => progressListener && progressListener(m),
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => resolve({ img: i, url });
    i.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not open this image.'));
    };
    i.src = url;
  });

/**
 * Cleans up a phone photo so the text is easier to read.
 *  mode 'clean' – uses the brightest colour channel (makes pink / yellow / blue carbon-copy
 *                 paper turn white) + local thresholding (removes shadows and folds).
 *  mode 'gray'  – plain grayscale with contrast stretch (better for clean printouts).
 */
async function preprocess(file, { mode = 'clean', rotate = 0 } = {}) {
  const { img, url } = await loadImage(file);
  try {
    const maxSide = Math.max(img.width, img.height);
    const target = mode === 'clean' ? 2000 : 1800;
    const scale = Math.min(2.5, target / maxSide);
    const w0 = Math.round(img.width * scale);
    const h0 = Math.round(img.height * scale);
    const quarter = ((rotate % 360) + 360) % 360;
    const swap = quarter === 90 || quarter === 270;
    const w = swap ? h0 : w0;
    const h = swap ? w0 : h0;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.translate(w / 2, h / 2);
    ctx.rotate((quarter * Math.PI) / 180);
    ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const n = w * h;
    const g = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) {
      g[j] = mode === 'clean'
        ? Math.max(px[i], px[i + 1], px[i + 2]) // coloured paper -> white, dark ink stays dark
        : 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }

    if (mode === 'clean') {
      // Local (adaptive) threshold with an integral image — handles shadows and creases.
      const integral = new Uint32Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) {
          row += g[y * w + x];
          integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
        }
      }
      const r = Math.max(8, Math.round(Math.min(w, h) / 40));
      for (let y = 0; y < h; y++) {
        const y1 = Math.max(0, y - r);
        const y2 = Math.min(h, y + r + 1);
        for (let x = 0; x < w; x++) {
          const x1 = Math.max(0, x - r);
          const x2 = Math.min(w, x + r + 1);
          const sum =
            integral[y2 * (w + 1) + x2] - integral[y1 * (w + 1) + x2] - integral[y2 * (w + 1) + x1] + integral[y1 * (w + 1) + x1];
          const mean = sum / ((x2 - x1) * (y2 - y1));
          const v = g[y * w + x] < mean * 0.82 ? 0 : 255;
          const k = (y * w + x) * 4;
          px[k] = px[k + 1] = px[k + 2] = v;
        }
      }
    } else {
      let min = 255;
      let max = 0;
      for (let j = 0; j < n; j++) {
        if (g[j] < min) min = g[j];
        if (g[j] > max) max = g[j];
      }
      const range = Math.max(1, max - min);
      for (let j = 0, k = 0; j < n; j++, k += 4) {
        px[k] = px[k + 1] = px[k + 2] = ((g[j] - min) * 255) / range;
      }
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Reads the text in an image, trying more than one clean-up if needed.
 * pickBest(texts) -> { text, done } decides when a result is good enough.
 * onProgress gets a number 0..1.
 */
export async function readImageText(file, onProgress, { rotate = 0, isGoodEnough = () => false } = {}) {
  const modes = ['clean', 'gray'];
  const texts = [];
  const worker = await getWorker();
  for (let p = 0; p < modes.length; p++) {
    const span = 1 / modes.length;
    progressListener = (m) => {
      if (onProgress && m.status === 'recognizing text') onProgress(Math.min(0.99, (p + m.progress) * span));
    };
    onProgress && onProgress(p * span + 0.02);
    const canvas = await preprocess(file, { mode: modes[p], rotate });
    const { data } = await worker.recognize(canvas);
    texts.push(data.text || '');
    if (isGoodEnough(data.text || '')) break;
  }
  onProgress && onProgress(1);
  return texts;
}

// ---------------------------------------------------------------------------
// Parsing: turn OCR text from a weighbridge slip / challan into fields.
// ---------------------------------------------------------------------------

const STATE_CODES = new Set(
  'AN AP AR AS BR CG CH DD DL DN GA GJ HP HR JH JK KA KL LA LD MH ML MN MP MZ NL OD OR PB PY RJ SK TN TR TS UK UP WB'.split(' ')
);

export function findTruckNo(text) {
  const up = text.toUpperCase();
  // OCR often confuses digits with letters (O/0, I/1, S/5, B/8, Z/2) — accept them in number spots.
  const re = /\b([A-Z]{2})[\s\-.]*([0-9OIL]{1,2})[\s\-.]*([A-Z]{0,3}?)[\s\-.]*([0-9OILSBZ]{4})\b/g;
  let m;
  while ((m = re.exec(up))) {
    if (!STATE_CODES.has(m[1])) continue;
    const fix = (s) => s.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
    return `${m[1]}${fix(m[2]).padStart(2, '0')}${m[3]}${fix(m[4])}`;
  }
  return '';
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const toISO = (d, m, y) => {
  let year = Number(y);
  if (year < 100) year += 2000;
  const day = Number(d);
  const month = Number(m);
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export function findDate(text) {
  const numeric = /\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})\b/g;
  let m;
  while ((m = numeric.exec(text))) {
    const iso = toISO(m[1], m[2], m[3]);
    if (iso) return iso;
  }
  const named = /\b(\d{1,2})[\s\-./]*([A-Za-z]{3,9})[\s\-.,/]*(\d{4}|\d{2})\b/g;
  while ((m = named.exec(text))) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 4)] || MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mon) {
      const iso = toISO(m[1], mon, m[3]);
      if (iso) return iso;
    }
  }
  return '';
}

const NUM = /(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

const numbersIn = (s) => (s.match(NUM) || []).map((x) => parseFloat(x.replace(/,/g, '')));

/** Finds a weight (in kg) on the line containing one of the keywords. */
function weightFor(lines, keywords) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const k = keywords.find((kw) => lower.includes(kw));
    if (!k) continue;
    const after = line.slice(lower.indexOf(k) + k.length);
    // Ignore times like 10:45 and dates on the same line
    const cleaned = after.replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ').replace(/\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/g, ' ');
    let nums = numbersIn(cleaned);
    if (!nums.length && lines[i + 1]) nums = numbersIn(lines[i + 1]);
    const isTons = /\b(ton|tons|mt|tonne)\b/i.test(line);
    for (const n of nums) {
      const kg = isTons || n < 100 ? n * 1000 : n;
      if (kg >= 100 && kg <= 200000) return Math.round(kg);
    }
  }
  return null;
}

export function findWeights(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const gross = weightFor(lines, ['gross', 'loaded', 'first weight', '1st weight', 'first wt', '1st wt']);
  const tare = weightFor(lines, ['tare', 'empty', 'unloaded', 'second weight', '2nd weight', 'second wt', '2nd wt']);
  let net = weightFor(lines, ['net weight', 'net wt', 'nett', 'net']);
  let mismatch = false;
  if (gross && tare && gross > tare) {
    const diff = gross - tare;
    if (!net) net = diff;
    else if (Math.abs(net - diff) > 2) mismatch = true; // let the user double-check
  }
  if (!net) {
    // Fallback: biggest number written with "kg"
    const kgs = Array.from(text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*kg/gi)).map((m) => parseFloat(m[1].replace(/,/g, '')));
    const best = kgs.filter((n) => n >= 100 && n <= 200000).sort((a, b) => b - a)[0];
    if (best) net = Math.round(best);
  }
  return { gross, tare, net, mismatch };
}

const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
const GENERIC = new Set(['industries', 'private', 'limited', 'metals', 'minerals', 'steel', 'pipes', 'shree', 'shri', 'gujarat', 'surat', 'road', 'plot', 'estate']);

export function findClient(text, clients) {
  const hay = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const c of clients) {
    const ws = words(c.name).filter((w) => !GENERIC.has(w));
    let score = ws.filter((w) => hay.includes(w)).length;
    const gst = String(c.gstNumber || '').replace(/^GSTIN:\s*/i, '').trim();
    if (gst && hay.replace(/\s/g, '').includes(gst.toLowerCase())) score += 5;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Known values (from your past invoices) that appear in the text, in reading order. */
export function findKnown(text, values) {
  const hay = text.toLowerCase();
  return values
    .map((v) => ({ v, i: hay.indexOf(String(v).toLowerCase()) }))
    .filter((x) => x.v && x.v.length >= 3 && x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.v);
}

export function parseSlip(text, { clients = [], places = [], deliveredTo = [] } = {}) {
  const { gross, tare, net, mismatch } = findWeights(text);
  const knownPlaces = findKnown(text, places);
  const client = findClient(text, clients);
  return {
    truckNo: findTruckNo(text),
    date: findDate(text),
    gross,
    tare,
    net,
    weightMismatch: mismatch,
    clientId: client ? client.id : '',
    fromLocation: knownPlaces[0] || '',
    toLocation: knownPlaces[1] || '',
    deliveredTo: findKnown(text, deliveredTo)[0] || '',
  };
}

/** How useful a parse result is — used to pick the best of several readings. */
export const scoreFields = (f) =>
  (f.net ? 4 : 0) + (f.date ? 2 : 0) + (f.truckNo ? 2 : 0) + (f.gross ? 1 : 0) + (f.tare ? 1 : 0) + (f.clientId ? 1 : 0);
