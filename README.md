# EcoMind AI+ Kosovo
**Smart Energy Management Mobile App per Republiken e Kosoves**

**Live Demo:** [https://helpful-frangipane-06bc54.netlify.app](https://helpful-frangipane-06bc54.netlify.app)

EcoMind AI+ eshte nje aplikacion inteligjent qe ndihmon familjet dhe bizneset ne Kosove te monitorojne konsumin e energjise elektrike, te analizojne faturat dhe te kursejne para permes rekomandimeve te AI.

## Vecorite Kryesore
- **Dashboard Inteligjent**: Monitorim ne kohe reale i konsumit (kWh) dhe kostos (Euro).
- **Skanimi i Faturave (AI)**: Skanoni faturat e KESCO-s dhe nxirrni te dhenat automatikisht.
- **Simulatori i Kursimit**: Shihni sa mund te kurseni duke ndryshuar zakonet tuaja.
- **Menaxhimi i Pajisjeve**: Identifikoni cilat pajisje harxhojne me shume.
- **Sistemi i Pikeve**: Fitoni pika per kursimin e energjise dhe arrini objektivat tuaja.

## Teknologjite
- **Frontend**: React Native / Expo (Web & Mobile)
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase)
- **AI**: Random Forest Regression & OCR (Tesseract)

## Instalimi dhe Perdorimi

### Frontend (ecomind-ai)
1. Shkoni te folderi ecomind-ai
2. Instaloni paketat: npm install
3. Nisni projektin: npx expo start

### Backend
1. Shkoni te folderi backend
2. Instaloni varësitë: pip install -r requirements.txt
3. Nisni serverin: uvicorn app.main:app --reload

## Deployment
Aplikacioni eshte i konfiguruar per deployment automatik ne Netlify (Frontend) dhe Railway (Backend).

---
*Projekt i krijuar per te zgjidhur problemin e faturave te larta te energjise ne Kosove.*
