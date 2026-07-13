from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftRequestCreate(BaseModel):
    shift_date: date
    remark: str | None = None

class ShiftRequestResponse(BaseModel):
    user_id: int
    user_name: str
    shift_dates: list[ShiftRequestCreate]

class ShiftMember(BaseModel):
    user_id: int
    user_name: str
    remark: str | None = None

class DayShiftData(BaseModel):
    shift_date: date
    members: list[ShiftMember]