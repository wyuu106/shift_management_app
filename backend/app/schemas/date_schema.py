from pydantic import BaseModel, ConfigDict
from datetime import date

class BusinessDateCreate(BaseModel):
    business_dates: list[date]

class BusinessDateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    business_dates: list[date]
    is_active: bool