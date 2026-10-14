"""
Loads the invented students from seed/profiles.json into the database.

All of them (including the two demo accounts) get the same password, which is
obviously fake, so you can log in as anyone while testing. It is hashed with
bcrypt like any real password.

Safe to run twice: emails that already exist are skipped.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from app.auth import hash_password
from app.models import Tag, User, UserNeed, UserTag

PROFILES_FILE = Path(__file__).resolve().parent / "seed" / "profiles.json"

# The shared password for every seed account (fake users only, never real students).
SEED_PASSWORD = "demo1234"


def load_profiles(session: Session) -> int:
    """Add any missing seed students. Returns how many were added."""
    profiles = json.loads(PROFILES_FILE.read_text(encoding="utf-8"))
    tag_ids = {name: id for name, id in session.exec(select(Tag.name, Tag.id)).all()}
    existing = set(session.exec(select(User.ucl_email)).all())

    # Hashing is slow on purpose, so do it once and reuse it (same password for everyone).
    password_hash = hash_password(SEED_PASSWORD)

    added = 0
    for p in profiles:
        if p["ucl_email"] in existing:
            continue

        user = User(
            name=p["name"],
            ucl_email=p["ucl_email"],
            password_hash=password_hash,
            linkedin_url=p["linkedin_url"],
            campus=p["campus"],
            travel_ok=p["travel_ok"],
            alcohol_pref=p["alcohol_pref"],
            goal=p["goal"],
            course=p["course"],
            year=p["year"],
            experience_industry=p["experience_industry"],
            experience_note=p["experience_note"],
            availability=p["availability"],
            linkedin_max_optin=p["linkedin_max_optin"],
            auto_pair_opt_in=True,  # seed students count as "chose auto-pair", so the demo has a pool
        )
        session.add(user)
        session.flush()  # gives the user an id so we can link tags and needs to it

        for tag_name in p["tags"]:
            # A typo in profiles.json raises a KeyError here, so it can't go unnoticed.
            session.add(UserTag(user_id=user.id, tag_id=tag_ids[tag_name]))
        for skill in p["looking_for"]:
            session.add(UserNeed(user_id=user.id, kind="looking_for", skill=skill))
        for skill in p["offers"]:
            session.add(UserNeed(user_id=user.id, kind="offers", skill=skill))
        added += 1

    session.commit()
    return added
