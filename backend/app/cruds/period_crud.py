from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.period_model import BusinessDate, ShiftPeriod
from app.models.shift_model import ShiftRequest
from app.schemas.period_schema import ShiftPeriodCreate, ShiftPeriodResponse
from app.utils.period_util import get_period, lock_period_updates


def period_response(period):
    return ShiftPeriodResponse(
        id=period.id, name=period.name, start=period.start, end=period.end,
        business_dates=sorted(d.business_date for d in period.business_dates),
        shift_version=period.shift_version,
    )


def create_shift_period(period: ShiftPeriodCreate, db: Session) -> dict:
    try:
        if period.start >= period.end:
            raise HTTPException(status_code=400, detail="期間が不正です")
        dates = set(period.business_dates)
        if not dates or any(d < period.start or d > period.end for d in dates):
            raise HTTPException(status_code=400, detail="期間内の営業日を1日以上指定してください")
        lock_period_updates(db)
        overlaps = db.scalars(select(ShiftPeriod).where(
            ShiftPeriod.start <= period.end,
            ShiftPeriod.end >= period.start,
        ).order_by(ShiftPeriod.start)).all()
        overlap_ids = {p.id for p in overlaps}
        if (overlap_ids and period.overwrite_period_ids is None) or (
            period.overwrite_period_ids is not None
            and set(period.overwrite_period_ids) != overlap_ids
        ):
            raise HTTPException(status_code=409, detail={
                "message": "期間が重複しているシフト期間が存在します。上書きしますか？",
                "periods": [period_response(p).model_dump(mode="json") for p in overlaps],
            })
        for existing in overlaps:
            db.execute(delete(ShiftRequest).where(
                ShiftRequest.shift_date >= existing.start,
                ShiftRequest.shift_date <= existing.end,
            ))
            db.delete(existing)
        db.flush()
        created = ShiftPeriod(name=period.name, start=period.start, end=period.end)
        created.business_dates = [BusinessDate(business_date=d) for d in sorted(dates)]
        db.add(created)
        db.commit()
        return {"message": "営業日登録完了"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="営業日の登録に失敗しました") from exc


def get_shift_period(db: Session, period_id=None, latest=False):
    return period_response(get_period(db, period_id, latest))


def get_shift_periods(db: Session):
    return [period_response(p) for p in db.scalars(
        select(ShiftPeriod).order_by(ShiftPeriod.end.desc(), ShiftPeriod.id.desc())
    ).all()]
