"""ユーザー管理APIの権限境界を検証する。本番DBへは接続しない。"""
import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi import FastAPI
from sqlalchemy import select

from app.db import get_db
from app.models.user_model import User, UserRequest
from app.routers import user_router
from app.utils.auth import get_current_user
from test_periods import ASGIClient, DatabaseTestCase


class UserPermissionTests(DatabaseTestCase):
    def setUp(self):
        super().setUp()
        self.admin = User(id="admin", name="管理者", hashed_password="test", role="admin")
        self.other = User(id="other", name="別のスタッフ", hashed_password="test", role="staff")
        self.request_a = UserRequest(user_id="new-a", name="申請者A", hashed_password="test")
        self.request_b = UserRequest(user_id="new-b", name="申請者B", hashed_password="test")
        self.db.add_all([self.admin, self.other, self.request_a, self.request_b])
        self.db.commit()

        self.app = FastAPI()
        self.app.include_router(user_router.router)
        self.app.dependency_overrides[get_db] = lambda: self.db
        self.client = ASGIClient(self.app)

    def admin_only_calls(self):
        return [
            ("GET", "/requests"),
            ("GET", "/users"),
            ("POST", f"/approve/request/{self.request_a.id}"),
            ("PUT", f"/reject/request/{self.request_a.id}"),
            ("DELETE", "/user/other"),
        ]

    def login_as(self, user):
        self.app.dependency_overrides[get_current_user] = lambda: user

    def test_unauthenticated_calls_are_rejected(self):
        for method, path in self.admin_only_calls():
            with self.subTest(method=method, path=path):
                self.assertEqual(self.client.request(method, path).status_code, 401)

    def test_staff_cannot_call_admin_apis_or_change_data(self):
        self.login_as(self.user)

        for method, path in self.admin_only_calls():
            with self.subTest(method=method, path=path):
                response = self.client.request(method, path)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()["detail"], "権限がありません")

        # 拒否されたうえで、申請とユーザーが変わっていないこと
        self.db.expire_all()
        self.assertEqual(self.db.get(UserRequest, self.request_a.id).status, "pending")
        self.assertIsNotNone(self.db.get(User, "other"))
        self.assertIsNone(self.db.get(User, "new-a"))

    def test_admin_can_call_admin_apis(self):
        # 403が権限によるもので、パスの誤りなどではないことを確かめる
        self.login_as(self.admin)

        self.assertEqual(self.client.get("/requests").status_code, 200)
        self.assertEqual(self.client.get("/users").status_code, 200)

        approve = self.client.request("POST", f"/approve/request/{self.request_a.id}")
        self.assertEqual(approve.status_code, 200)
        self.assertEqual(approve.json()["id"], "new-a")

        reject = self.client.request("PUT", f"/reject/request/{self.request_b.id}")
        self.assertEqual(reject.status_code, 200)

        delete = self.client.request("DELETE", "/user/other")
        self.assertEqual(delete.status_code, 204)

        self.db.expire_all()
        self.assertIsNotNone(self.db.get(User, "new-a"))
        self.assertIsNone(self.db.get(User, "other"))
        self.assertEqual(
            self.db.scalar(select(UserRequest.status).where(UserRequest.id == self.request_b.id)),
            "rejected",
        )


if __name__ == "__main__":
    unittest.main()
