from typing import Generator
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import create_client, Client
from app.database import SessionLocal
from app import crud, models, schemas
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> models.User:
    """
    Validates the Supabase JWT. If valid, fetches or creates the User in our local database.
    """
    try:
        # Validate the token by getting the user from Supabase auth
        auth_response = supabase_client.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        email = auth_response.user.email
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email in token")

        # Check if user exists in our DB
        user = crud.user.get_by_email(db, email=email)
        if not user:
            # Extract metadata if available
            metadata = auth_response.user.user_metadata or {}
            first_name = metadata.get("first_name")
            last_name = metadata.get("last_name")
            gender = metadata.get("gender")

            # Create user on the fly if they don't exist in our DB
            user_in = schemas.UserCreate(
                email=email,
                password="supabase-oauth-placeholder",
                first_name=first_name,
                last_name=last_name,
                gender=gender
            )
            user = crud.user.create(db, obj_in=user_in)
            
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
