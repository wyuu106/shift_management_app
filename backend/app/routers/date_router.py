from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.db import get_db
from app.utils.auth import get_current_user
from app.models import user_model
from app.schemas import date_schema
from app.cruds import date_crud

router = APIRouter()

@router.put(
    "/business_dates",
    response_model = dict
)
def create_shift_period(
        period: date_schema.BusinessDateCreate,
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return date_crud.create_business_dates(period, db)

@router.get(
    "/business_dates",
    response_model = date_schema.BusinessDateResponse
)
def get_shift_periods(
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
):
    return date_crud.get_business_dates(db)