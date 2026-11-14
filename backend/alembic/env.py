from logging.config import fileConfig

from alembic import context

from app.db import Base, engine

# autogenerateがすべてのテーブルを検出できるよう、モデルを読み込んでおく
from app.models import user_model, period_model, shift_model  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    # `alembic upgrade head --sql` で適用前にSQLを確認するときに使う
    context.configure(
        url=engine.url.render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_with_connection(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    # 全マイグレーションを1トランザクションで適用し、失敗時はまとめてロールバックする
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    # テストから接続を渡された場合はそれを使う
    connection = config.attributes.get("connection")
    if connection is not None:
        run_with_connection(connection)
        return

    with engine.connect() as connection:
        run_with_connection(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
