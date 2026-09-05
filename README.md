# EcoMind AI+
**Aplikacion inteligjent për menaxhimin e energjisë elektrike — Republika e Kosovës**

**Live Demo:** [https://blinasopjani.github.io/EcoMind-AI](https://blinasopjani.github.io/EcoMind-AI)

EcoMind AI+ ndihmon familjet dhe bizneset në Kosovë të monitorojnë konsumin e energjisë, të kuptojnë faturat e KESCO-s, të vendosin objektiva kursimi dhe të marrin këshilla të personalizuara — të gjitha bazuar në të dhënat REALE të përdoruesit (asnjë e dhënë e shpikur).

---

## Veçoritë

### Llogaria & të dhënat
- **Regjistrim / Kyçje** me Supabase Auth (email ose emër përdoruesi — nëse jepet emër, kthehet automatikisht në `emri@ecomind.app`).
- **Rikthim automatik i sesionit** — përdoruesi i kyçur hapet direkt te Dashboard.
- **Harrova fjalëkalimin** — dërgon email rivendosjeje (për llogaritë me email real).
- **Të dhëna të ndara për çdo përdorues** — çdo user sheh vetëm faturat, pajisjet, pikët dhe profilin e vet (Supabase RLS + çelësa lokalë me prefiks `${uid}_`).
- **Eksporto faturat** si CSV dhe **Fshi të dhënat / llogarinë**.

### Onboarding
- Pyetësor i detajuar në 5 hapa (lloji i banesës, m², izolimi, familja, ngrohja/ftohja, uji i ngrohtë, pajisjet, tarifa ditë/natë, DPR, buxheti, objektivi). Të gjitha fushat ruhen për profilin e përdoruesit.
- Mundësi për të futur faturën e parë menjëherë (manualisht).

### Faturat
- **Futje manuale** me tarifat REALE të KESCO-s: konsumi i ditës (A1) dhe natës (A2), DPR, muaji me kalendar (vite të shkuara përfshirë). Fatura llogaritet live.
- **Skanim fature (OCR)** përmes OCR.space — nxjerr DPR, muajin, A1, A2. Imazhi zvogëlohet automatikisht para dërgimit (që fotot e mëdha të mos dështojnë dhe leximi të jetë i shpejtë).
- **Fshirje fature** nga historiku (te Analitika).

### Dashboard & Analitika
- Konsumi mujor, klasa e energjisë (A+++…D) me info-point shpjegues, buxheti, impakti (CO₂ dhe kursimet).
- **Asnjë analizë/parashikim nuk shfaqet pa të dhëna** — gjendje bosh me ftesë për të shtuar faturë/pajisje.
- Analitika: krahasim faturash, CO₂, konsumatorët kryesorë (renditur sipas energjisë kWh), historik faturash.

### Pajisjet
- Shtim i pajisjeve **normale** (manual) ose **smart** (preset ose lidhje QR/internet — demonstruese).
- Ndez/fik, edito, fshi. Info-point për klasifikimin e efiçiencës.

### Loja, Objektivat & Njoftimet
- **Sfida** javore me kohëmatës dhe pikë; **shpërblime** që përditësohen në kohë reale (tregojnë sa pikë mungojnë ose "gati").
- **Objektiva** (Goals) të gjeneruara nga AI sipas konsumit real.
- **Njoftime** reale nga faturat/pajisjet/buxheti/pikët; mund të çaktivizohen te Cilësimet.

### AI Insights
- Këshilla të personalizuara bazuar në faturat, pajisjet dhe profilin e shtëpisë (të bazuara në rregulla, jo të shpikura).

---

## Teknologjitë

- **Frontend:** React Native / Expo (target: Web — GitHub Pages).
- **Auth & Database:** Supabase (PostgreSQL) — tabelat `users`, `devices`, `bills`, me RLS për çdo përdorues.
- **OCR:** [OCR.space](https://ocr.space) API (nga browseri, pa backend).
- **Llogaritja e faturës:** kalkulator i tarifave reale KESCO (`src/data/kescoTariff.js`).
- **Ruajtje lokale:** AsyncStorage (per-user).

> **Shënim:** Folderi `backend/` (FastAPI) është opsional/legacy. Aplikacioni funksionon plotësisht pa të — përdor Supabase dhe OCR.space direkt.

---

## Llogaritja e faturës KESCO

`src/data/kescoTariff.js` implementon strukturën reale të faturës:
- Dy blloqe tarifore: deri në **800 kWh** (totale) dhe mbi 800 kWh.
- Çmime të veçanta për ditën (A1) dhe natën (A2) në secilin bllok.
- Tarifë fikse (1.74€) + **TVSH 8%**.
- Pragu aplikohet mbi konsumin total, i ndarë sipas raportit ditë/natë.

Verifikuar kundër një fature reale: **809 kWh ditë + 149 kWh natë → 74.62€** (përputhet ekzakt).

---

## Instalimi dhe Përdorimi

```bash
cd ecomind-ai
npm install
npx expo start        # zhvillim (web/mobile)
```

Konfigurimi i Supabase është te `src/data/supabase.js` (URL + anon key).

---

## Deployment

**Frontend → GitHub Pages:**
```bash
cd ecomind-ai
npm run deploy
```

**Konfigurimi i Supabase (një herë):**
- Aktivizo **RLS** në tabelat `users`, `devices`, `bills` me politika `auth.uid() = user_id`.
- Në Authentication → Providers, mbaje **"Confirm email" = OFF** (që kyçja me email sintetikë `@ecomind.app` të punojë).
- *(Opsionale)* Për fshirje të plotë të llogarisë Auth, bëj deploy Edge Function-in:
  ```bash
  supabase functions deploy delete-account
  ```
  (shih `supabase/functions/delete-account/README.md`).

---

*Projekt i krijuar për të ndihmuar familjet në Kosovë të ulin faturat e energjisë.*
