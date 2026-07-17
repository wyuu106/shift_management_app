from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import Response, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.utils.auth import hash_password, verify_password, create_access_token
from app.models import user_model
from app.schemas import user_schema

# ユーザー登録申請作成
def create_user_request(
        user: user_schema.UserRequestCreate,
        db: Session
) -> user_schema.UserRequestResponse:
    exist_user = db.execute(select(user_model.User).where(
        user_model.User.name == user.name
    )).scalar_one_or_none()

    if exist_user:
        raise HTTPException(status_code=400, detail="このユーザー名は既に使われています")
    
    exist_request = db.execute(select(user_model.UserRequest).where(
        user_model.UserRequest.name == user.name,
        user_model.UserRequest.status == "pending"
    )).scalar_one_or_none()

    if exist_request:
        raise HTTPException(status_code=400, detail="このユーザー名は申請中です")
    
    if not (user.name.strip() and user.password.strip()):
        raise HTTPException(status_code=400, detail="名前かパスワードが不正です")

    db_request = user_model.UserRequest(
        name = user.name,
        hashed_password = hash_password(user.password)
    )

    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    return db_request

# ユーザー登録申請一覧取得
def get_user_requests(db: Session) -> list[user_schema.UserRequestResponse]:
    return db.execute(select(user_model.UserRequest).where(
        user_model.UserRequest.status == "pending"
    )).scalars().all()

# ユーザー登録許可
def approve_user_request(
        request_id: int,
        db: Session
) -> user_schema.UserCreateResponse:
    stmt = select(user_model.UserRequest).where(
        user_model.UserRequest.id == request_id
    )
    db_request = db.execute(stmt).scalar_one_or_none()

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="該当する申請が見つかりませんでした"
        )
    
    if db_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="既に処理済みの申請です"
        )

    exist_user = db.execute(select(user_model.User).where(
        user_model.User.name == db_request.name
    )).scalar_one_or_none()

    if exist_user:
        raise HTTPException(
            status_code=400,
            detail="このユーザー名は既に使われています"
        )

    new_user = user_model.User(
        name=db_request.name,
        hashed_password=db_request.hashed_password
    )

    db.add(new_user)
    db_request.status = "approved"
    db.commit()
    db.refresh(new_user)

    return new_user

# ユーザー登録却下
def reject_user_request(
        request_id: int,
        db: Session
) -> dict:
    stmt = select(user_model.UserRequest).where(
        user_model.UserRequest.id == request_id
    )
    db_request = db.execute(stmt).scalar_one_or_none()

    if not db_request:
        raise HTTPException(
            status_code=404,
            detail="該当する申請が見つかりませんでした"
        )
    
    if db_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="既に処理済みの申請です"
        )

    db_request.status = "rejected"
    db.commit()

    return {"message": "申請を却下しました"}

# ログイン
def login(
        form_data: OAuth2PasswordRequestForm,
        db: Session
) -> dict[str, str, str]:
    stmt = select(user_model.User).where(
        user_model.User.name == form_data.username
    )
    db_user = db.execute(stmt).scalar_one_or_none()

    if db_user is None or not verify_password(
        form_data.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="IDまたはパスワードが違います"
        )

    access_token = create_access_token(
        data={"sub": str(db_user.id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role
    }

# ユーザー一覧取得
def get_users(db: Session) -> list[user_schema.UserCreateResponse]:
    return db.execute(select(user_model.User)).scalars().all()

# ユーザー削除
def delete_user(user_id: int, db: Session):
    stmt = select(user_model.User).where(
        user_model.User.id == user_id
    )
    db_user = db.execute(stmt).scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="該当するユーザーが見つかりませんでした"
        )
    
    if db_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="管理者ユーザーは削除できません"
        )

    db.delete(db_user)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)