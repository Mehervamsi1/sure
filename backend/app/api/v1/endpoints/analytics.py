from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.currency import get_exchange_rates, convert_amount, SUPPORTED_CURRENCIES
from app.schemas.analytics import (
    NetWorthHistoryResponse, ExchangeRatesResponse,
    ConvertedNetWorthResponse, ConvertedAccountBalance
)
from app.schemas.transaction import TransactionRead
from app.models import AccountType
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

@router.get("/net-worth-history", response_model=NetWorthHistoryResponse)
async def get_net_worth_history(
    days: int = 30,
    display_currency: str = "USD",
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get net worth history over a period for sparkline visualization.
    Converts all values to display_currency.
    """
    if display_currency not in SUPPORTED_CURRENCIES:
        display_currency = "USD"
    rates = await get_exchange_rates(base=display_currency)
    return crud.analytics.get_net_worth_history(
        db=db, user_id=current_user.id, days=days,
        rates=rates, display_currency=display_currency
    )

@router.get("/recent-transactions", response_model=List[TransactionRead])
def get_recent_transactions(
    limit: int = 10,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get the most recent transactions across all accounts.
    """
    return crud.transaction.get_by_user(db=db, user_id=current_user.id, skip=0, limit=limit)

@router.get("/exchange-rates", response_model=ExchangeRatesResponse)
async def get_rates(base: str = "USD") -> Any:
    """
    Get current exchange rates relative to a base currency.
    """
    if base not in SUPPORTED_CURRENCIES:
        base = "USD"
    rates = await get_exchange_rates(base=base)
    return ExchangeRatesResponse(base=base, rates=rates)

@router.get("/net-worth-converted", response_model=ConvertedNetWorthResponse)
async def get_net_worth_converted(
    display_currency: str = "USD",
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get net worth with all accounts converted to the display currency.
    """
    if display_currency not in SUPPORTED_CURRENCIES:
        display_currency = "USD"

    rates = await get_exchange_rates(base=display_currency)
    accounts = crud.account.get_by_user(db=db, user_id=current_user.id)

    asset_types = {AccountType.DEPOSITORY, AccountType.INVESTMENT, AccountType.PROPERTY,
                   AccountType.VEHICLE, AccountType.CRYPTO, AccountType.OTHER_ASSET}
    liability_types = {AccountType.CREDIT_CARD, AccountType.LOAN, AccountType.OTHER_LIABILITY}

    converted_accounts = []
    total_assets = 0.0
    total_liabilities = 0.0

    for acc in accounts:
        converted = convert_amount(acc.balance, acc.currency, display_currency, rates)
        converted_accounts.append(ConvertedAccountBalance(
            account_id=acc.id,
            name=acc.name,
            type=acc.type.value,
            original_balance=acc.balance,
            original_currency=acc.currency,
            converted_balance=round(converted, 2),
            display_currency=display_currency,
        ))
        if acc.type in asset_types:
            total_assets += converted
        elif acc.type in liability_types:
            total_liabilities += abs(converted)

    return ConvertedNetWorthResponse(
        display_currency=display_currency,
        total_assets=round(total_assets, 2),
        total_liabilities=round(total_liabilities, 2),
        net_worth=round(total_assets - total_liabilities, 2),
        accounts=converted_accounts,
    )

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
