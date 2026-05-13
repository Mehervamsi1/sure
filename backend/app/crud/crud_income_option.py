from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models import IncomeOption
from app.schemas.income_option import IncomeOptionCreate, IncomeOptionRead

class CRUDIncomeOption(CRUDBase[IncomeOption, IncomeOptionCreate, IncomeOptionRead]):
    def get_by_category(self, db: Session, *, category: str) -> List[IncomeOption]:
        """Get all options for a given dropdown category."""
        return db.query(IncomeOption).filter(IncomeOption.category == category).order_by(IncomeOption.label).all()

    def get_all_grouped(self, db: Session) -> List[IncomeOption]:
        """Get all income options, ordered by category then label."""
        return db.query(IncomeOption).order_by(IncomeOption.category, IncomeOption.label).all()

income_option = CRUDIncomeOption(IncomeOption)
