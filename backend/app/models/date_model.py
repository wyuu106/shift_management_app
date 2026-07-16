from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Date, Boolean
from datetime import date
from app.db import Base

class BusinessDate(Base):
    __tablename__ = "business_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_date: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)