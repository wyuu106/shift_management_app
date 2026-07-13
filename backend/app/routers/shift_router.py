from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import date
from app.db import get_db
from app.utils.auth import get_current_user
from app.models import user_model
from app.schemas import shift_schema
from app.cruds import shift_crud

router = APIRouter()

# ユーザーごとのシフト希望一覧取得
@router.get(
    "/user/shift/requests",
    response_model = shift_schema.ShiftRequestResponse
)
def get_user_shift_requests(
    start: date,
    end: date,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return shift_crud.get_user_shift_requests(
        start,
        end,
        current_user,
        db
    )

# シフト希望作成
@router.put(
    "/shift/request",
    response_model = shift_schema.ShiftRequestResponse
)
def create_shift_request(
    start: date,
    end: date,
    shift_dates: list[shift_schema.ShiftRequestCreate],
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return shift_crud.create_shift_request(
        start,
        end,
        shift_dates,
        current_user,
        db
    )

# 指定範囲のシフト希望一覧取得
@router.get(
    "/shift/requests",
    response_model = list[shift_schema.DayShiftData]
)
def get_shift_request(
    start: date,
    end: date,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    return shift_crud.get_shift_requests(start, end, db)

# 日付ごとのシフト希望一覧取得
@router.get(
    "/shift/requests/{target_date}",
    response_model = shift_schema.DayShiftData
)
def get_day_shift_requests(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    return shift_crud.get_day_shift_requests(target_date, db)

# シフト作成
@router.put("/shift", response_model = dict)
def create_shift(
    start: date,
    end: date,
    shifts: list[shift_schema.DayShiftData],
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(status_code=403, detail="権限がありません")
    
    return shift_crud.create_shift(start, end, shifts, db)

# 指定範囲のシフト一覧取得
@router.get(
    "/shifts",
    response_model = list[shift_schema.DayShiftData]
)
def get_shifts(
    start: date,
    end: date,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    return shift_crud.get_shifts(start, end, db)