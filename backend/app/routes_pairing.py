"""
Routes for finding people: my ranked matches, and my auto-paired group.

All three need a login token.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.groups import group_details, group_for_user, pair_user
from app.match_cache import CACHE_SIZE, get_matches
from app.models import User
from app.schemas import GroupOut, MatchOut, PairOut

router = APIRouter(prefix="/api")


@router.get("/matches", response_model=list[MatchOut])
def my_matches(
    limit: int = Query(CACHE_SIZE, ge=1, le=CACHE_SIZE),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """The people who suit me best, best first, each with a reason."""
    return get_matches(session, user.id, limit)


@router.post("/pair/auto", response_model=PairOut)
def pair_me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Join or form a group. Safe to call again: if I already have a group, I get the same one."""
    group = pair_user(session, user)
    if group is None:
        return PairOut(
            status="waiting",
            message="Not enough suitable people yet. You are in the queue and will be added when others join.",
        )
    return PairOut(status="grouped", group=group_details(session, group))


@router.get("/group", response_model=GroupOut)
def my_group(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """My group, its members and what they share."""
    group = group_for_user(session, user.id)
    if group is None:
        raise HTTPException(status_code=404, detail="You are not in a group yet.")
    return group_details(session, group)
