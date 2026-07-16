from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from fastapi import Response, HTTPException, status
from datetime import date
from app.models import date_model
from app.schemas import date_schema

# 期間作成
def create_business_dates(
        period: date_schema.BusinessDateCreate,
        db: Session
) -> dict:
    try:
        db.execute(delete(date_model.BusinessDate))

        for business_date in period.business_dates:
            db_date = date_model.BusinessDate(
                business_date = business_date
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
def get_business_dates(
        db: Session
) -> date_schema.BusinessDateResponse:
    return db.execute(select(
        date_model.BusinessDate
    )).scalars().all()