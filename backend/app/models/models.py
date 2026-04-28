from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    household_size = Column(Integer, default=1)
    home_type = Column(String) # Apartment, House, Office
    monthly_budget_goal = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    eco_score = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)

    devices = relationship("Device", back_populates="owner")
    bills = relationship("Bill", back_populates="owner")

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String) # Fridge, AC, TV, etc.
    watts = Column(Float)
    status = Column(String, default="off") # on, off, stand-by
    hours_per_day = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="devices")

class Bill(Base):
    __tablename__ = "bills"
    
    id = Column(Integer, primary_key=True, index=True)
    month = Column(String)
    year = Column(Integer)
    amount = Column(Float)
    kwh = Column(Float)
    tax = Column(Float)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="bills")
