from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    household_size: int
    home_type: str
    monthly_budget_goal: float

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    eco_score: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
