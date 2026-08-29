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

  // A1 / A2 — konsumi: numri i fundit i rreshtit standalone "A1"/"A2" (jo "A1/B1")
  for (const line of text.split('\n')) {
    const s = line.trim().toUpperCase();
    if (/^A\s*1\b(?!\s*\/)/.test(s) && out.dayKwh === null) {
      const vals = (s.slice(2).match(/\d[\d.,]*/g) || []).map(numSq).filter((v) => v && v > 0);
      if (vals.length) out.dayKwh = vals[vals.length - 1];
    }
    if (/^A\s*2\b(?!\s*\/)/.test(s) && out.nightKwh === null) {
      const vals = (s.slice(2).match(/\d[\d.,]*/g) || []).map(numSq).filter((v) => v && v > 0);
      if (vals.length) out.nightKwh = vals[vals.length - 1];
    }
  }

  out.found = ['dpr', 'month', 'dayKwh', 'nightKwh'].filter((k) => out[k] != null).length;
  return out;
};

// Dërgon imazhin (data URL base64) te OCR.space dhe kthen fushat e nxjerra.
// Hedh gabim nëse s'arrihet shërbimi ose çelësi është i pavlefshëm.
export const ocrSpaceExtract = async (base64DataUrl) => {
  const form = new FormData();
  form.append('apikey', OCR_KEY);
  form.append('OCREngine', '2');
  form.append('scale', 'true');
  form.append('isTable', 'true');
  form.append('language', 'eng');
  form.append('base64Image', base64DataUrl);

  const res = await fetch(OCR_URL, { method: 'POST', body: form });
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
