from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.db import get_db
from app.utils.auth import get_current_user
from app.models import user_model
from app.schemas import user_schema
from app.cruds import user_crud

router = APIRouter()

# ユーザー登録申請作成
@router.post(
    "/register/request",
    response_model = user_schema.UserRequestResponse
)
def create_user_request(
    user: user_schema.UserRequestCreate,
    db: Session = Depends(get_db)
):
    return user_crud.create_user_request(user, db)

# ユーザー登録申請一覧取得
@router.get(
    "/requests",
    response_model=list[user_schema.UserCreateResponse]
)
def get_user_requests(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(status_code=403, detail="権限がありません")
    
    return user_crud.get_user_requests(db)

# ユーザー登録許可
@router.post(
    "/approve/request/{request_id}",
    response_model = user_schema.UserCreateResponse
)
def approve_user_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(status_code=403, detail="権限がありません")
    
    return user_crud.approve_user_request(request_id, db)

# ユーザー登録却下
@router.put(
    "/reject/request/{request_id}",
    response_model = dict
)
def reject_user_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(status_code=403, detail="権限がありません")
    
    return user_crud.reject_user_request(request_id, db)

# ログイン
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return user_crud.login(form_data, db)

# ユーザー一覧取得
@router.get("/users", response_model = list[user_schema.UserCreateResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    return user_crud.get_users(db)

# ユーザー削除
@router.delete("/user/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not current_user.role == "admin":
        raise HTTPException(status_code=403, detail="権限がありません")

    return user_crud.delete_user(user_id, db)