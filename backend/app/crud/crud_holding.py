from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models import Holding
from app.schemas.holding import HoldingCreate, HoldingUpdate


class CRUDHolding(CRUDBase[Holding, HoldingCreate, HoldingUpdate]):
    def get_by_user(self, db: Session, *, user_id: int) -> List[Holding]:
        return db.query(Holding).filter(
            Holding.user_id == user_id,
            Holding.is_active == True
        ).order_by(Holding.asset_type, Holding.asset_name).all()

    def get_by_ticker(self, db: Session, *, user_id: int, ticker: str) -> Optional[Holding]:
        return db.query(Holding).filter(
            Holding.user_id == user_id,
            Holding.ticker == ticker,
            Holding.is_active == True
        ).first()

    def get_by_asset_type(self, db: Session, *, user_id: int, asset_type: str) -> List[Holding]:
        return db.query(Holding).filter(
            Holding.user_id == user_id,
            Holding.asset_type == asset_type,
            Holding.is_active == True
        ).all()

    def get_by_exchange(self, db: Session, *, user_id: int, exchange: str) -> List[Holding]:
        return db.query(Holding).filter(
            Holding.user_id == user_id,
            Holding.exchange == exchange,
            Holding.is_active == True
        ).all()


holding = CRUDHolding(Holding)
