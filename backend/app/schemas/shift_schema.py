from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftRequestCreate(BaseModel):
    shift_date: date
    remark: str | None = None

class ShiftRequestResponse(BaseModel):
    user_id: int
    user_name: str
    shift_dates: list[ShiftRequestCreate]

class ShiftMemberCreate(BaseModel):
    user_id: int
    remark: str | None = None

class DayShiftCreate(BaseModel):
    shift_date: date
    members: list[ShiftMemberCreate]

class ShiftMemberResponse(BaseModel):
    user_id: int
    user_name: str
    remark: str | None = None

class DayShiftResponse(BaseModel):
    shift_date: date
    members: list[ShiftMemberResponse]