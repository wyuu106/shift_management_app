from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from collections import defaultdict
from app.models import shift_model, user_model, period_model
from app.schemas import shift_schema

# ユーザーごとのシフト希望一覧取得
def get_user_shift_requests(
        current_user: user_model.User,
        db: Session
) -> shift_schema.ShiftRequestResponse:
    period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not period:
        raise HTTPException(
            status_code=404,
            detail="シフト登録可能な期間がありません"
        )

    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            shift_model.ShiftRequest.remark
        ).where(
            shift_model.ShiftRequest.user_id == current_user.id,
            shift_model.ShiftRequest.shift_date >= period.start,
            shift_model.ShiftRequest.shift_date <= period.end
        )
    )
    db_shift_requests = db.execute(stmt).all()

    shift_dates = [
        shift_schema.ShiftRequestCreate(
            shift_date = shift_date,
            remark = remark
        )
        for shift_date, remark in db_shift_requests
    ]

    return shift_schema.ShiftRequestResponse(
        user_id = current_user.id,
        user_name = current_user.name,
        shift_dates = shift_dates
    )

# シフト希望作成
def create_shift_request(
        shift_request_dates: list[shift_schema.ShiftRequestCreate],
        current_user: user_model.User,
        db: Session
) -> dict:
    period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not period:
        raise HTTPException(
            status_code=404,
            detail="シフト登録可能な期間がありません"
        )
    
    try:
        db.execute(delete(shift_model.ShiftRequest).where(
            shift_model.ShiftRequest.user_id == current_user.id,
            shift_model.ShiftRequest.shift_date >= period.start,
            shift_model.ShiftRequest.shift_date <= period.end
        ))

        for shift_request_date in shift_request_dates:
            db_shift_request = shift_model.ShiftRequest(
                shift_date = shift_request_date.shift_date,
                remark = shift_request_date.remark,
                user_id = current_user.id
            )

            db.add(db_shift_request)

        db.commit()

        return {"message": "シフト希望登録完了"}
    
    except Exception:
        db.rollback()
        raise

# 指定範囲のシフト希望一覧取得
def get_shift_requests(
        period: period_model.ShiftPeriod,
        db: Session
) -> list[shift_schema.DayShiftResponse]:
    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            user_model.User.id,
            user_model.User.name,
            shift_model.ShiftRequest.remark
        ).join(
            user_model.User,
            shift_model.ShiftRequest.user_id == user_model.User.id
        ).where(
            shift_model.ShiftRequest.shift_date >= period.start,
            shift_model.ShiftRequest.shift_date <= period.end
        ).order_by(
            shift_model.ShiftRequest.shift_date,
            user_model.User.id
        )
    )
    db_shift_requests = db.execute(stmt).all()

    day_shift_members = defaultdict(list)

    for shift_date, user_id, user_name, remark in db_shift_requests:
        day_shift_members[shift_date].append(
            shift_schema.ShiftMemberResponse(
                user_id = user_id,
                user_name = user_name,
                remark = remark
            )
        )
    
    return [
        shift_schema.DayShiftResponse(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in day_shift_members.items()
    ]

# シフト登録
def create_day_shift(
        shifts: list[shift_schema.DayShiftCreate],
        db: Session
) -> dict:
    period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not period:
        raise HTTPException(
            status_code=404,
            detail="シフト登録可能な期間がありません"
        )
    
    try:
        db.execute(delete(shift_model.Shift).where(
            shift_model.Shift.shift_date >= period.start,
            shift_model.Shift.shift_date <= period.end
        ))

        for shift in shifts:
            for member in shift.members:
                db_shift = shift_model.Shift(
                    shift_date = shift.shift_date,
                    remark = member.remark,
                    user_id = member.user_id
                )

                db.add(db_shift)

        db.commit()

        return {"message": "シフト登録完了"}
    
    except Exception:
        db.rollback()
        raise

# 指定範囲のシフト一覧取得
def get_shifts(
        period: period_model.ShiftPeriod,
        db: Session
) -> list[shift_schema.DayShiftResponse]:
    stmt = (
        select(
            shift_model.Shift.shift_date,
            user_model.User.id,
            user_model.User.name,
            shift_model.Shift.remark
        ).join(
            user_model.User,
            shift_model.Shift.user_id == user_model.User.id
        ).where(
            shift_model.Shift.shift_date >= period.start,
            shift_model.Shift.shift_date <= period.end
        ).order_by(
            shift_model.Shift.shift_date,
            user_model.User.id
        )
    )
    db_shifts = db.execute(stmt).all()

    day_shift_members = defaultdict(list)

    for shift_date, user_id, user_name, remark in db_shifts:
        day_shift_members[shift_date].append(
            shift_schema.ShiftMemberResponse(
                user_id = user_id,
                user_name = user_name,
                remark = remark
            )
        )

    return [
        shift_schema.DayShiftResponse(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in day_shift_members.items()
    ]