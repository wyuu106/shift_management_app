"""TEST_DATABASE_URLで明示したPostgreSQLに、一時スキーマを作って検証する。"""
import os
import re
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

import test_review
import test_periods
from app.db import Base
from app.cruds import shift_crud, user_crud
from app.models.user_model import User, UserRequest
from app.schemas.shift_schema import DayShiftCreate, ShiftMemberCreate, ShiftRequestCreate
from app.schemas.user_schema import UserRequestCreate
from scripts.migrate_review import migrate


@unittest.skipUnless(os.getenv("TEST_DATABASE_URL"), "TEST_DATABASE_URL未指定：PostgreSQLテストを省略")
class PostgresReviewTests(test_review.ReviewTests, test_periods.PeriodTests):
    def setUp(self):
        self.schema = "review_test_" + uuid4().hex
        self.base_engine = create_engine(os.environ["TEST_DATABASE_URL"])
        if self.base_engine.dialect.name != "postgresql":
            raise RuntimeError("TEST_DATABASE_URLにはPostgreSQLを指定してください")
        with self.base_engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{self.schema}"'))
        self.engine = self.base_engine.execution_options(schema_translate_map={None: self.schema})
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(id="staff", name="スタッフ", hashed_password="test", role="staff")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        # このテスト自身が生成した一意のスキーマだけを削除する。
        if not re.fullmatch(r"review_test_[0-9a-f]{32}", self.schema):
            raise RuntimeError("削除対象スキーマが不正です")
        with self.base_engine.begin() as connection:
            exists = connection.scalar(text(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name = :name"
            ), {"name": self.schema})
            if exists != 1:
                raise RuntimeError("テスト用スキーマが見つかりません")
            connection.execute(text(f'DROP SCHEMA "{self.schema}" CASCADE'))
        self.base_engine.dispose()

    def test_concurrent_saves_accept_only_one_version(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        period_id, day = period.id, period.start
        self.db.rollback()
        barrier = Barrier(2)

        def save(remark):
            with Session(self.engine) as db:
                barrier.wait(timeout=10)
                try:
                    shift_crud.create_day_shift([DayShiftCreate(shift_date=day, members=[
                        ShiftMemberCreate(user_id="staff", remark=remark),
                    ])], db, period_id, 0)
                    return 200
                except HTTPException as error:
                    return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(save, ("A", "B"))), [200, 409])

    def test_concurrent_approval_and_rejection_remain_consistent(self):
        request = UserRequest(user_id="new", name="申請", hashed_password="test")
        self.db.add(request)
        self.db.commit()
        request_id = request.id
        self.db.rollback()
        barrier = Barrier(2)

        def process(approve):
            with Session(self.engine) as db:
                barrier.wait(timeout=10)
                try:
                    operation = user_crud.approve_user_request if approve else user_crud.reject_user_request
                    operation(request_id, db)
                    return 200
                except HTTPException as error:
                    return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(process, (True, False))), [200, 400])
        self.db.expire_all()
        status = self.db.get(UserRequest, request_id).status
        self.assertEqual(self.db.get(User, "new") is not None, status == "approved")

    def test_concurrent_request_saves_accept_only_one_version(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        period_id, day = period.id, period.start
        self.db.rollback()
        barrier = Barrier(2)

        def save(remark):
            with Session(self.engine) as db:
                user = db.get(User, "staff")
                barrier.wait(timeout=10)
                try:
                    shift_crud.create_shift_request([
                        ShiftRequestCreate(shift_date=day, remark=remark),
                    ], user, db, period_id, 0)
                    return 200
                except HTTPException as error:
                    return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(save, ("A", "B"))), [200, 409])

    def test_concurrent_registration_cannot_create_duplicate_pending(self):
        barrier = Barrier(2)

        def register(_):
            with Session(self.engine) as db:
                barrier.wait(timeout=10)
                try:
                    user_crud.create_user_request(UserRequestCreate(
                        id="new", name="新規申請", password="test-password",
                    ), db)
                    return 200
                except HTTPException as error:
                    return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = sorted(pool.map(register, (0, 1)))
        self.assertEqual(results[0], 200)
        self.assertIn(results[1], (400, 409))
        self.assertEqual(len(self.db.scalars(select(UserRequest)).all()), 1)

    def test_migration_preserves_data_and_is_repeatable(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        self.seed_shifts(period)
        self.db.close()
        with self.base_engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{self.schema}"'))
            connection.execute(text("DROP TABLE shift_request_versions"))
            connection.execute(text("ALTER TABLE users DROP COLUMN auth_id"))
            connection.execute(text("ALTER TABLE shift_periods DROP COLUMN shift_version"))
            before = migrate(connection)
            self.assertEqual(migrate(connection, apply=True), before)
            auth_id = connection.scalar(text("SELECT auth_id FROM users WHERE id = 'staff'"))
            self.assertTrue(auth_id)
            self.assertEqual(migrate(connection, apply=True), before)
            self.assertEqual(connection.scalar(text("SELECT auth_id FROM users WHERE id = 'staff'")), auth_id)

    def test_migration_refuses_duplicate_pending_requests(self):
        self.db.close()
        with self.base_engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{self.schema}"'))
            connection.execute(text("DROP INDEX uq_pending_request_user_id"))
            connection.execute(text("INSERT INTO user_requests (user_id, name, hashed_password, status) "
                                    "VALUES ('new', 'A', 'test', 'pending'), ('new', 'B', 'test', 'pending')"))
            with self.assertRaises(RuntimeError):
                migrate(connection, apply=True)
            self.assertEqual(connection.scalar(text("SELECT count(*) FROM user_requests")), 2)
