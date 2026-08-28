// =============================================================================
// Kalkulatori i faturës së energjisë sipas tarifave reale të KESCO-s (Kosovë)
// Bazuar në strukturën e faturës: dy blloqe tarifore (deri në 800 kWh dhe mbi),
// me çmime të ndryshme për ditën (A1) dhe natën (A2), + tarifë fikse + TVSH 8%.
// =============================================================================

// Çmimet (€/kWh) — nga fatura KESCO
export const KESCO = {
  DAY_B1: 0.0675,   // Tarifa e ditës, blloku 1 (≤ 800 kWh)
  NIGHT_B1: 0.0289, // Tarifa e natës, blloku 1 (≤ 800 kWh)
  DAY_B2: 0.1252,   // Tarifa e ditës, blloku 2 (> 800 kWh)
  NIGHT_B2: 0.0590, // Tarifa e natës, blloku 2 (> 800 kWh)
  BLOCK_THRESHOLD: 800, // kWh totale ku fillon blloku 2
  FIXED_CHARGE: 1.74,   // Tarifa fikse (Standing Charge)
  VAT: 0.08,            // TVSH 8% për energji elektrike
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Llogarit faturën nga konsumi i ditës dhe natës (kWh).
// Kthen një objekt të plotë me ndarjet, netën, TVSH-në dhe totalin.
export const computeKescoBill = (dayKwhInput, nightKwhInput) => {
  const dayKwh = Math.max(0, Number(dayKwhInput) || 0);
  const nightKwh = Math.max(0, Number(nightKwhInput) || 0);
  const total = dayKwh + nightKwh;

  if (total <= 0) {
    return {
      dayKwh: 0, nightKwh: 0, totalKwh: 0,
      breakdown: [], energy: 0, fixed: KESCO.FIXED_CHARGE,
      neto: KESCO.FIXED_CHARGE, vat: round2(KESCO.FIXED_CHARGE * KESCO.VAT),
      total: round2(KESCO.FIXED_CHARGE * (1 + KESCO.VAT)),
    };
  }

  // Ndarja e konsumit në bllokun 1 (deri 800 kWh totale) dhe bllokun 2 (mbi),
  // duke ruajtur raportin ditë/natë të konsumit total.
  const dayShare = dayKwh / total;
  const nightShare = nightKwh / total;

  const b1Total = Math.min(total, KESCO.BLOCK_THRESHOLD);
  const b2Total = Math.max(0, total - KESCO.BLOCK_THRESHOLD);

  const a1b1 = b1Total * dayShare;   // ditë, bllok 1
  const a2b1 = b1Total * nightShare; // natë, bllok 1
  const a1b2 = b2Total * dayShare;   // ditë, bllok 2
  const a2b2 = b2Total * nightShare; // natë, bllok 2

  const breakdown = [
    { key: 'A1-B1', label: 'Ditë (≤800 kWh)', kwh: round2(a1b1), price: KESCO.DAY_B1, amount: round2(a1b1 * KESCO.DAY_B1) },
    { key: 'A2-B1', label: 'Natë (≤800 kWh)', kwh: round2(a2b1), price: KESCO.NIGHT_B1, amount: round2(a2b1 * KESCO.NIGHT_B1) },
    { key: 'A1-B2', label: 'Ditë (>800 kWh)', kwh: round2(a1b2), price: KESCO.DAY_B2, amount: round2(a1b2 * KESCO.DAY_B2) },
    { key: 'A2-B2', label: 'Natë (>800 kWh)', kwh: round2(a2b2), price: KESCO.NIGHT_B2, amount: round2(a2b2 * KESCO.NIGHT_B2) },
  ].filter(row => row.kwh > 0);

  const energy = breakdown.reduce((s, r) => s + r.amount, 0);
  const neto = energy + KESCO.FIXED_CHARGE;
  const vat = neto * KESCO.VAT;
  const total_bill = neto + vat;

  return {
    dayKwh: round2(dayKwh),
    nightKwh: round2(nightKwh),
    totalKwh: round2(total),
    breakdown,
    energy: round2(energy),
    fixed: KESCO.FIXED_CHARGE,
    neto: round2(neto),
    vat: round2(vat),
    total: round2(total_bill),
  };
};

// Vlerëson konsumin mujor (kWh) nga një listë pajisjesh me fuqi (W) dhe orë/ditë.
// Nëse ora/ditë mungon, përdoret një vlerë e paracaktuar sipas llojit.
export const estimateMonthlyKwhFromDevices = (devices = []) => {
  const defaultHours = { ac: 6, tv: 4, bojler: 3, frigorifer: 24, bulb: 5 };
  let dailyWh = 0;
  for (const d of devices) {
    const watts = Number(d.avg_consumption || d.power || 0);
    const type = (d.type || '').toLowerCase();
    const hours = Number(d.hours_per_day) || defaultHours[type] || 4;
    dailyWh += watts * hours;
  }
  return round2((dailyWh * 30) / 1000); // Wh/ditë -> kWh/muaj
};
