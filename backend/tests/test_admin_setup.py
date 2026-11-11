"""本番DBへ接続せず、初期管理者作成とAlembic初期マイグレーションを検証する。"""
import os
import unittest
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine, event, inspect, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import user_model, period_model, shift_model  # noqa: F401
from app.models.user_model import User
from app.utils.auth import verify_password
from scripts.create_admin import create_admin

try:
    from alembic import command
    from alembic.autogenerate import compare_metadata
    from alembic.config import Config
    from alembic.migration import MigrationContext
except ImportError:
    command = None

BACKEND_DIR = Path(__file__).resolve().parent.parent


def memory_engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    return engine


class CreateAdminTest(unittest.TestCase):
    def setUp(self):
        self.engine = memory_engine()
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_create_admin_hashes_password(self):
        create_admin(self.db, "admin", "店長", "password123")

        admin = self.db.execute(select(User)).scalar_one()
        self.assertEqual(admin.role, "admin")
        self.assertNotEqual(admin.hashed_password, "password123")
        self.assertTrue(verify_password("password123", admin.hashed_password))

    def test_reject_second_admin(self):
        create_admin(self.db, "admin", "店長", "password123")

        with self.assertRaises(ValueError):
            create_admin(self.db, "admin2", "副店長", "password123")

    def test_reject_duplicate_staff_name(self):
        self.db.add(User(id="staff", name="店長", hashed_password="x", role="staff"))
        self.db.commit()

        with self.assertRaises(ValueError):
            create_admin(self.db, "admin", "店長", "password123")


class InitApiRemovedTest(unittest.TestCase):
    def test_init_api_is_not_exposed(self):
        from app.main import app

        paths = set(app.openapi()["paths"])
        self.assertIn("/login", paths)
        self.assertNotIn("/init", paths)


@unittest.skipIf(command is None, "alembicが未インストール")
class InitialMigrationTest(unittest.TestCase):
    def setUp(self):
        self.engine = memory_engine()
        self.config = Config(str(BACKEND_DIR / "alembic.ini"))

    def tearDown(self):
        self.engine.dispose()

    def upgrade(self, connection, revision="head"):
        self.config.attributes["connection"] = connection
        command.upgrade(self.config, revision)

    def test_migration_matches_models(self):
        with self.engine.begin() as connection:
            self.upgrade(connection)
            diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)

        self.assertEqual(diff, [])

    def test_downgrade_removes_tables(self):
        with self.engine.begin() as connection:
            self.upgrade(connection)
            self.config.attributes["connection"] = connection
            command.downgrade(self.config, "base")
            tables = set(inspect(connection).get_table_names())

        self.assertEqual(tables, {"alembic_version"})


if __name__ == "__main__":
    unittest.main()
