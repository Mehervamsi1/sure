from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class IncomeOptionBase(BaseModel):
    category: str  # e.g. 'part_time_name', 'full_time_name', 'banking_source', 'investment_type', 'receipt_type'
    label: str

class IncomeOptionCreate(IncomeOptionBase):
    pass

class IncomeOptionRead(IncomeOptionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
