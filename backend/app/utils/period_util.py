from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from app.models.period_model import ShiftPeriod

def get_period(db: Session) -> ShiftPeriod:
    period = db.execute(
        select(ShiftPeriod)
    ).scalar_one_or_none()

    if not period:
        raise HTTPException(
            status_code=404,
            detail="シフト登録可能な期間がありません"
        )
    
    return period