from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from collections import defaultdict
from app.models import shift_model, user_model
from app.schemas import shift_schema

# ユーザーごとのシフト希望一覧取得
def get_user_shift_requests(
        year: int,
        month: int,
        current_user: user_model.User,
        db: Session
) -> shift_schema.ShiftRequestResponse:
    start = date(year, month, 1)
    end = date(year, month+1, 1) if month < 12 else date(year+1, 1, 1)

    stmt = select(shift_model.ShiftRequest).where(
        shift_model.ShiftRequest.user_id == current_user.id,
        shift_model.ShiftRequest.shift_date >= start,
        shift_model.ShiftRequest.shift_date < end
    )
    db_shift_requests = db.execute(stmt).scalars().all()

    shifts = [
        shift_schema.ShiftRequestCreate(
            shift_date = shift_request.shift_date,
            remark = shift_request.remark
        )
        for shift_request in db_shift_requests
    ]

    return shift_schema.ShiftRequestResponse(
        shifts = shifts,
        user_name = current_user.name
    )

# シフト希望作成、更新
def create_shift_request(
        year: int,
        month: int,
        shift_requests: list[shift_schema.ShiftRequestCreate],
        current_user: user_model.User,
        db: Session
) -> dict:
    start = date(year, month, 1)
    end = date(year, month+1, 1) if month < 12 else date(year+1, 1, 1)

    stmt = delete(shift_model.ShiftRequest).where(
        shift_model.ShiftRequest.user_id == current_user.id,
        shift_model.ShiftRequest.shift_date >= start,
        shift_model.ShiftRequest.shift_date < end
    )
    db.execute(stmt)

    for shift_request in shift_requests:
        db_shift_request = shift_model.ShiftRequest(
            shift_date = shift_request.shift_date,
            remark = shift_request.remark,
            user_id = current_user.id
        )

        db.add(db_shift_request)

    db.commit()

    return {"message": "シフト提出完了"}

# 月ごとのシフト希望一覧取得
def get_all_shift_requests(
        year: int,
        month: int,
        db: Session
) -> list[shift_schema.ShiftMember]:
    start = date(year, month, 1)
    end = date(year, month+1, 1) if month < 12 else date(year+1, 1, 1)

    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            user_model.User.name
        ).join(
            user_model.User,
            shift_model.ShiftRequest.user_id == user_model.User.id
        ).where(
            shift_model.ShiftRequest.shift_date >= start,
            shift_model.ShiftRequest.shift_date < end
        ).order_by(
            shift_model.ShiftRequest.shift_date
        )
    )
    db_shift_requests = db.execute(stmt).all()

    # 日付ごとにユーザーをまとめる
    members_by_date = defaultdict(list)

    for shift_date, user_name in db_shift_requests:
        members_by_date[shift_date].append(user_name)

    return [
        shift_schema.ShiftMember(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in members_by_date.items()
    ]

# 日付ごとのシフト希望一覧取得
def get_day_shift_requests(
        target_date: date,
        db: Session
) -> shift_schema.ShiftMember:
    stmt = (
        select(
            user_model.User.name
        ).select_from(
            shift_model.ShiftRequest
        ).join(
            user_model.User,
            shift_model.ShiftRequest.user_id == user_model.User.id
        ).where(
            shift_model.ShiftRequest.shift_date == target_date
        )
    )
    db_members = db.execute(stmt).scalars().all()

    return shift_schema.ShiftMember(
        shift_date = target_date,
        members = db_members
    )