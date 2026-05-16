from typing import List, Optional
from sqlalchemy.orm import Session, subqueryload
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

    def get_tree(self, db: Session) -> List[dict]:
        """Get the full category tree with children included."""
        parents = db.query(Category).filter(Category.parent_id == None).order_by(Category.name).all()
        result = []
        for p in parents:
            children = db.query(Category).filter(Category.parent_id == p.id).order_by(Category.name).all()
            result.append({
                "id": p.id,
                "name": p.name,
                "parent_id": None,
                "children": [
                    {"id": c.id, "name": c.name, "parent_id": c.parent_id, "children": []}
                    for c in children
                ]
            })
        return result

category = CRUDCategory(Category)
