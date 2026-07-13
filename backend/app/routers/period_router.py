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

"""
@router.post(
    "/period",
    response_model = period_schema.ShiftPeriodCreateResponse
)
def create_shift_period(
        period: period_schema.ShiftPeriodCreate,
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
) -> period_schema.ShiftPeriodCreateResponse:
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return period_crud.create_shift_period(period, db)
"""

@router.get(
    "/periods",
    response_model = period_schema.ShiftPeriodCreateResponse
)
def get_shift_periods(
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
) -> period_schema.ShiftPeriodCreateResponse:
    return period_crud.get_shift_periods(db)

@router.put(
    "/period",
    response_model = period_schema.ShiftPeriodCreateResponse
)
def update_shift_period(
        new_period: period_schema.ShiftPeriodCreate,
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
) -> period_schema.ShiftPeriodCreateResponse:
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return period_crud.update_shift_period(new_period, db)

@router.put(
    "/period/activate",
    response_model = period_schema.ShiftPeriodCreateResponse
)
def activate_shift_period(
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
) -> period_schema.ShiftPeriodCreateResponse:
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return period_crud.activate_shift_period(db)

@router.put(
    "/period/deactivate",
    response_model = period_schema.ShiftPeriodCreateResponse
)
def deactivate_shift_period(
        db: Session = Depends(get_db),
        current_user: user_model.User = Depends(get_current_user)
) -> period_schema.ShiftPeriodCreateResponse:
    if not current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="権限がありません"
        )
    
    return period_crud.deactivate_shift_period(db)