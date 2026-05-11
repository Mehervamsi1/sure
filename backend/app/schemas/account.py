from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType
    balance: float = 0.0
    currency: str = "USD"
    institution_name: Optional[str] = None
    is_active: bool = True

class AccountCreate(AccountBase):
    user_id: int

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    institution_name: Optional[str] = None
    is_active: Optional[bool] = None

class AccountRead(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
