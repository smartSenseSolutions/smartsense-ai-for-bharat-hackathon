from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserUpdateRequest
from app.services.auth import authenticate_user, create_access_token, get_current_user, update_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer()


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
):
    return get_current_user(credentials.credentials, db)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdateRequest,
    user=Depends(_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile (e.g. company_logo_url)."""
    updated = update_user(db, user, **body.model_dump(exclude_none=True))
    return UserResponse.model_validate(updated)
