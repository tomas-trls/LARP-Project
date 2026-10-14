"""
Account routes: register, log in, see my profile, change my preferences.

main.py attaches this "router" to the app, so these paths all start with /api.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import create_token, get_current_user, hash_password, verify_password
from app.database import get_session
from app.match_cache import add_user_to_cache, rebuild_match_cache
from app.models import Tag, User, UserNeed, UserTag
from app.schemas import LoginIn, PreferencesIn, ProfileOut, RegisterIn, RegisterOut, TokenOut

router = APIRouter(prefix="/api")


def build_profile(user: User, session: Session) -> ProfileOut:
    """Turn a User row (plus its tags and needs) into the profile we send back."""
    tag_names = session.exec(
        select(Tag.name).join(UserTag, UserTag.tag_id == Tag.id).where(UserTag.user_id == user.id).order_by(Tag.id)
    ).all()
    needs = session.exec(select(UserNeed).where(UserNeed.user_id == user.id).order_by(UserNeed.id)).all()

    return ProfileOut(
        id=user.id,
        name=user.name,
        ucl_email=user.ucl_email,
        campus=user.campus,
        travel_ok=user.travel_ok,
        alcohol_pref=user.alcohol_pref,
        goal=user.goal,
        course=user.course,
        year=user.year,
        experience_industry=user.experience_industry,
        experience_note=user.experience_note,
        availability=user.availability,
        linkedin_url=user.linkedin_url,
        linkedin_max_optin=user.linkedin_max_optin,
        tags=list(tag_names),
        looking_for=[n.skill for n in needs if n.kind == "looking_for"],
        offers=[n.skill for n in needs if n.kind == "offers"],
    )


@router.post("/register", response_model=RegisterOut)
def register(data: RegisterIn, session: Session = Depends(get_session)):
    """Create an account and save the questionnaire answers. Returns the profile and a login token."""
    # One account per email.
    if session.exec(select(User).where(User.ucl_email == data.ucl_email)).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists. Try logging in.")

    # Every chosen tag id must be a real tag (duplicates are ignored).
    tag_ids = sorted(set(data.tag_ids))
    if tag_ids:
        found = session.exec(select(Tag.id).where(Tag.id.in_(tag_ids))).all()
        missing = set(tag_ids) - set(found)
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown tag id(s): {sorted(missing)}")

    user = User(
        name=data.name.strip(),
        ucl_email=data.ucl_email,
        password_hash=hash_password(data.password),  # the plain password is never saved
        linkedin_url=data.linkedin_url,
        campus=data.campus,
        travel_ok=data.travel_ok,
        alcohol_pref=data.alcohol_pref,
        goal=data.goal,
        course=data.course,
        year=data.year,
        experience_industry=data.experience_industry,
        experience_note=data.experience_note,
        availability=data.availability,
        linkedin_max_optin=data.linkedin_max_optin,
    )
    session.add(user)
    try:
        session.flush()  # gives the user an id without finishing the save yet
    except IntegrityError:  # two sign-ups with the same email at the same moment
        session.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists. Try logging in.")

    for tag_id in tag_ids:
        session.add(UserTag(user_id=user.id, tag_id=tag_id))
    for skill in data.looking_for:
        session.add(UserNeed(user_id=user.id, kind="looking_for", skill=skill))
    for skill in data.offers:
        session.add(UserNeed(user_id=user.id, kind="offers", skill=skill))
    session.commit()
    session.refresh(user)

    # Work out the newcomer's top-20 matches now, so their list is ready straight away.
    add_user_to_cache(session, user.id)

    return RegisterOut(user=build_profile(user, session), token=create_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, session: Session = Depends(get_session)):
    """Check email and password; return a login token."""
    user = session.exec(select(User).where(User.ucl_email == data.ucl_email)).first()
    # Same message whether the email or the password is wrong, so nobody can probe which emails exist.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    return TokenOut(token=create_token(user.id))


@router.get("/me", response_model=ProfileOut)
def get_me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """My own profile and questionnaire answers."""
    return build_profile(user, session)


@router.put("/me/preferences", response_model=ProfileOut)
def update_preferences(
    changes: PreferencesIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Change campus, alcohol preference, goal or LinkedIn opt-in. Only the fields you send are changed."""
    for field, value in changes.model_dump(exclude_unset=True).items():
        # Skip nulls, except linkedin_url where null means "remove it".
        if value is None and field != "linkedin_url":
            continue
        setattr(user, field, value)

    # You can only opt in to being listed if there is a link to list.
    if user.linkedin_max_optin and not user.linkedin_url:
        raise HTTPException(status_code=400, detail="Add your LinkedIn link before opting in to LinkedIn Max.")

    session.add(user)
    session.commit()
    session.refresh(user)

    # Campus, alcohol and goal all change scores, so the saved match lists are out of date.
    rebuild_match_cache(session)
    return build_profile(user, session)
