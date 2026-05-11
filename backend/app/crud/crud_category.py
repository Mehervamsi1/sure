from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    def get_roots(self, db: Session) -> List[Category]:
        """Get all top-level (parent) categories."""
        return db.query(Category).filter(Category.parent_id == None).all()

    def get_children(self, db: Session, *, parent_id: int) -> List[Category]:
        """Get all child categories for a given parent."""
        return db.query(Category).filter(Category.parent_id == parent_id).all()

    def get_tree(self, db: Session) -> List[Category]:
        """Get the full category tree (parents with children eager-loaded)."""
        return db.query(Category).filter(Category.parent_id == None).all()

category = CRUDCategory(Category)
