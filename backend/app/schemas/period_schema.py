from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftPeriodCreate(BaseModel):
    name: str | None = None
    start: date
    end: date
    business_dates: list[date]

class ShiftPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    start: date
    end: date
    business_dates: list[date]