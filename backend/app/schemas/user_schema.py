from pydantic import BaseModel, ConfigDict

class UserRequestCreate(BaseModel):
    name: str
    password: str

class UserRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str

class UserCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str