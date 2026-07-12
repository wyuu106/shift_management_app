from dotenv import load_dotenv
import os
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from jose import jwt
from jose import JWTError
from passlib.context import CryptContext
from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import user_model

# .env読み込み
load_dotenv()

# osで.envの中身を環境変数として取得
SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# パスワードのハッシュ化
def hash_password(password: str):
    return pwd_context.hash(password)

# パスワード確認
def verify_password(
    plain_password,
    hashed_password
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(hours=6)

    to_encode.update({
        "exp": expire,
        "sub": str(data["sub"])
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

# 管理者認証用
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="認証に失敗しました"
        )

    user = db.execute(select(user_model.User).where(
        user_model.User.id == user_id
    )).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="認証に失敗しました"
        )

    return user