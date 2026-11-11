"""初期管理者を作成する。パスワードは対話入力し、引数・環境変数・ログに平文を残さない。

backend/で実行する:
    python -m scripts.create_admin --id admin --name 店長
"""
import argparse
import getpass
import sys

from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user_model import User
from app.utils.auth import hash_password

MIN_PASSWORD_LENGTH = 8


def create_admin(db: Session, admin_id: str, name: str, password: str) -> User:
    exist_admin = db.execute(
        select(User).where(User.role == "admin")
    ).first()
    if exist_admin:
        raise ValueError("管理者は登録済みです")

    duplicate = db.execute(
        select(User).where(or_(User.id == admin_id, User.name == name))
    ).first()
    if duplicate:
        raise ValueError("同じIDまたは名前のユーザーが存在します")

    admin = User(
        id=admin_id,
        name=name,
        hashed_password=hash_password(password),
        role="admin",
    )

    try:
        db.add(admin)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return admin


def read_password() -> str:
    password = getpass.getpass("パスワード: ")
    confirm = getpass.getpass("パスワード（確認）: ")

    if password != confirm:
        raise ValueError("パスワードが一致しません")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"パスワードは{MIN_PASSWORD_LENGTH}文字以上にしてください")

    return password


def main():
    parser = argparse.ArgumentParser(description="初期管理者を作成する")
    parser.add_argument("--id", required=True, help="ログインに使うユーザーID")
    parser.add_argument("--name", required=True, help="表示名")
    args = parser.parse_args()

    try:
        password = read_password()
        with SessionLocal() as db:
            create_admin(db, args.id, args.name, password)
    except ValueError as error:
        print(f"エラー: {error}", file=sys.stderr)
        sys.exit(1)

    print(f"管理者 {args.id} を作成しました")


if __name__ == "__main__":
    main()
