from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.IncomeOptionRead])
def read_income_options(
    category: Optional[str] = None,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Retrieve income options. Optionally filter by category.
    """
    if category:
        return crud.income_option.get_by_category(db=db, category=category)
    return crud.income_option.get_all_grouped(db=db)

@router.post("/", response_model=schemas.IncomeOptionRead)
def create_income_option(
    *,
    db: Session = Depends(deps.get_db),
    option_in: schemas.IncomeOptionCreate,
) -> Any:
    """
    Create a new income dropdown option.
    """
    return crud.income_option.create(db=db, obj_in=option_in)

@router.delete("/{option_id}")
def delete_income_option(
    option_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Delete an income dropdown option.
    """
    opt = crud.income_option.get(db=db, id=option_id)
    if not opt:
        raise HTTPException(status_code=404, detail="Income option not found")
    crud.income_option.remove(db=db, id=option_id)
    return {"ok": True}
