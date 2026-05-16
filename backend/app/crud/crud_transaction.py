from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models import Transaction, Account
from app.schemas.transaction import TransactionCreate, TransactionUpdate

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    def get_by_account(self, db: Session, *, account_id: int, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return db.query(Transaction).filter(Transaction.account_id == account_id).order_by(Transaction.date.desc()).offset(skip).limit(limit).all()

    def get_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return db.query(Transaction).join(Account, Transaction.account_id == Account.id).filter(Account.user_id == user_id).order_by(Transaction.date.desc()).offset(skip).limit(limit).all()

transaction = CRUDTransaction(Transaction)
