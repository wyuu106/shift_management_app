from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from collections import defaultdict
from app.models import shift_model, user_model
from app.schemas import shift_schema

# ユーザーごとのシフト希望一覧取得
def get_user_shift_requests(
        start: date,
        end: date,
        current_user: user_model.User,
        db: Session
) -> shift_schema.ShiftRequestResponse:
    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            shift_model.ShiftRequest.remark
        ).where(
            shift_model.ShiftRequest.user_id == current_user.id,
            shift_model.ShiftRequest.shift_date >= start,
            shift_model.ShiftRequest.shift_date <= end
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
        start: date,
        end: date,
        shift_request_dates: list[shift_schema.ShiftRequestCreate],
        current_user: user_model.User,
        db: Session
) -> dict:
    try:
        db.execute(delete(shift_model.ShiftRequest).where(
            shift_model.ShiftRequest.user_id == current_user.id,
            shift_model.ShiftRequest.shift_date >= start,
            shift_model.ShiftRequest.shift_date <= end
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
        start: date,
        end: date,
        db: Session
) -> list[shift_schema.DayShiftData]:
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
            shift_model.ShiftRequest.shift_date >= start,
            shift_model.ShiftRequest.shift_date <= end
        ).order_by(
            shift_model.ShiftRequest.shift_date,
            user_model.User.id
        )
    )
    db_shift_requests = db.execute(stmt).all()

    day_shift_members = defaultdict(list)

    for shift_date, user_id, user_name, remark in db_shift_requests:
        day_shift_members[shift_date].append(
            shift_schema.ShiftMember(
                user_id = user_id,
                user_name = user_name,
                remark = remark
            )
        )
    
    return [
        shift_schema.DayShiftData(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in day_shift_members.items()
    ]

# 日付ごとのシフト希望一覧取得
def get_day_shift_requests(
        target_date: date,
        db: Session
) -> shift_schema.DayShiftData:
    stmt = (
        select(
            user_model.User.id,
            user_model.User.name,
            shift_model.ShiftRequest.remark
        ).select_from(
            shift_model.ShiftRequest
        ).join(
            user_model.User,
            shift_model.ShiftRequest.user_id == user_model.User.id
        ).where(
            shift_model.ShiftRequest.shift_date == target_date
        ).order_by(
            user_model.User.id
        )
    )
    db_shift_members = db.execute(stmt).all()

    members = [
        shift_schema.ShiftMember(
            user_id = user_id,
            user_name = user_name,
            remark = remark
        )
        for user_id, user_name, remark in db_shift_members
    ]

    return shift_schema.DayShiftData(
        shift_date = target_date,
        members = members
    )

# シフト作成
def create_shift(
        start: date,
        end: date,
        shifts: list[shift_schema.DayShiftData],
        db: Session
) -> dict:
    try:
        db.execute(delete(shift_model.Shift).where(
            shift_model.Shift.shift_date >= start,
            shift_model.Shift.shift_date <= end
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

        return {"message": "シフト作成完了"}
    
    except Exception:
        db.rollback()
        raise

# 指定範囲のシフト一覧取得
def get_shifts(
        start: date,
        end: date,
        db: Session
) -> list[shift_schema.DayShiftData]:
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
            shift_model.Shift.shift_date >= start,
            shift_model.Shift.shift_date <= end
        ).order_by(
            shift_model.Shift.shift_date,
            user_model.User.id
        )
    )
    db_shifts = db.execute(stmt).all()

    day_shift_members = defaultdict(list)

    for shift_date, user_id, user_name, remark in db_shifts:
        day_shift_members[shift_date].append(
            shift_schema.ShiftMember(
                user_id = user_id,
                user_name = user_name,
                remark = remark
            )
        )

    return [
        shift_schema.DayShiftData(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in day_shift_members.items()
    ]