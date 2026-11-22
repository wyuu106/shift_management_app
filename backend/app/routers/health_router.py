from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.db import get_db

router = APIRouter()


# 起動確認と死活監視用。認証なしで呼ばれるため、状態以外の情報は返さない
@router.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="データベースに接続できません"
        )

    return {"status": "ok"}
