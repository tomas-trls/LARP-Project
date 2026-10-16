"""
Passwords and login tokens.

- Passwords are never stored. We store a bcrypt "hash": a scrambled version
  that cannot be turned back into the password, but can be checked against one.
- After a correct login we hand out a token (a signed JWT). The front end sends
  it back on every request as:  Authorization: Bearer <token>
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.settings import JWT_SECRET, TOKEN_HOURS


def hash_password(password: str) -> str:
    """Turn a password into a bcrypt hash (safe to store)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """True if this password matches the stored hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(user_id: int) -> str:
    """A signed token that says 'this is user N' and runs out after TOKEN_HOURS."""
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expires}, JWT_SECRET, algorithm="HS256")


# Reads the "Authorization: Bearer ..." header. Using this (instead of reading the
# header by hand) is what makes the green "Authorize" button appear on /docs.
bearer = HTTPBearer(auto_error=False)  # False: we send our own clear 401 message


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    """
    Use as a route dependency: `user: User = Depends(get_current_user)`.
    Reads the Bearer token, checks it, and returns that user, or answers 401.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Please log in first (missing token).")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Your login has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid login token.")

    user = session.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="This account no longer exists.")
    if user.account_status in ("suspended", "banned"):  # the moderator's warning > suspension > ban ladder
        raise HTTPException(status_code=403, detail=f"This account is {user.account_status}. Contact the LARP moderator.")
    return user
