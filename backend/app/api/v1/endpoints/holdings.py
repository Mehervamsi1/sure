from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.market import search_ticker, get_quotes, get_history
from app.core.currency import get_exchange_rates, convert_amount

router = APIRouter()


@router.get("/search", response_model=List[schemas.TickerSearchResult])
def search(q: str = "") -> Any:
    if not q or len(q) < 1:
        return []
    results = search_ticker(q)
    return [schemas.TickerSearchResult(**r) for r in results]


@router.get("/quotes")
def quotes(tickers: str = "") -> Any:
    if not tickers:
        return {}
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    return get_quotes(ticker_list)


@router.get("/history", response_model=List[schemas.HistoryPoint])
def history(ticker: str, period: str = "1mo", interval: str = "1d") -> Any:
    return get_history(ticker, period=period, interval=interval)


@router.get("", response_model=List[schemas.HoldingRead])
def list_holdings(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.holding.get_by_user(db=db, user_id=current_user.id)


@router.get("/{holding_id}", response_model=schemas.HoldingRead)
def get_holding(
    holding_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    h = crud.holding.get(db=db, id=holding_id)
    if not h or h.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    return h


@router.post("/buy", response_model=schemas.HoldingRead)
async def buy_holding(
    *,
    db: Session = Depends(deps.get_db),
    buy_in: schemas.BuyRequest,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    debit_account = crud.account.get(db=db, id=buy_in.debit_account_id)
    if not debit_account or debit_account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid debit account")

    invest_account = crud.account.get(db=db, id=buy_in.investment_account_id)
    if not invest_account or invest_account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid investment account")

    total_cost = buy_in.quantity * buy_in.price_per_unit

    existing = crud.holding.get_by_ticker(db=db, user_id=current_user.id, ticker=buy_in.ticker)

    if existing:
        new_qty = existing.quantity + buy_in.quantity
        new_avg = ((existing.quantity * existing.avg_cost_price) + (buy_in.quantity * buy_in.price_per_unit)) / new_qty
        new_invested = existing.total_invested + total_cost

        crud.holding.update(db=db, db_obj=existing, obj_in={
            "quantity": new_qty,
            "avg_cost_price": round(new_avg, 4),
            "total_invested": round(new_invested, 2),
        })
        holding_record = existing
    else:
        holding_data = schemas.HoldingCreate(
            account_id=buy_in.investment_account_id,
            ticker=buy_in.ticker,
            asset_name=buy_in.asset_name,
            asset_type=buy_in.asset_type,
            exchange=buy_in.exchange,
            quantity=buy_in.quantity,
            avg_cost_price=buy_in.price_per_unit,
            total_invested=total_cost,
            currency=buy_in.currency,
            purchase_date=buy_in.date,
            broker_name=buy_in.broker_name,
            broker_account_last4=buy_in.broker_account_last4,
            notes=buy_in.notes,
        )
        db_obj = models.Holding(
            **holding_data.model_dump(),
            user_id=current_user.id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        holding_record = db_obj

    txn_data = schemas.TransactionCreate(
        account_id=buy_in.debit_account_id,
        amount=-abs(total_cost),
        currency=buy_in.currency,
        date=buy_in.date,
        name=f"Buy {buy_in.ticker}",
        merchant_name=buy_in.broker_name,
        type="investment",
        holding_id=holding_record.id,
        notes=buy_in.notes,
    )
    crud.transaction.create(db=db, obj_in=txn_data)

    debit_delta = -abs(total_cost)
    if buy_in.currency != debit_account.currency:
        rates = await get_exchange_rates(base=debit_account.currency)
        debit_delta = -abs(convert_amount(total_cost, buy_in.currency, debit_account.currency, rates))
    crud.account.update(db=db, db_obj=debit_account, obj_in=schemas.AccountUpdate(
        balance=debit_account.balance + debit_delta
    ))

    credit_delta = abs(total_cost)
    if buy_in.currency != invest_account.currency:
        rates = await get_exchange_rates(base=invest_account.currency)
        credit_delta = abs(convert_amount(total_cost, buy_in.currency, invest_account.currency, rates))
    crud.account.update(db=db, db_obj=invest_account, obj_in=schemas.AccountUpdate(
        balance=invest_account.balance + credit_delta
    ))

    db.refresh(holding_record)
    return holding_record


@router.post("/sell", response_model=schemas.HoldingRead)
async def sell_holding(
    *,
    db: Session = Depends(deps.get_db),
    sell_in: schemas.SellRequest,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    holding_record = crud.holding.get(db=db, id=sell_in.holding_id)
    if not holding_record or holding_record.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    if sell_in.quantity > holding_record.quantity:
        raise HTTPException(status_code=400, detail="Cannot sell more than held quantity")

    deposit_account = crud.account.get(db=db, id=sell_in.deposit_account_id)
    if not deposit_account or deposit_account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid deposit account")

    invest_account = crud.account.get(db=db, id=holding_record.account_id)
    sale_total = sell_in.quantity * sell_in.price_per_unit

    new_qty = holding_record.quantity - sell_in.quantity
    if new_qty <= 0:
        crud.holding.update(db=db, db_obj=holding_record, obj_in={
            "quantity": 0,
            "is_active": False,
            "total_invested": 0,
        })
    else:
        proportion_remaining = new_qty / holding_record.quantity
        crud.holding.update(db=db, db_obj=holding_record, obj_in={
            "quantity": new_qty,
            "total_invested": round(holding_record.total_invested * proportion_remaining, 2),
        })

    txn_data = schemas.TransactionCreate(
        account_id=holding_record.account_id,
        amount=abs(sale_total),
        currency=holding_record.currency,
        date=sell_in.date,
        name=f"Sell {holding_record.ticker}",
        merchant_name=holding_record.broker_name,
        type="investment",
        holding_id=holding_record.id,
        notes=f"Sold {sell_in.quantity} units at {sell_in.price_per_unit}",
    )
    crud.transaction.create(db=db, obj_in=txn_data)

    credit_delta = abs(sale_total)
    if holding_record.currency != deposit_account.currency:
        rates = await get_exchange_rates(base=deposit_account.currency)
        credit_delta = abs(convert_amount(sale_total, holding_record.currency, deposit_account.currency, rates))
    crud.account.update(db=db, db_obj=deposit_account, obj_in=schemas.AccountUpdate(
        balance=deposit_account.balance + credit_delta
    ))

    if invest_account:
        debit_delta = -abs(sale_total)
        if holding_record.currency != invest_account.currency:
            rates = await get_exchange_rates(base=invest_account.currency)
            debit_delta = -abs(convert_amount(sale_total, holding_record.currency, invest_account.currency, rates))
        crud.account.update(db=db, db_obj=invest_account, obj_in=schemas.AccountUpdate(
            balance=invest_account.balance + debit_delta
        ))

    db.refresh(holding_record)
    return holding_record


@router.put("/{holding_id}", response_model=schemas.HoldingRead)
def update_holding(
    holding_id: int,
    *,
    db: Session = Depends(deps.get_db),
    holding_in: schemas.HoldingUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    h = crud.holding.get(db=db, id=holding_id)
    if not h or h.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    return crud.holding.update(db=db, db_obj=h, obj_in=holding_in)


@router.delete("/{holding_id}")
def delete_holding(
    holding_id: int,
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    h = crud.holding.get(db=db, id=holding_id)
    if not h or h.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    crud.holding.remove(db=db, id=holding_id)
    return {"ok": True}
