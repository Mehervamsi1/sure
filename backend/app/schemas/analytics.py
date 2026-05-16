from pydantic import BaseModel
from typing import List, Optional

class NetWorthResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float

class NetWorthDataPoint(BaseModel):
    date: str
    net_worth: float

class NetWorthHistoryResponse(BaseModel):
    history: List[NetWorthDataPoint]

class CategorySpending(BaseModel):
    category: str
    amount: float

class CashflowResponse(BaseModel):
    total_inflow: float
    total_outflow: float
    net_cashflow: float

class CategorySpendingResponse(BaseModel):
    breakdown: List[CategorySpending]

class ExchangeRatesResponse(BaseModel):
    base: str
    rates: dict[str, float]

class ConvertedAccountBalance(BaseModel):
    account_id: int
    name: str
    type: str
    original_balance: float
    original_currency: str
    converted_balance: float
    display_currency: str

class ConvertedNetWorthResponse(BaseModel):
    display_currency: str
    total_assets: float
    total_liabilities: float
    net_worth: float
    accounts: List[ConvertedAccountBalance]
