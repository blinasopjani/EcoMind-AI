import os
from sqlalchemy import create_engine
from app.models.models import Base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Lidhja me: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    print("Sukses! Tabelat u krijuan në Supabase.")
except Exception as e:
    print(f"Gabim gjatë krijimit të tabelave: {e}")
