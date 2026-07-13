from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import Response, HTTPException, status
from datetime import date
from app.models import period_model
from app.schemas import period_schema

"""
# 期間作成
def create_shift_period(
        period: period_schema.ShiftPeriodCreate,
        db: Session
) -> period_schema.ShiftPeriodCreateResponse:
    db_period = period_model.ShiftPeriod(
        name = period.name,
        start = period.start,
        end = period.end
    )
    db.add(db_period)
    db.commit()
    db.refresh(db_period)

    return db_period
"""

# 期間取得
def get_shift_periods(
        db: Session
) -> period_schema.ShiftPeriodCreateResponse:
    db_period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not db_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="有効な期間がありません"
        )
    
    return db_period

# 期間更新
def update_shift_period(
        new_period: period_schema.ShiftPeriodCreate,
        db: Session
) -> period_schema.ShiftPeriodCreateResponse:
    db_period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not db_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="有効な期間がありません"
        )

    db_period.name = new_period.name
    db_period.start = new_period.start
    db_period.end = new_period.end

    db.commit()
    db.refresh(db_period)

    return db_period

# 期間有効化
def activate_shift_period(
        db: Session
) -> period_schema.ShiftPeriodCreateResponse:
    db_period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not db_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="有効な期間がありません"
        )

    db_period.is_active = True

    db.commit()
    db.refresh(db_period)

    return db_period

# 期間無効化
def deactivate_shift_period(db: Session) -> dict:
    db_period = db.execute(
        select(period_model.ShiftPeriod)
    ).scalar_one_or_none()

    if not db_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="有効な期間がありません"
        )

    db_period.is_active = False

    db.commit()
    db.refresh(db_period)

    return db_period