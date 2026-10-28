"""本番DBへ接続せず、期間切り替え・保存の原子性を検証する。"""
import os
import unittest
import asyncio
import json as jsonlib
from contextlib import nullcontext
from types import SimpleNamespace
from urllib.parse import urlencode
from datetime import date
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models.period_model import ShiftPeriod, BusinessDate
from app.models.shift_model import Shift, ShiftRequest
from app.models.user_model import User
from app.schemas.period_schema import ShiftPeriodCreate
from app.schemas.shift_schema import ShiftRequestCreate, DayShiftCreate, ShiftMemberCreate
from app.cruds.period_crud import create_shift_period, get_shift_periods
from app.cruds.shift_crud import (
    create_shift_request, create_day_shift, get_shifts, get_user_shift_requests,
)
from app.utils.period_util import get_period


class ASGIClient:
    """HTTPテスト用の追加依存を使わず、ASGIへリクエストを渡す。"""
    def __init__(self, app):
        self.app = app

    def request(self, method, path, params=None, json=None):
        async def run():
            messages = []

            async def receive():
                return {"type": "http.request", "body": jsonlib.dumps(json).encode()}

            async def send(message):
                messages.append(message)

            await self.app({
                "type": "http", "asgi": {"version": "3.0"},
                "http_version": "1.1", "method": method,
                "scheme": "http", "path": path, "root_path": "",
                "query_string": urlencode(params or {}).encode(),
                "headers": [(b"content-type", b"application/json")],
                "server": ("test", 80), "client": ("test", 1234),
            }, receive, send)
            status = next(m["status"] for m in messages if m["type"] == "http.response.start")
            body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
            return SimpleNamespace(status_code=status, json=lambda: jsonlib.loads(body))

        return asyncio.run(run())

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def put(self, path, **kwargs):
        return self.request("PUT", path, **kwargs)


class PeriodTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(id="staff", name="スタッフ", hashed_password="test", role="staff")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def payload(self, start, end, **kwargs):
        return ShiftPeriodCreate(
            name="期間", start=date.fromisoformat(start), end=date.fromisoformat(end),
            business_dates=[date.fromisoformat(start)], **kwargs,
        )

    def add_period(self, start, end):
        create_shift_period(self.payload(start, end), self.db)
        return self.db.scalar(select(ShiftPeriod).where(ShiftPeriod.start == date.fromisoformat(start)))

    def seed_shifts(self, period):
        self.db.add_all([
            Shift(shift_date=period.start, user_id="staff", remark="確定"),
            ShiftRequest(shift_date=period.start, user_id="staff", remark="希望"),
        ])
        self.db.commit()

    def test_add_current_latest_and_selected(self):
        first = self.add_period("2026-11-01", "2026-11-15")
        last = self.add_period("2026-12-01", "2026-12-15")
        self.assertEqual(len(get_shift_periods(self.db)), 2)
        self.assertEqual(get_period(self.db, latest=True).id, last.id)
        self.assertEqual(get_period(self.db, first.id).id, first.id)
        with patch("app.utils.period_util.datetime") as clock:
            clock.now.return_value.date.return_value = first.end
            self.assertEqual(get_period(self.db).id, first.id)
            clock.now.return_value.date.return_value = date(2026, 11, 16)
            with self.assertRaises(HTTPException) as error:
                get_period(self.db)
            self.assertEqual(error.exception.status_code, 404)

    def test_overlap_requires_confirmation_and_preserves_confirmed_shifts(self):
        first = self.add_period("2026-11-01", "2026-11-15")
        second = self.add_period("2026-11-16", "2026-11-30")
        other = self.add_period("2026-12-01", "2026-12-15")
        ids = [first.id, second.id]
        self.seed_shifts(first)
        self.seed_shifts(second)
        self.seed_shifts(other)
        with self.assertRaises(HTTPException) as error:
            create_shift_period(self.payload("2026-11-10", "2026-11-20"), self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(len(error.exception.detail["periods"]), 2)
        self.assertEqual(len(get_shift_periods(self.db)), 3)
        with self.assertRaises(HTTPException):
            create_shift_period(self.payload(
                "2026-11-10", "2026-11-20", overwrite_period_ids=ids[:1],
            ), self.db)
        create_shift_period(self.payload(
            "2026-11-10", "2026-11-20", overwrite_period_ids=ids,
        ), self.db)
        self.assertEqual(len(get_shift_periods(self.db)), 2)
        self.assertEqual(len(self.db.scalars(select(Shift)).all()), 3)
        self.assertEqual(len(self.db.scalars(select(ShiftRequest)).all()), 1)
        self.assertEqual(self.db.scalar(select(ShiftRequest)).shift_date, other.start)

    def test_boundary_overlap_and_validation(self):
        self.add_period("2026-11-01", "2026-11-15")
        with self.assertRaises(HTTPException) as error:
            create_shift_period(self.payload("2026-11-15", "2026-11-30"), self.db)
        self.assertEqual(error.exception.status_code, 409)
        invalid = self.payload("2026-12-01", "2026-12-15")
        invalid.business_dates = [date(2027, 1, 1)]
        with self.assertRaises(HTTPException) as error:
            create_shift_period(invalid, self.db)
        self.assertEqual(error.exception.status_code, 400)

    def test_selected_shift_writes_leave_other_period_untouched(self):
        first = self.add_period("2026-11-01", "2026-11-15")
        second = self.add_period("2026-12-01", "2026-12-15")
        self.seed_shifts(first)
        self.seed_shifts(second)
        create_shift_request([], self.user, self.db, first.id)
        self.assertEqual(len(get_user_shift_requests(self.user, self.db, second.id).shift_dates), 1)
        create_day_shift([], self.db, first.id)
        self.assertEqual(len(get_shifts(self.db, second.id)[0].members), 1)
        with self.assertRaises(HTTPException):
            create_shift_request([ShiftRequestCreate(shift_date=second.start)], self.user, self.db, first.id)
        with self.assertRaises(HTTPException):
            create_day_shift([DayShiftCreate(shift_date=second.start, members=[])], self.db, first.id)

    def test_period_failure_rolls_back_deleted_period_dates_and_requests(self):
        original = self.add_period("2026-11-01", "2026-11-15")
        original_id = original.id
        self.seed_shifts(original)

        def fail_insert(*args):
            raise RuntimeError("injected insert failure")

        event.listen(BusinessDate, "before_insert", fail_insert)
        try:
            with self.assertRaises(HTTPException):
                create_shift_period(self.payload(
                    "2026-11-10", "2026-11-20", overwrite_period_ids=[original_id],
                ), self.db)
        finally:
            event.remove(BusinessDate, "before_insert", fail_insert)
        self.assertEqual(get_period(self.db, original_id).start, date(2026, 11, 1))
        self.assertEqual(len(self.db.scalars(select(BusinessDate)).all()), 1)
        self.assertEqual(len(self.db.scalars(select(ShiftRequest)).all()), 1)
        self.assertEqual(len(self.db.scalars(select(Shift)).all()), 1)

    def test_request_and_shift_insert_failures_roll_back_deletes(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        period_id, day = period.id, period.start
        self.seed_shifts(period)

        def fail_insert(*args):
            raise RuntimeError("injected insert failure")

        operations = [
            (ShiftRequest, lambda: create_shift_request(
                [ShiftRequestCreate(shift_date=day)], self.user, self.db, period_id,
            )),
            (Shift, lambda: create_day_shift([
                DayShiftCreate(shift_date=day, members=[ShiftMemberCreate(user_id="staff")]),
            ], self.db, period_id)),
        ]
        for model, operation in operations:
            with self.subTest(model=model.__name__):
                event.listen(model, "before_insert", fail_insert)
                try:
                    with self.assertRaises(RuntimeError):
                        operation()
                finally:
                    event.remove(model, "before_insert", fail_insert)
                rows = self.db.scalars(select(model)).all()
                self.assertEqual(len(rows), 1)
                self.assertIsNotNone(rows[0].remark)

    def test_http_contracts_and_permissions(self):
        from fastapi import FastAPI
        from app.db import get_db
        from app.routers import period_router, shift_router
        from app.utils.auth import get_current_user

        app = FastAPI()
        app.include_router(period_router.router)
        app.include_router(shift_router.router)
        app.dependency_overrides[get_db] = lambda: self.db
        with nullcontext(ASGIClient(app)) as client:
            self.assertEqual(client.get("/periods").status_code, 401)
            app.dependency_overrides[get_current_user] = lambda: self.user
            self.assertEqual(client.put("/period", json={
                "start": "2026-11-01", "end": "2026-11-15",
                "business_dates": ["2026-11-01"],
            }).status_code, 403)
            self.assertEqual(client.put("/shift", json=[]).status_code, 403)
            self.assertEqual(client.get("/shift/requests").status_code, 403)
            admin = User(id="admin", name="管理者", role="admin")
            app.dependency_overrides[get_current_user] = lambda: admin
            payload = {
                "start": "2026-11-01", "end": "2026-11-15",
                "business_dates": ["2026-11-01"],
            }
            self.assertEqual(client.put("/period", json=payload).status_code, 200)
            response = client.get("/period", params={"latest": True})
            self.assertEqual(response.status_code, 200)
            period_id = response.json()["id"]
            self.assertEqual(len(client.get("/periods").json()), 1)
            conflict = client.put("/period", json=payload)
            self.assertEqual(conflict.status_code, 409)
            self.assertEqual(conflict.json()["detail"]["periods"][0]["id"], period_id)
            self.assertEqual(client.get("/shifts", params={"period_id": period_id}).status_code, 200)
            self.assertEqual(client.get("/period", params={"period_id": 999}).status_code, 404)
            self.assertEqual(client.get("/period", params={"period_id": "invalid"}).status_code, 422)
            self.assertEqual(client.put("/shift", params={"period_id": period_id}, json=[{
                "shift_date": "2026-12-01", "members": [],
            }]).status_code, 400)


if __name__ == "__main__":
    unittest.main()
