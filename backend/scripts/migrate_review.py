"""レビュー修正用のPostgreSQL移行。既定は確認だけで、--apply時のみ変更する。"""
import argparse
from uuid import uuid4

from sqlalchemy import inspect, text, String

from app.db import engine


def migrate(connection, apply=False):
    if connection.dialect.name != "postgresql":
        raise RuntimeError("この移行はPostgreSQL専用です")
    required = {"users", "user_requests", "shift_periods", "business_dates", "shifts", "shift_requests"}
    inspector = inspect(connection)
    if not required.issubset(set(inspector.get_table_names())):
        raise RuntimeError("既存テーブルが不足しています。対象DBを確認してください")
    for table, column in (("users", "id"), ("shifts", "user_id"), ("shift_requests", "user_id")):
        actual = next(c for c in inspector.get_columns(table) if c["name"] == column)
        if not isinstance(actual["type"], String):
            raise RuntimeError(f"{table}.{column}が文字列型ではありません。移行を中止します")

    counts = {
        table: connection.scalar(text(f'SELECT count(*) FROM "{table}"'))
        for table in sorted(required)
    }
    for column in ("user_id", "name"):
        duplicates = connection.scalar(text(
            f"SELECT count(*) FROM (SELECT {column} FROM user_requests "
            f"WHERE status = 'pending' GROUP BY {column} HAVING count(*) > 1) AS duplicates"
        ))
        if duplicates:
            raise RuntimeError(f"未処理申請の{column}に重複があります。手動で整理してから再実行してください")
    columns = {c["name"] for c in inspector.get_columns("users")}
    period_columns = {c["name"] for c in inspector.get_columns("shift_periods")}
    if not apply:
        return counts

    # 更新中のアプリを停止してから適用する。DDLと補完は一括コミットする。
    if "auth_id" not in columns:
        connection.execute(text("ALTER TABLE users ADD COLUMN auth_id VARCHAR(36)"))
    for user_id in connection.scalars(text("SELECT id FROM users WHERE auth_id IS NULL")).all():
        connection.execute(text("UPDATE users SET auth_id = :auth_id WHERE id = :user_id"), {
            "auth_id": str(uuid4()), "user_id": user_id,
        })
    connection.execute(text("ALTER TABLE users ALTER COLUMN auth_id SET NOT NULL"))
    connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_id ON users (auth_id)"))
    if "shift_version" not in period_columns:
        connection.execute(text(
            "ALTER TABLE shift_periods ADD COLUMN shift_version INTEGER NOT NULL DEFAULT 0"
        ))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS shift_request_versions (
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            period_id INTEGER NOT NULL REFERENCES shift_periods(id) ON DELETE CASCADE,
            version INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, period_id)
        )
    """))
    for column in ("user_id", "name"):
        connection.execute(text(
            f"CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_request_{column} "
            f"ON user_requests ({column}) WHERE status = 'pending'"
        ))
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    with engine.begin() as connection:
        counts = migrate(connection, apply=args.apply)
    print("適用完了" if args.apply else "確認のみ（変更なし）", counts)
