"""
Ekstraktues best-effort i të dhënave nga faturat KESCO përmes OCR (Tesseract).

KUJDES / KUFIZIME:
- Faturat KESCO ndryshojnë (formate të ndryshme, foto reale me kënde/cilësi të ulët),
  prandaj OCR-ja NUK është 100% e besueshme. Ky modul kthen VETËM fushat që i gjen
  me njëfarë sigurie; fushat e tjera kthehen si None dhe plotësohen manualisht në app.
- Nëse s'gjendet asnjë fushë, app-i e ridrejton përdoruesin te futja manuale.

Kërkon: tesseract-ocr (binar), pytesseract, opencv-python-headless, numpy.
Përdorim:
    from app.core.kesco_ocr import extract_bill_fields
    data = extract_bill_fields("/path/te/fatura.jpg")
    # -> {"dpr":..., "month":..., "day_kwh":..., "night_kwh":..., "found": n}
"""
import re

try:
    import cv2
    import numpy as np
    import pytesseract
    _OCR_OK = True
except Exception:
    _OCR_OK = False


def _preprocess(path):
    img = cv2.imread(path)
    if img is None:
        return None
    h, w = img.shape[:2]
    scale = max(1.0, 1600.0 / max(h, w))
    if scale > 1.0:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 50, 50)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return th


def _num(s):
    try:
        return float(str(s).replace(",", "."))
    except Exception:
        return None


def _parse(text):
    out = {"dpr": None, "month": None, "day_kwh": None, "night_kwh": None, "found": 0}

    # DPR / Shifra e konsumatorit — prefiks specifik "DPR", jo NUI/PDV/TVSH
    m = re.search(r'\bDPR\s*[-:]?\s*([0-9]{4,})', text.upper())
    if m:
        out["dpr"] = f"DPR {m.group(1)}"

    # Muaji / Periudha: MM-YYYY ose MM/YYYY
    m = re.search(r'\b(0?[1-9]|1[0-2])[-/](20\d{2})\b', text)
    if m:
        out["month"] = f"{int(m.group(1)):02d}-{m.group(2)}"

    # A1 / A2 — konsumi (numri i fundit i rreshtit standalone "A1"/"A2", jo "A1/B1")
    for line in text.splitlines():
        s = line.strip().upper()
        if re.match(r'^A\s*1\b(?!\s*/)', s) and out["day_kwh"] is None:
            vals = [_num(x) for x in re.findall(r'\d[\d.,]*', s[2:])]
            vals = [v for v in vals if v is not None and v > 0]
            if vals:
                out["day_kwh"] = vals[-1]
        if re.match(r'^A\s*2\b(?!\s*/)', s) and out["night_kwh"] is None:
            vals = [_num(x) for x in re.findall(r'\d[\d.,]*', s[2:])]
            vals = [v for v in vals if v is not None and v > 0]
            if vals:
                out["night_kwh"] = vals[-1]

    out["found"] = sum(1 for k in ("dpr", "month", "day_kwh", "night_kwh") if out[k] is not None)
    return out


def extract_bill_fields(path):
    """Kthen fushat e gjetura nga fatura. Nëse OCR s'është i disponueshëm ose
    imazhi s'lexohet, kthen të gjitha None (app-i kalon te futja manuale)."""
    empty = {"dpr": None, "month": None, "day_kwh": None, "night_kwh": None, "found": 0}
    if not _OCR_OK:
        return empty
    proc = _preprocess(path)
    if proc is None:
        return empty
    try:
        text = pytesseract.image_to_string(proc, config="--oem 3 --psm 6")
    except Exception:
        return empty
    return _parse(text)
