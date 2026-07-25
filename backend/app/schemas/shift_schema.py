from pydantic import BaseModel, ConfigDict
from datetime import date

# シフト希望作成
class ShiftRequestCreate(BaseModel):
    shift_date: date
    remark: str | None = None

# シフト希望レスポンス
class ShiftRequestResponse(BaseModel):
    user_id: int
    user_name: str
    shift_dates: list[ShiftRequestCreate]

# シフト作成時のシフトメンバー情報
class ShiftMemberCreate(BaseModel):
    user_id: int
    remark: str | None = None

# シフト作成時の日付ごとのシフト情報
class DayShiftCreate(BaseModel):
    shift_date: date
    members: list[ShiftMemberCreate]

# シフトレスポンスのシフトメンバー情報
class ShiftMemberResponse(BaseModel):
    user_id: int
    user_name: str
    remark: str | None = None

# シフトレスポンスの日付ごとのシフト情報
class DayShiftResponse(BaseModel):
    shift_date: date
    members: list[ShiftMemberResponse]

# シフト情報
class ShiftDate(BaseModel):
    shift_date: date
    remark: str | None = None

# ユーザーごとのシフト情報
class UserShiftResponse(BaseModel):
    user_id: int
    user_name: str
    shift_dates: list[ShiftDate]