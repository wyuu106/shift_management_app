from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftRequestDate(BaseModel):
    shift_date: date
    remark: str | None = None

class ShiftRequest(BaseModel):
    user_id: int
    user_name: str
    shift_dates: list[ShiftRequestDate]

class ShiftMemberUser(BaseModel):
    user_id: int
    user_name: str

class ShiftMember(BaseModel):
    shift_date: date
    members: list[ShiftMemberUser]