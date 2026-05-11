from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models import Account
from app.schemas.account import AccountCreate, AccountUpdate

class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
    def get_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Account]:
        return db.query(Account).filter(Account.user_id == user_id).offset(skip).limit(limit).all()

account = CRUDAccount(Account)
