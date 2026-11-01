from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Index, text
from uuid import uuid4
from app.db import Base

class UserRequest(Base):
    __tablename__ = "user_requests"
    __table_args__ = (
        Index("uq_pending_request_user_id", "user_id", unique=True,
              postgresql_where=text("status = 'pending'"), sqlite_where=text("status = 'pending'")),
        Index("uq_pending_request_name", "name", unique=True,
              postgresql_where=text("status = 'pending'"), sqlite_where=text("status = 'pending'")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="staff")
    auth_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, default=lambda: str(uuid4())
    )
