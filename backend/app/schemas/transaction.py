from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TransactionBase(BaseModel):
    amount: float
    currency: str = "USD"
    date: datetime
    name: str
    merchant_name: Optional[str] = None
    pending: bool = False
    type: str = "expense"
    category_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    is_subscription: bool = False
    billing_cycle: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None

class TransactionCreate(TransactionBase):
    account_id: int

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[datetime] = None
    name: Optional[str] = None
    merchant_name: Optional[str] = None
    pending: Optional[bool] = None
    type: Optional[str] = None
    category_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    is_subscription: Optional[bool] = None
    billing_cycle: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None

class TransactionRead(TransactionBase):
    id: int
    account_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
