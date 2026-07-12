from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from collections import defaultdict
from app.models import shift_model, user_model
from app.schemas import shift_schema

# ユーザーごとのシフト希望一覧取得
def get_user_shift_request(
        start: date,
        end: date,
        current_user: user_model.User,
        db: Session
) -> shift_schema.ShiftRequest:
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
        shift_schema.ShiftRequestDate(
            shift_date = shift_date,
            remark = remark
        )
        for shift_date, remark in db_shift_requests
    ]

    return shift_schema.ShiftRequest(
        user_id = current_user.id,
        user_name = current_user.name,
        shift_dates = shift_dates
    )

# シフト希望作成
def create_shift_request(
        start: date,
        end: date,
        shift_request_dates: list[shift_schema.ShiftRequestDate],
        current_user: user_model.User,
        db: Session
) -> dict:
    stmt = delete(shift_model.ShiftRequest).where(
        shift_model.ShiftRequest.user_id == current_user.id,
        shift_model.ShiftRequest.shift_date >= start,
        shift_model.ShiftRequest.shift_date <= end
    )
    db.execute(stmt)

    for shift_request_date in shift_request_dates:
        db_shift_request = shift_model.ShiftRequest(
            shift_date = shift_request_date.shift_date,
            remark = shift_request_date.remark,
            user_id = current_user.id
        )

        db.add(db_shift_request)

    db.commit()

    return {"message": "シフト希望登録完了"}

# 指定範囲のシフト希望一覧取得
def get_shift_requests(
        start: date,
        end: date,
        db: Session
) -> list[shift_schema.ShiftMember]:
    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            user_model.User.id,
            user_model.User.name
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

    for shift_date, user_id, user_name in db_shift_requests:
        day_shift_members[shift_date].append(
            shift_schema.ShiftMemberUser(
                user_id = user_id,
                user_name = user_name
            )
        )
    
    return [
        shift_schema.ShiftMember(
            shift_date = shift_date,
            members = members
        )
        for shift_date, members in day_shift_members.items()
    ]

# 日付ごとのシフト希望一覧取得
def get_day_shift_request(
        target_date: date,
        db: Session
) -> shift_schema.ShiftMember:
    stmt = (
        select(
            user_model.User.id,
            user_model.User.name
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
        shift_schema.ShiftMemberUser(
            user_id = user_id,
            user_name = user_name
        )
        for user_id, user_name in db_shift_members
    ]

    return shift_schema.ShiftMember(
        shift_date = target_date,
        members = members
    )