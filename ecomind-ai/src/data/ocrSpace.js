// =============================================================================
// Integrim me OCR.space (falas) për të lexuar faturat KESCO.
// Punon direkt nga browser-i (pa backend). Merr një çelës falas te
// https://ocr.space/ocrapi dhe vendose te EXPO_PUBLIC_OCRSPACE_KEY (ose më poshtë).
// =============================================================================

// Çelësi: mundësisht nga env; "helloworld" është çelësi demo (i kufizuar) për testim.
const OCR_KEY = process.env.EXPO_PUBLIC_OCRSPACE_KEY || 'K89453941688957';
const OCR_URL = 'https://api.ocr.space/parse/image';

const numSq = (s) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return isNaN(v) ? null : v;
};

// Nxjerr fushat kryesore nga teksti i lexuar (best-effort, sipas layout-it KESCO)
export const parseKescoText = (text) => {
  const out = { dpr: null, month: null, dayKwh: null, nightKwh: null, found: 0, rawText: text };
  if (!text) return out;
  const U = text.toUpperCase();

  // DPR / Shifra e konsumatorit — prefiksi specifik "DPR", jo NUI/PDV/TVSH
  let m = U.match(/\bDPR\s*[-:]?\s*([0-9]{4,})/);
  if (m) out.dpr = `DPR ${m[1]}`;

  // Muaji / Periudha: MM-YYYY ose MM/YYYY
  m = text.match(/\b(0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (m) out.month = `${String(parseInt(m[1], 10)).padStart(2, '0')}-${m[2]}`;

  // A1 / A2 — konsumi (kolona "Diferenca"): numri i fundit i rreshtit standalone
  // "A1"/"A2" (JO "A1 / B1"/"A1-B1", ato janë blloqet tarifore). Nëse rreshti i
  // etiketës s'ka numra (OCR i ndau kolonat në rresht të veçantë), e marrim nga
  // rreshti pasues. Kështu punon me faturat reale KESCO ku vlera është larg djathtas.
  const grabLast = (str) => {
    const vals = (String(str).match(/\d[\d.,]*/g) || []).map(numSq).filter((v) => v && v > 0);
    return vals.length ? vals[vals.length - 1] : null;
  };
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim().toUpperCase();
    if (/^A\s*1\b(?![\s]*[-/])/.test(s) && out.dayKwh === null) {
      let v = grabLast(s.slice(2));
      if (v === null && i + 1 < lines.length) v = grabLast(lines[i + 1]);
      if (v !== null) out.dayKwh = v;
    }
    if (/^A\s*2\b(?![\s]*[-/])/.test(s) && out.nightKwh === null) {
      let v = grabLast(s.slice(2));
      if (v === null && i + 1 < lines.length) v = grabLast(lines[i + 1]);
      if (v !== null) out.nightKwh = v;
    }
  }

  out.found = ['dpr', 'month', 'dayKwh', 'nightKwh'].filter((k) => out[k] != null).length;
  return out;
};

// Zvogëlon imazhin në browser përpara dërgimit te OCR.space.
// ARSYEJA: plani falas i OCR.space e refuzon imazhin > ~1MB me HTTP 413,
// dhe fotot reale të telefonit janë 2–4MB → skanimi "dështonte". Përveç kësaj,
// një imazh më i vogël e bën OCR-në shumë më të shpejtë (nga ~17s në <1s).
// Nëse s'ka 'document'/'Image' (p.sh. native), kthen imazhin origjinal.
const downscaleDataUrl = (dataUrl, maxDim = 1500, quality = 0.6) =>
  new Promise((resolve) => {
    try {
      if (typeof document === 'undefined' || typeof Image === 'undefined') return resolve(dataUrl);
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.width, h = im.height;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          cv.getContext('2d').drawImage(im, 0, 0, cw, ch);
          resolve(cv.toDataURL('image/jpeg', quality));
        } catch (_) { resolve(dataUrl); }
      };
      im.onerror = () => resolve(dataUrl);
      im.src = dataUrl;
    } catch (_) { resolve(dataUrl); }
  });

// Dërgon imazhin (data URL base64) te OCR.space dhe kthen fushat e nxjerra.
// Hedh gabim nëse s'arrihet shërbimi ose çelësi është i pavlefshëm.
export const ocrSpaceExtract = async (base64DataUrl) => {
  // 1) Zvogëlojmë që të rrijë nën limitin ~1MB të OCR.space (falas) dhe OCR të jetë e shpejtë
  let img = await downscaleDataUrl(base64DataUrl, 1500, 0.6);
  let guard = 0;
  while (img && img.length * 0.75 > 1000 * 1024 && guard++ < 3) {
    img = await downscaleDataUrl(img, 1200, 0.5);
  }

  const form = new FormData();
  form.append('apikey', OCR_KEY);
  form.append('OCREngine', '2');
  form.append('scale', 'true');
  form.append('isTable', 'true');
  form.append('language', 'eng');
  form.append('base64Image', img || base64DataUrl);

  const res = await fetch(OCR_URL, { method: 'POST', body: form });

  if (res.status === 413) {
    const err = new Error('Fotoja është shumë e madhe. Provoni një foto më të vogël ose fut faturën manualisht.');
    err.ocrError = true;
    throw err;
  }

  const j = await res.json().catch(() => null);

  if (!j || j.IsErroredOnProcessing) {
    const msg = (j && (Array.isArray(j.ErrorMessage) ? j.ErrorMessage.join(' ') : j.ErrorMessage)) || 'OCR dështoi';
    const err = new Error(msg);
    err.ocrError = true;
    throw err;
  }
  const text = j.ParsedResults && j.ParsedResults[0] ? j.ParsedResults[0].ParsedText : '';
  return parseKescoText(text || '');
};
