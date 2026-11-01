from pydantic import BaseModel, ConfigDict, Field

class UserRequestCreate(BaseModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    name: str
    password: str

class UserRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str

class UserCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
