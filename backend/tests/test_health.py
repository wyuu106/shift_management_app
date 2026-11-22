"""本番DBへ接続せず、/healthとAPIドキュメントの公開設定を検証する。"""
import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from test_periods import ASGIClient
from app.db import get_db
from app.main import create_app

DOC_PATHS = ["/docs", "/redoc", "/openapi.json"]


class BrokenSession:
    """DBへ接続できない状態を再現する。"""
    def execute(self, *args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


class HealthTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        self.db = Session(self.engine)
        self.app = create_app(enable_docs=False)
        self.app.dependency_overrides[get_db] = lambda: self.db
        self.client = ASGIClient(self.app)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_health_returns_ok_without_token(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_returns_503_when_db_is_down(self):
        self.app.dependency_overrides[get_db] = lambda: BrokenSession()

        response = self.client.get("/health")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "データベースに接続できません")


class ApiDocsTest(unittest.TestCase):
    def test_docs_are_hidden_by_default(self):
        client = ASGIClient(create_app(enable_docs=False))

        for path in DOC_PATHS:
            self.assertEqual(client.get(path).status_code, 404, path)

    def test_docs_are_shown_when_enabled(self):
        client = ASGIClient(create_app(enable_docs=True))

        for path in DOC_PATHS:
            self.assertEqual(client.get(path).status_code, 200, path)


if __name__ == "__main__":
    unittest.main()
