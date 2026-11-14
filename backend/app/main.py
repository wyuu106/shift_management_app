import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    user_router,
    period_router,
    shift_router
)

# テーブルの作成・変更はAlembic（backend/alembic/）で行う。起動時には作成しない。
# 初期管理者はAPIではなく scripts/create_admin.py で作成する。
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

app.include_router(user_router.router)
app.include_router(period_router.router)
app.include_router(shift_router.router)
