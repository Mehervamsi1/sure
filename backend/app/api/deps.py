from typing import Generator
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from app.database import SessionLocal
from app import crud, models

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)) -> models.User:
    """
    Mock authentication for now. Returns the first user in the database.
    In a real app, this would verify a JWT token from headers.
    """
    user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users found. Please seed the database.")
    return user
