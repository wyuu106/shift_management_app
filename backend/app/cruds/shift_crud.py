from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from collections import defaultdict
from app.utils.period_util import get_period, lock_period_updates
from app.models import shift_model, user_model, period_model
from app.schemas import shift_schema

# ユーザーごとのシフト希望一覧取得
def get_user_shift_requests(
        current_user: user_model.User,
        db: Session,
        period_id: int | None = None,
) -> shift_schema.ShiftRequestResponse:
    period = get_period(db, period_id, latest=period_id is None)

    stmt = (
        select(
            shift_model.ShiftRequest.shift_date,
            shift_model.ShiftRequest.remark
        ).where(
            shift_model.ShiftRequest.user_id == current_user.id,
            shift_model.ShiftRequest.shift_date >= period.start,
            shift_model.ShiftRequest.shift_date <= period.end
        ).order_by(
            shift_model.ShiftRequest.shift_date
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
        db: Session,
        period_id: int | None = None,
) -> dict:
    try:
        lock_period_updates(db)
        period = get_period(db, period_id, latest=period_id is None)
        allowed = {d.business_date for d in period.business_dates}
        dates = [d.shift_date for d in shift_request_dates]
        if len(dates) != len(set(dates)) or any(d not in allowed for d in dates):
            raise HTTPException(status_code=400, detail="選択した期間の営業日を重複なく指定してください")
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
        db: Session,
        period_id: int | None = None,
) -> list[shift_schema.DayShiftResponse]:
    period = get_period(db, period_id)
    
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

    res = []

    shift_dates = [
        d.business_date
        for d in period.business_dates
    ]

    for shift_date in shift_dates:
        res.append(
            shift_schema.DayShiftResponse(
                shift_date = shift_date,
                members = day_shift_members[shift_date]
            )
        )
    
    return res

# シフト登録
def create_day_shift(
        shifts: list[shift_schema.DayShiftCreate],
        db: Session,
        period_id: int | None = None,
) -> dict:
    try:
        lock_period_updates(db)
        period = get_period(db, period_id)
        allowed = {d.business_date for d in period.business_dates}
        dates = [d.shift_date for d in shifts]
        if len(dates) != len(set(dates)) or any(d not in allowed for d in dates):
            raise HTTPException(status_code=400, detail="選択した期間の営業日を重複なく指定してください")
        user_ids = {m.user_id for day in shifts for m in day.members}
        valid_users = set(db.scalars(select(user_model.User.id).where(
            user_model.User.id.in_(user_ids), user_model.User.role == "staff"
        )).all())
        if valid_users != user_ids or any(
            len(day.members) != len({m.user_id for m in day.members}) for day in shifts
        ):
            raise HTTPException(status_code=400, detail="スタッフの指定が不正です")
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
        db: Session,
        period_id: int | None = None,
) -> list[shift_schema.DayShiftResponse]:
    period = get_period(db, period_id)
    
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

    res = []

    shift_dates = [
        d.business_date
        for d in period.business_dates
    ]

    for shift_date in shift_dates:
        res.append(
            shift_schema.DayShiftResponse(
                shift_date = shift_date,
                members = day_shift_members[shift_date]
            )
        )

    return res

# ユーザーごとのシフト確認
def get_user_shifts(
        current_user: user_model.User,
        db: Session,
        period_id: int | None = None,
) -> shift_schema.UserShiftResponse:
    period = get_period(db, period_id)

    stmt = select(
        shift_model.Shift.shift_date,
        shift_model.Shift.remark
    ).where(
        shift_model.Shift.user_id == current_user.id,
        shift_model.Shift.shift_date >= period.start,
        shift_model.Shift.shift_date <= period.end
    ).order_by(
        shift_model.Shift.shift_date
    )
    db_shifts = db.execute(stmt).all()

    shift_dates = [
        shift_schema.ShiftDate(
            shift_date = shift_date,
            remark = remark
        )
        for shift_date, remark in db_shifts
    ]

    return shift_schema.UserShiftResponse(
        user_id = current_user.id,
        user_name = current_user.name,
        shift_dates = shift_dates
    )
