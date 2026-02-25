import uuid
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.domain import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SUPERUSER_EMAIL = "ai4bharat@smartsensesolutions.com"
SUPERUSER_PASSWORD = "0504@A!bhar@t"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def seed_superuser(db: Session) -> None:
    """Create the superuser if it does not already exist."""
    if get_user_by_email(db, SUPERUSER_EMAIL):
        return
    superuser = User(
        id=str(uuid.uuid4()),
        email=SUPERUSER_EMAIL,
        hashed_password=get_password_hash(SUPERUSER_PASSWORD),
        is_superuser=True,
        is_active=True,
    )
    db.add(superuser)
    db.commit()
