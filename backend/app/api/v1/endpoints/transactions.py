from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.currency import get_exchange_rates, convert_amount

router = APIRouter()

@router.get("", response_model=List[schemas.TransactionRead])
def read_transactions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    account_id: int = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve transactions for current user. Can filter by account_id.
    """
    if account_id:
        account = crud.account.get(db=db, id=account_id)
        if not account or account.user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Not enough permissions")
        transactions = crud.transaction.get_by_account(db=db, account_id=account_id, skip=skip, limit=limit)
    else:
        transactions = crud.transaction.get_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return transactions

@router.post("", response_model=schemas.TransactionRead)
async def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.TransactionCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new transaction.
    Converts the transaction amount to the account's currency before
    adjusting the account balance.
    """
    account = crud.account.get(db=db, id=transaction_in.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")

    transaction = crud.transaction.create(db=db, obj_in=transaction_in)

    # Convert amount to account currency if they differ
    balance_delta = transaction_in.amount
    if transaction_in.currency and transaction_in.currency != account.currency:
        rates = await get_exchange_rates(base=account.currency)
        balance_delta = convert_amount(
            transaction_in.amount, transaction_in.currency, account.currency, rates
        )

    source_update = schemas.AccountUpdate(balance=account.balance + balance_delta)
    crud.account.update(db=db, db_obj=account, obj_in=source_update)

    # If transfer, also credit the destination account
    if transaction_in.type == "transfer" and transaction_in.destination_account_id:
        dest_account = crud.account.get(db=db, id=transaction_in.destination_account_id)
        if not dest_account or dest_account.user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Invalid destination account")
        dest_delta = abs(transaction_in.amount)
        if transaction_in.currency and transaction_in.currency != dest_account.currency:
            rates = await get_exchange_rates(base=dest_account.currency)
            dest_delta = abs(convert_amount(
                transaction_in.amount, transaction_in.currency, dest_account.currency, rates
            ))
        dest_update = schemas.AccountUpdate(balance=dest_account.balance + dest_delta)
        crud.account.update(db=db, db_obj=dest_account, obj_in=dest_update)

    return transaction

@router.put("/{transaction_id}", response_model=schemas.TransactionRead)
async def update_transaction(
    transaction_id: int,
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.TransactionUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    txn = crud.transaction.get(db=db, id=transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    account = crud.account.get(db=db, id=txn.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    old_amount = txn.amount
    old_currency = txn.currency or account.currency
    updated = crud.transaction.update(db=db, db_obj=txn, obj_in=transaction_in)

    update_data = transaction_in.model_dump(exclude_unset=True)
    if "amount" in update_data or "currency" in update_data:
        new_amount = update_data.get("amount", old_amount)
        new_currency = update_data.get("currency", old_currency)
        rates = await get_exchange_rates(base=account.currency)
        old_in_acct = convert_amount(old_amount, old_currency, account.currency, rates)
        new_in_acct = convert_amount(new_amount, new_currency, account.currency, rates)
        diff = new_in_acct - old_in_acct
        if abs(diff) > 0.001:
            crud.account.update(db=db, db_obj=account, obj_in=schemas.AccountUpdate(balance=account.balance + diff))

    return updated

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    txn = crud.transaction.get(db=db, id=transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    account = crud.account.get(db=db, id=txn.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    txn_currency = txn.currency or account.currency
    reversal = txn.amount
    if txn_currency != account.currency:
        rates = await get_exchange_rates(base=account.currency)
        reversal = convert_amount(txn.amount, txn_currency, account.currency, rates)

    crud.account.update(db=db, db_obj=account, obj_in=schemas.AccountUpdate(balance=account.balance - reversal))
    crud.transaction.remove(db=db, id=transaction_id)
    return {"ok": True}
