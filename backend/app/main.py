import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from app.utils.auth import hash_password
from app.db import get_db, Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

# .envを読み込む
load_dotenv()

origins = os.getenv("ALLOW_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)