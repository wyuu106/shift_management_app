from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from jose import jwt
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from test_periods import DatabaseTestCase, ASGIClient
from app.cruds import shift_crud, user_crud
from app.db import get_db
from app.models.user_model import User, UserRequest
from app.models.shift_model import Shift, ShiftRequestVersion
from app.schemas.user_schema import UserRequestCreate
from app.schemas.shift_schema import ShiftRequestCreate, DayShiftCreate, ShiftMemberCreate
from app.utils import auth
from app.routers import period_router, shift_router, user_router


class ReviewTests(DatabaseTestCase):
    def test_stale_shift_save_rejected_without_deleting_current_data(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        data = [DayShiftCreate(shift_date=period.start, members=[
            ShiftMemberCreate(user_id=self.user.id, remark="最新"),
        ])]
        self.assertEqual(shift_crud.create_day_shift(data, self.db, period.id, 0)["version"], 1)
        with self.assertRaises(HTTPException) as error:
            shift_crud.create_day_shift([], self.db, period.id, 0)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.db.scalar(select(Shift)).remark, "最新")
        self.assertEqual(period.shift_version, 1)

    def test_request_versions_are_scoped_to_user_and_period(self):
        first = self.add_period("2026-11-01", "2026-11-15")
        second = self.add_period("2026-12-01", "2026-12-15")
        other = User(id="other", name="別スタッフ", role="staff", hashed_password="test")
        self.db.add(other)
        self.db.commit()
        data = [ShiftRequestCreate(shift_date=first.start, remark="最新")]
        shift_crud.create_shift_request(data, self.user, self.db, first.id, 0)
        with self.assertRaises(HTTPException) as error:
            shift_crud.create_shift_request([], self.user, self.db, first.id, 0)
        self.assertEqual(error.exception.status_code, 409)
        response = shift_crud.get_user_shift_requests(self.user, self.db, first.id)
        self.assertEqual(response.version, 1)
        self.assertEqual(response.shift_dates[0].remark, "最新")
        shift_crud.create_shift_request([], other, self.db, first.id, 0)
        shift_crud.create_shift_request([], self.user, self.db, second.id, 0)
        self.assertEqual(len(self.db.scalars(select(ShiftRequestVersion)).all()), 3)

    def test_missing_version_cannot_bypass_conflict_check(self):
        period = self.add_period("2026-11-01", "2026-11-15")
        with self.assertRaises(HTTPException) as error:
            shift_crud.create_day_shift([], self.db, period.id)
        self.assertEqual(error.exception.status_code, 428)

    def test_real_jwt_authentication_and_reused_id(self):
        app = FastAPI()
        app.include_router(period_router.router)
        app.include_router(shift_router.router)
        app.include_router(user_router.router)
        app.dependency_overrides[get_db] = lambda: self.db
        client = ASGIClient(app)
        key = "isolated-review-test-key-not-a-production-secret"
        with patch.object(auth, "SECRET_KEY", key):
            self.user.hashed_password = auth.hash_password("test-password")
            self.db.commit()
            login = client.request("POST", "/login", body=b"username=staff&password=test-password",
                                   headers={"content-type": "application/x-www-form-urlencoded"})
            self.assertEqual(login.status_code, 200)
            token = login.json()["access_token"]
            headers = {"authorization": f"Bearer {token}"}
            self.assertEqual(client.get("/periods", headers=headers).status_code, 200)
            self.assertEqual(client.get("/requests", headers=headers).status_code, 403)
            expired = jwt.encode({"sub": self.user.id, "auth_id": self.user.auth_id,
                                  "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, key)
            self.assertEqual(client.get("/periods", headers={
                "authorization": f"Bearer {expired}",
            }).status_code, 401)
            legacy = auth.create_access_token({"sub": self.user.id})
            self.assertEqual(client.get("/periods", headers={
                "authorization": f"Bearer {legacy}",
            }).status_code, 401)
            self.assertEqual(client.get("/periods", headers={
                "authorization": "Bearer invalid",
            }).status_code, 401)
            self.db.delete(self.user)
            self.db.commit()
            replacement = User(id="staff", name="再登録", hashed_password="test", role="staff")
            self.db.add(replacement)
            self.db.commit()
            self.assertEqual(client.get("/periods", headers=headers).status_code, 401)

    def test_crossed_duplicates_return_validation_error(self):
        self.db.add(User(id="other", name="別名", hashed_password="test", role="staff"))
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            user_crud.create_user_request(UserRequestCreate(
                id="staff", name="別名", password="test",
            ), self.db)
        self.assertEqual(error.exception.status_code, 400)

    def test_id_validation(self):
        for value in ("", " ", "a/b", "a?b", "a" * 65):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                UserRequestCreate(id=value, name="名前", password="test")
        self.assertEqual(UserRequestCreate(id="valid-ID_1", name="名前", password="test").id, "valid-ID_1")

    def test_pending_unique_constraints_and_processed_requests(self):
        original = UserRequest(user_id="new", name="申請", hashed_password="test")
        self.db.add(original)
        self.db.commit()
        for user_id, name in (("new", "別名"), ("different", "申請")):
            self.db.add(UserRequest(user_id=user_id, name=name, hashed_password="test"))
            with self.assertRaises(IntegrityError):
                self.db.commit()
            self.db.rollback()
        user_crud.reject_user_request(original.id, self.db)
        with self.assertRaises(HTTPException):
            user_crud.approve_user_request(original.id, self.db)
        self.assertIsNone(self.db.get(User, "new"))

    def test_foreign_keys_reject_orphan_and_cascade_user_delete(self):
        self.db.add(Shift(shift_date=date(2026, 11, 1), user_id="missing"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()
        self.db.add(Shift(shift_date=date(2026, 11, 1), user_id=self.user.id))
        self.db.commit()
        user_crud.delete_user(self.user.id, self.db)
        self.assertEqual(self.db.scalars(select(Shift)).all(), [])
