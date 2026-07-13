import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from app.utils.auth import hash_password
from app.db import get_db, Base, engine
from app.models.user_model import User
from app.routers import (
    user_router,
    period_router,
    shift_router
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# .envを読み込む
load_dotenv()

origins = os.getenv("ALLOW_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初期化（admin作成）API
@app.post("/init", response_model=str)
def init(db: Session = Depends(get_db)) -> dict:
    exist_admin = db.execute(
        select(User).where(User.role == "admin")
    ).scalar_one_or_none()

    if exist_admin:
        raise HTTPException(status_code=400, detail="登録済みです")
    
    name = os.getenv("ADMIN_NAME")
    password = os.getenv("PASSWORD")
    admin = User(
        name = name,
        hashed_password = hash_password(password),
        role = "admin"
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {"message": "管理者登録"}

app.include_router(user_router.router)
app.include_router(period_router.router)
app.include_router(shift_router.router)