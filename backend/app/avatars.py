"""
Fake profile pictures: a cartoon face drawn for each person, so the app never needs real photos.

The face is built from the person's id, so the same person always gets the same face and
different people look different (skin, hair, eyes, mouth, glasses, shirt and background all vary).
It is a small SVG image, made on the fly, with no internet and no files to store.

  face_svg(7)          -> the SVG text for user 7
  GET /api/avatars/7.svg  -> the same, as an image the front end can show (see routes_avatars.py)
  give_everyone_a_face -> sets every user's avatar_url to that address (run at start-up)
"""

import random

from sqlmodel import Session, select

from app.models import User

# Colours to pick from. Light-to-deep skin tones, natural and dyed hair, shirts and soft backgrounds.
SKIN = ["#F5D5BF", "#EEC3A0", "#DDA57A", "#C68A5E", "#9C6640", "#6F4630"]
HAIR = ["#1E1A18", "#3A2A20", "#6B4426", "#A8743A", "#D9B26A", "#8E3B2A", "#7A7A82", "#4B2E83"]
SHIRT = ["#BA82FF", "#56338A", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#64748B"]
BACKGROUND = ["#EFE3FF", "#E0ECFF", "#DDF5EA", "#FFF0D6", "#FFE0E0", "#F3E1F5", "#E4E9F0"]


def avatar_address(user_id: int) -> str:
    """Where a person's face lives (relative to the site, so it works behind the Vite proxy)."""
    return f"/api/avatars/{user_id}.svg"


def _hair_behind(style: str, colour: str) -> str:
    """Hair drawn BEHIND the head (long hair and buns show around the face)."""
    if style == "long":
        return f'<path d="M52 92 C52 40 148 40 148 92 L152 160 L48 160 Z" fill="{colour}"/>'
    if style == "bun":
        return f'<circle cx="100" cy="34" r="17" fill="{colour}"/>'
    if style == "curly":
        puffs = "".join(f'<circle cx="{x}" cy="{y}" r="17" fill="{colour}"/>' for x, y in [(62, 66), (82, 50), (106, 48), (128, 54), (140, 74)])
        return puffs
    return ""


def _hair_front(style: str, colour: str) -> str:
    """Hair drawn ON TOP of the head (the fringe or the short crop)."""
    if style == "bald":
        return ""
    if style == "side":
        return f'<path d="M60 84 C60 44 140 40 142 78 C120 70 96 64 78 56 C70 66 64 74 60 84 Z" fill="{colour}"/>'
    # short, long, bun and curly all get a simple fringe across the forehead
    return f'<path d="M60 82 C58 46 142 46 140 82 C124 66 80 66 60 82 Z" fill="{colour}"/>'


def _mouth(kind: int) -> str:
    """Three kinds of friendly mouth."""
    if kind == 0:  # big smile
        return '<path d="M84 118 Q100 134 116 118" stroke="#7A2E2E" stroke-width="4" fill="none" stroke-linecap="round"/>'
    if kind == 1:  # open smile
        return '<path d="M85 116 Q100 138 115 116 Z" fill="#7A2E2E"/><path d="M90 119 Q100 124 110 119 L108 117 L92 117 Z" fill="#fff"/>'
    return '<path d="M88 120 Q100 128 112 120" stroke="#7A2E2E" stroke-width="4" fill="none" stroke-linecap="round"/>'  # small smile


def face_svg(user_id: int) -> str:
    """The cartoon face for one person, as SVG text."""
    pick = random.Random(f"larp-face-{user_id}")  # the same id always draws the same face
    skin, hair, shirt, background = pick.choice(SKIN), pick.choice(HAIR), pick.choice(SHIRT), pick.choice(BACKGROUND)
    style = pick.choice(["short", "side", "long", "bun", "curly", "short", "side", "bald"])
    glasses = pick.random() < 0.3
    eye_gap = pick.choice([22, 24, 26])
    mouth = pick.randrange(3)
    brows = pick.choice([-1, 0, 1])  # a little raised, flat or lowered, for personality

    eyes = "".join(
        f'<ellipse cx="{100 + side * eye_gap}" cy="98" rx="5" ry="6" fill="#2B2B33"/>'
        f'<circle cx="{101.5 + side * eye_gap}" cy="96" r="1.8" fill="#fff"/>'
        f'<path d="M{100 + side * eye_gap - 9} {86 + brows} Q{100 + side * eye_gap} {82 + brows} {100 + side * eye_gap + 9} {86 + brows}" '
        f'stroke="{hair if style != "bald" else "#3A2A20"}" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        for side in (-1, 1)
    )
    specs = ""
    if glasses:
        specs = (
            f'<circle cx="{100 - eye_gap}" cy="98" r="12" fill="none" stroke="#2B2B33" stroke-width="3"/>'
            f'<circle cx="{100 + eye_gap}" cy="98" r="12" fill="none" stroke="#2B2B33" stroke-width="3"/>'
            f'<path d="M{100 - eye_gap + 12} 98 L{100 + eye_gap - 12} 98" stroke="#2B2B33" stroke-width="3"/>'
        )

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'
        f'<rect width="200" height="200" fill="{background}"/>'
        f'{_hair_behind(style, hair)}'
        f'<path d="M30 200 C30 160 62 148 100 148 C138 148 170 160 170 200 Z" fill="{shirt}"/>'  # shoulders
        f'<rect x="88" y="124" width="24" height="30" rx="10" fill="{skin}"/>'  # neck
        f'<ellipse cx="100" cy="98" rx="42" ry="48" fill="{skin}"/>'  # head
        f'<ellipse cx="58" cy="102" rx="6" ry="10" fill="{skin}"/><ellipse cx="142" cy="102" rx="6" ry="10" fill="{skin}"/>'  # ears
        f'{_hair_front(style, hair)}'
        f'{eyes}{specs}'
        '<path d="M100 102 Q96 112 102 114" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none" stroke-linecap="round"/>'  # nose
        f'{_mouth(mouth)}'
        '<ellipse cx="74" cy="114" rx="7" ry="4" fill="#FF8FA3" opacity=".25"/><ellipse cx="126" cy="114" rx="7" ry="4" fill="#FF8FA3" opacity=".25"/>'  # cheeks
        '</svg>'
    )


def give_everyone_a_face(session: Session) -> int:
    """Set avatar_url for every user who does not have a picture yet. Returns how many were set.
    A picture someone chose themselves is never replaced."""
    changed = 0
    for user in session.exec(select(User).where(User.avatar_url.is_(None))).all():
        user.avatar_url = avatar_address(user.id)
        session.add(user)
        changed += 1
    session.commit()
    return changed
