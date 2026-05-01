# EcoMind AI+ Kosovo
**Smart Energy Management Mobile App per Republiken e Kosoves**

EcoMind AI+ eshte nje aplikacion inteligjent qe ndihmon familjet dhe bizneset ne Kosove te monitorojne konsumin e energjise elektrike, te analizojne faturat dhe te kursejne para permes rekomandimeve te AI.

## Vecorite Kryesore
- **Dashboard Inteligjent**: Monitorim ne kohe reale i konsumit (kWh) dhe kostos (Euro).
- **Skanimi i Faturave (AI)**: Skanoni faturat e KESCO-s dhe nxirrni te dhenat automatikisht.
- **Simulatori i Kursimit**: Shihni sa mund te kurseni duke ndryshuar zakonet tuaja.
- **Menaxhimi i Pajisjeve**: Identifikoni cilat pajisje harxhojne me shume.
- **Gamification**: Fitoni "Eco Points" dhe shperblime per kursimin e energjise.

## Teknologjite
- **Frontend**: React Native / Expo (Web & Mobile)
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase)
- **AI**: Random Forest Regression & OCR (Tesseract)

## Instalimi dhe Perdorimi

### Frontend (ecomind-ai)
```bash
cd ecomind-ai
npm install
npx expo start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deployment
Aplikacioni eshte i konfiguruar per deployment automatik ne Netlify (Frontend) dhe Railway (Backend).

---
*Projekt i krijuar per te zgjidhur problemin e faturave te larta te energjise ne Kosove.*
