from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas
from app.api import deps

router = APIRouter()

@router.get("")
def read_categories(
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Retrieve all parent categories with their children.
    """
    return crud.category.get_tree(db=db)

@router.get("/{category_id}/children", response_model=List[schemas.CategoryRead])
def read_children(
    category_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Retrieve child categories for a given parent category.
    """
    return crud.category.get_children(db=db, parent_id=category_id)

@router.post("", response_model=schemas.CategoryRead)
def create_category(
    *,
    db: Session = Depends(deps.get_db),
    category_in: schemas.CategoryCreate,
) -> Any:
    """
    Create new category.
    """
    return crud.category.create(db=db, obj_in=category_in)

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Delete a category.
    """
    cat = crud.category.get(db=db, id=category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    crud.category.remove(db=db, id=category_id)
    return {"ok": True}
