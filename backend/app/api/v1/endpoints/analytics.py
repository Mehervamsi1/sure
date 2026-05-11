from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from datetime import datetime

router = APIRouter()

@router.get("/net-worth", response_model=schemas.NetWorthResponse)
def get_net_worth(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's net worth aggregation.
    """
    return crud.analytics.get_net_worth(db=db, user_id=current_user.id)

@router.get("/cashflow", response_model=schemas.CashflowResponse)
def get_cashflow(
    month: int = None,
    year: int = None,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's cashflow aggregation.
    """
    if month is None or year is None:
        now = datetime.now()
        month = month or now.month
        year = year or now.year
    return crud.analytics.get_cashflow(db=db, user_id=current_user.id, month=month, year=year)

@router.get("/spending", response_model=schemas.CategorySpendingResponse)
def get_spending(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get category spending breakdown.
    """
    return crud.analytics.get_spending_by_category(db=db, user_id=current_user.id)
