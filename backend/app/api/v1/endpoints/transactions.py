from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.TransactionRead])
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

@router.post("/", response_model=schemas.TransactionRead)
def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.TransactionCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new transaction.
    Handles three flows:
      - expense: deducts from source account
      - income: adds to source account
      - transfer: deducts from source, adds to destination
    """
    account = crud.account.get(db=db, id=transaction_in.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    transaction = crud.transaction.create(db=db, obj_in=transaction_in)
    
    # Update source account balance
    source_update = schemas.AccountUpdate(balance=account.balance + transaction_in.amount)
    crud.account.update(db=db, db_obj=account, obj_in=source_update)
    
    # If transfer, also credit the destination account
    if transaction_in.type == "transfer" and transaction_in.destination_account_id:
        dest_account = crud.account.get(db=db, id=transaction_in.destination_account_id)
        if not dest_account or dest_account.user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Invalid destination account")
        dest_update = schemas.AccountUpdate(balance=dest_account.balance + abs(transaction_in.amount))
        crud.account.update(db=db, db_obj=dest_account, obj_in=dest_update)
    
    return transaction
