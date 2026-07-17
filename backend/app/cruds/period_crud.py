from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from app.models import period_model
from app.schemas import period_schema

# 期間作成
def create_shift_period(
        period: period_schema.ShiftPeriodCreate,
        db: Session
) -> dict:
    try:
        if not period.start < period.end:
            raise HTTPException(
                status_code=400,
                detail="期間が不正です"
            )

        db.execute(delete(period_model.BusinessDate))
        db.execute(delete(period_model.ShiftPeriod))

        db_period = period_model.ShiftPeriod(
            name = period.name,
            start = period.start,
            end = period.end
        )

        db.add(db_period)
        db.flush()

        for business_date in period.business_dates:
            db_date = period_model.BusinessDate(
                business_date = business_date,
                period_id = db_period.id
            )

            db.add(db_date)

        db.commit()

        return {"message": "営業日登録完了"}
    
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="営業日の登録に失敗しました"
        )

# 期間取得
def get_shift_period(
        db: Session
) -> period_schema.ShiftPeriodResponse:
    stmt = (
        select(
            period_model.ShiftPeriod.id,
            period_model.ShiftPeriod.name,
            period_model.ShiftPeriod.start,
            period_model.ShiftPeriod.end,
            period_model.BusinessDate.business_date
        ).select_from(
            period_model.BusinessDate
        ).join(
            period_model.ShiftPeriod,
            period_model.ShiftPeriod.id
            == period_model.BusinessDate.period_id
        ).order_by(
            period_model.BusinessDate.business_date
        )
    )

    rows = db.execute(stmt).all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="シフト登録可能な期間がありません"
        )
    
    return period_schema.ShiftPeriodResponse(
        id = rows[0].id,
        name = rows[0].name,
        start = rows[0].start,
        end = rows[0].end,
        business_dates = [row.business_date for row in rows]
    )