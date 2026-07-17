from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.db import get_db
from app.utils.auth import get_current_user
from app.models import user_model
from app.schemas import period_schema
from app.cruds import period_crud

router = APIRouter()

@router.put(
    "/period",
    response_model = dict
)
def create_shift_period(
        period: period_schema.ShiftPeriodCreate,
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return period_crud.create_shift_period(period, db)

@router.get(
    "/period",
    response_model = period_schema.ShiftPeriodResponse
)
def get_shift_periods(
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
):
    return period_crud.get_shift_period(db)