from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models import HoldingType

class HoldingBase(BaseModel):
    ticker: str
    asset_name: str
    asset_type: HoldingType
    exchange: Optional[str] = None
    currency: str = "USD"
    broker_name: Optional[str] = None
    broker_account_last4: Optional[str] = None
    notes: Optional[str] = None

class HoldingCreate(HoldingBase):
    account_id: int
    quantity: float
    avg_cost_price: float
    total_invested: float
    purchase_date: Optional[datetime] = None

class HoldingUpdate(BaseModel):
    broker_name: Optional[str] = None
    broker_account_last4: Optional[str] = None
    notes: Optional[str] = None

class HoldingRead(HoldingBase):
    id: int
    user_id: int
    account_id: int
    quantity: float
    avg_cost_price: float
    total_invested: float
    purchase_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BuyRequest(BaseModel):
    ticker: str
    asset_name: str
    asset_type: HoldingType
    exchange: Optional[str] = None
    quantity: float
    price_per_unit: float
    currency: str = "USD"
    date: datetime
    debit_account_id: int
    investment_account_id: int
    broker_name: Optional[str] = None
    broker_account_last4: Optional[str] = None
    notes: Optional[str] = None

class SellRequest(BaseModel):
    holding_id: int
    quantity: float
    price_per_unit: float
    date: datetime
    deposit_account_id: int

class TickerSearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str
    asset_type: str
    currency: str
    current_price: Optional[float] = None

class QuoteResult(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    currency: str
    market_state: str

class HistoryPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
