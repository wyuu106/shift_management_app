from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftPeriodCreate(BaseModel):
    name: str | None = None
    start: date
    end: date

class ShiftPeriodCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str | None = None
    start: date
    end: date
    is_active: bool