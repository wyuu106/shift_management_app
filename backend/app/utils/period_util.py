from sqlalchemy.orm import Session
from sqlalchemy import select, text
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from app.models.period_model import ShiftPeriod

def lock_period_updates(db: Session):
    # 期間の置換とシフト保存を直列化する。
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(734219)"))


def get_period(db: Session, period_id: int | None = None, latest=False) -> ShiftPeriod:
    stmt = select(ShiftPeriod)
    if period_id is not None:
        stmt = stmt.where(ShiftPeriod.id == period_id)
    elif latest:
        stmt = stmt.order_by(ShiftPeriod.end.desc(), ShiftPeriod.id.desc()).limit(1)
    else:
        today = datetime.now(ZoneInfo("Asia/Tokyo")).date()
        stmt = stmt.where(ShiftPeriod.start <= today, ShiftPeriod.end >= today)
    period = db.execute(stmt.execution_options(populate_existing=True)).scalar_one_or_none()

    if not period:
        raise HTTPException(
            status_code=404,
            detail="現在のシフト期間はありません"
        )
    
    return period
