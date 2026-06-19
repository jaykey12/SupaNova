from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.services.auth import hash_password, verify_password, create_jwt, decode_jwt

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# In-memory user store for MVP
_users: dict[str, dict] = {}

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    company_name: str = ""

class SignupResponse(BaseModel):
    user_id: str
    email: str
    token: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user_id: str
    email: str
    token: str

@router.post("/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest):
    for uid, u in _users.items():
        if u["email"] == payload.email:
            raise HTTPException(409, "Email already registered")
    user_id = str(len(_users) + 1)
    _users[user_id] = {
        "id": user_id,
        "email": payload.email,
        "password": hash_password(payload.password),
        "company_name": payload.company_name,
    }
    token = create_jwt(user_id, payload.email)
    return SignupResponse(user_id=user_id, email=payload.email, token=token)

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    for uid, u in _users.items():
        if u["email"] == payload.email and verify_password(payload.password, u["password"]):
            token = create_jwt(uid, payload.email)
            return LoginResponse(user_id=uid, email=payload.email, token=token)
    raise HTTPException(401, "Invalid email or password")