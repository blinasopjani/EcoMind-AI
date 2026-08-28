/**
 * ocrService.js — OCR i faturës KESCO në browser me tesseract.js
 *
 * Funksioni kryesor: scanBillWithOCR(imageUri) → { dayKwh, nightKwh, total, date, raw }
 *
 * Fatura KESCO ka strukturë të njohur:
 *   - A1 = Konsumi i ditës (kWh)
 *   - A2 = Konsumi i natës (kWh)
 *   - Totali i faturës / Shuma për pagesë
 *   - Data / Muaji i faturimit
 */

let _Tesseract = null;

/** Lazy-load tesseract.js vetëm kur thirret për herë të parë */
async function getTesseract() {
  if (_Tesseract) return _Tesseract;
  try {
    _Tesseract = await import('tesseract.js');
    return _Tesseract;
  } catch (e) {
    throw new Error('Tesseract.js nuk u ngarkua: ' + e.message);
  }
}

/**
 * Ekzekuton OCR dhe nxjerr të dhënat nga fatura KESCO.
 *
 * @param {string} imageUri  URI e imazhit (data:, blob:, ose https:)
 * @param {Function} [onProgress]  callback(percent: 0-100)
 * @returns {{ dayKwh: number, nightKwh: number, total: number, date: string, raw: string }}
 */
export async function scanBillWithOCR(imageUri, onProgress) {
  const Tesseract = await getTesseract();

  const { data } = await Tesseract.recognize(imageUri, 'eng+alb', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = data.text || '';
  return parseKescoText(text);
}

/**
 * Nxjerr të dhënat kryesore nga teksti i faturës KESCO.
 * Trajton variante të ndryshme shqipe/angleze që gjenden në fatura reale.
 */
function parseKescoText(raw) {
  const t = raw;

  // === A1 — Konsumi i ditës ===
  // "A1   809" | "A1: 809" | "Dita (A1) 809" | "Konsumi ditor 809"
  const a1Patterns = [
    /A\s*1[\s:–\-|]+(\d[\d.,]+)/i,
    /dit[aë].*?(\d[\d.,]+)\s*kWh/i,
    /Gjendja.*?A1.*?(\d[\d.,]+)/i,
    /konsum.*?dit[aë].*?(\d[\d.,]+)/i,
  ];
  const dayKwh = extractFirst(t, a1Patterns);

  // === A2 — Konsumi i natës ===
  const a2Patterns = [
    /A\s*2[\s:–\-|]+(\d[\d.,]+)/i,
    /nat[eë].*?(\d[\d.,]+)\s*kWh/i,
    /Gjendja.*?A2.*?(\d[\d.,]+)/i,
    /konsum.*?nat[eë].*?(\d[\d.,]+)/i,
  ];
  const nightKwh = extractFirst(t, a2Patterns);

  // === Totali / Shuma ===
  const totalPatterns = [
    /total[i]?\s+[iI]\s+fatur[eë]s?[\s:]+(\d[\d.,]+)/i,
    /shuma\s+(per|për)\s+pagesë?[\s:]+(\d[\d.,]+)/i,
    /total[i]?[\s:]+(\d[\d.,]+)\s*€/i,
    /Amount[\s:]+(\d[\d.,]+)/i,
    /(\d{1,3}[.,]\d{2})\s*€/,             // fallback: çdo vlerë me 2 decimale + €
  ];
  const total = extractFirst(t, totalPatterns);

  // === Data / Muaji ===
  const datePatterns = [
    /(?:Periudha|Data|Period|Date)[\s:]+([A-Za-zÀ-ž]+\s+\d{4})/i,
    /(\d{2}[.\/]\d{2}[.\/]\d{4})/,
    /([A-Za-zÀ-ž]{4,}\s+\d{4})/,           // p.sh. "Shkurt 2024"
  ];
  const date = extractFirstString(t, datePatterns);

  return { dayKwh, nightKwh, total, date: date || '', raw };
}

/** Nxjerr numrin e parë që gjendet (si float) nga lista e pattern-eve */
function extractFirst(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      // Grupo e fundit numerike (disa regex kanë 2 grupe)
      const raw = m[m.length - 1].replace(',', '.');
      const n = parseFloat(raw);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return 0;
}

/** Nxjerr stringun e parë që gjendet nga lista e pattern-eve */
function extractFirstString(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[m.length - 1] || m[1] || '').trim();
  }
  return '';
}
