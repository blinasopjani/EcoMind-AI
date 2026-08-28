from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .core.ai_logic import predictor
from .core.ocr_service import scanner
import shutil
import os

from .models import models
from .core.database import engine, get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

# Konteksti për hash-imin e fjalëkalimeve (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not connect to database on startup: {e}")

app = FastAPI(
    title="EcoMind AI+ Kosovo API",
    description="Backend for Smart Energy Management Mobile App",
    version="1.0.0"
)

# Only allow the GitHub Pages frontend (and localhost for local dev).
# Do NOT use allow_origins=["*"] together with allow_credentials=True —
# browsers block such responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://blinasopjani.github.io",
        "http://localhost:8081",
        "http://localhost:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to EcoMind AI+ Kosovo API"}

@app.get("/health")
async def health():
    """Railway / uptime-robot health-check endpoint."""
    return {"status": "ok"}

@app.post("/predict")
async def predict_usage(household_size: int, home_type: str, last_kwh: float):
    try:
        prediction = predictor.predict_next_month(household_size, home_type, last_kwh)
        return {
            "predicted_kwh": prediction,
            "estimated_cost": round(prediction * 0.14, 2), # Using Kosovo avg tariff
            "suggestion": "Provoni të ulni temperaturën e bojlerit për 5 gradë për të kursyer 12%."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-bill")
async def scan_bill(file: UploadFile = File(...)):
    # Save file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        results = scanner.scan_bill(temp_path)
        os.remove(temp_path)
        return results
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights/{user_id}")
async def get_insights(user_id: int):
    # This would normally query the DB
    return {
        "daily_average": "11.4 kWh",
        "peak_usage_hours": "18:00 - 21:00",
        "efficiency_rating": "B+",
        "eco_score_progress": "+5 points this week"
    }

@app.post("/register")
async def register_user(user: UserRegister, db: Session = Depends(get_db)):
    try:
        new_user = models.User(
            full_name=user.full_name,
            email=user.email,
            hashed_password=pwd_context.hash(user.password)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User created successfully", "user_id": new_user.id}
    except Exception as e:
        db.rollback()
        # Fallback për demo nëse mungon lidhja me DB
        return {"message": "User registered (Demo Mode)", "user_id": 999}
