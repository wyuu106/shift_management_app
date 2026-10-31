from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Date, ForeignKey
from datetime import date
from app.db import Base


class ShiftRequestVersion(Base):
    __tablename__ = "shift_request_versions"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    period_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("shift_periods.id", ondelete="CASCADE"), primary_key=True
    )
    version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

class ShiftRequest(Base):
    __tablename__ = "shift_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shift_date: Mapped[date] = mapped_column(Date)
    remark: Mapped[str] = mapped_column(String, nullable=True)
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        )
    )

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shift_date: Mapped[date] = mapped_column(Date)
    remark: Mapped[str] = mapped_column(String, nullable=True)
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        )
    )
