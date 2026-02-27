from typing import Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    is_superuser: bool
    is_active: bool
    company_logo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    company_logo_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
