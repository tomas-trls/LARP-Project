"""
Admin routes (development only). They need the ADMIN_KEY from .env, sent in an X-Admin-Key header.
"""

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session

from app import settings
from app.database import get_session
from app.pipeline.claude_tagger import ClaudeTagger
from app.pipeline.runner import build_sources, refresh_events

router = APIRouter(prefix="/api/admin")


def require_admin_key(x_admin_key: str = Header(default="")):
    """Route guard: the right key, or 403. compare_digest avoids leaking the key through timing."""
    if not secrets.compare_digest(x_admin_key.encode(), settings.ADMIN_KEY.encode()):
        raise HTTPException(status_code=403, detail="Missing or wrong admin key.")


@router.post("/refresh-events", dependencies=[Depends(require_admin_key)])
def refresh(session: Session = Depends(get_session)):
    """
    Run the event pipeline and return what it did.
    With DEMO_MODE=true (the default) only the hand-checked curated file is loaded: no internet, no Claude.
    """
    live = not settings.DEMO_MODE
    tagger = ClaudeTagger() if live else None
    return {"live": live, **refresh_events(session, build_sources(live=live), tagger=tagger)}
