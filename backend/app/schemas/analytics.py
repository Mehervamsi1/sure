from pydantic import BaseModel
from typing import List, Optional

class NetWorthResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float

class CategorySpending(BaseModel):
    category: str
    amount: float

class CashflowResponse(BaseModel):
    total_inflow: float
    total_outflow: float
    net_cashflow: float

class CategorySpendingResponse(BaseModel):
    breakdown: List[CategorySpending]
