from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftPeriodCreate(BaseModel):
    name: str | None = None
    start: date
    end: date
    business_dates: list[date]
    overwrite_period_ids: list[int] | None = None

class ShiftPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str | None
    start: date
    end: date
    business_dates: list[date]
    shift_version: int
