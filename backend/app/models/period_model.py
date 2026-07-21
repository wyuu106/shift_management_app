from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Date, Boolean, ForeignKey
from datetime import date
from app.db import Base

class ShiftPeriod(Base):
    __tablename__ = "shift_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    start: Mapped[date] = mapped_column(Date)
    end: Mapped[date] = mapped_column(Date)
    is_published: Mapped[bool] = mapped_column(Boolean)

    business_dates = relationship(
        "BusinessDate",
        back_populates="period",
        cascade="all, delete-orphan",
    )

class BusinessDate(Base):
    __tablename__ = "business_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_date: Mapped[date] = mapped_column(Date)
    period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shift_periods.id")
    )

    period = relationship(
        "ShiftPeriod",
        back_populates="business_dates",
    )