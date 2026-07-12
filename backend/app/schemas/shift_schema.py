from pydantic import BaseModel, ConfigDict
from datetime import date

class ShiftRequestCreate(BaseModel):
    shift_date: date
    remark: str | None = None

class ShiftRequestResponse(BaseModel):
    shifts: list[ShiftRequestCreate]
    user_name: str

class ShiftCreate(BaseModel):
    shift_date: date
    remark: str | None = None
    user_id: int

class ShiftCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shift_date: date
    remark: str | None = None
    user_name: str

class ShiftMember(BaseModel):
    shift_date: date
    members: list[str]