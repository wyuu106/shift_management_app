import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    health_router,
    user_router,
    period_router,
    shift_router
)

# .envを読み込む
load_dotenv()


# テーブルの作成・変更はAlembic（backend/alembic/）で行う。起動時には作成しない。
# 初期管理者はAPIではなく scripts/create_admin.py で作成する。
def create_app(enable_docs: bool) -> FastAPI:
    # APIの一覧を外部に見せないよう、明示的に有効にしたときだけ公開する
    app = FastAPI(
        docs_url="/docs" if enable_docs else None,
        redoc_url="/redoc" if enable_docs else None,
        openapi_url="/openapi.json" if enable_docs else None,
    )

    origins = os.getenv("ALLOW_ORIGINS", "").split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router.router)
    app.include_router(user_router.router)
    app.include_router(period_router.router)
    app.include_router(shift_router.router)

    return app


app = create_app(
    enable_docs=os.getenv("ENABLE_API_DOCS", "").lower() == "true"
)
