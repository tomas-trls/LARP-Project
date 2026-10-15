"""
Profile routes: build the User Profile from a CV or by hand, then review and edit it.

All paths start with /api/profile. Every route needs a login token.

The flow:
  1. POST /api/profile/cv        upload a CV; get back a DRAFT (nothing is saved yet, the CV is thrown away)
  2. PUT  /api/profile           the student reviews the draft (or types everything) and saves it
  3. PUT  /api/profile/details   bio, hometown, theme and other small settings
  4. GET  /api/profile/personality + PUT  the optional Big Five check
  5. PUT  /api/profile/hobbies   interests outside work (social matching only, never jobs)
"""

import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.match_cache import rebuild_match_cache
from app.models import (
    CVUpload, Education, Experience, PersonalityAnswer, Skill, Tag, User, UserLanguage, UserSkill, UserTag, now,
)
from app.pipeline.cv_parser import MAX_FILE_BYTES, CVError, extract_text, parse_cv
from app.schemas_profile import (
    CVDraftOut, DetailsIn, EducationItem, ExperienceItem, HobbiesIn, LanguageItem, PersonalityIn,
    ProfileFullOut, ProfileSaveIn, SkillOut,
)
from app.seed_career import SEED_DIR
from app.skills import search_skills, skills_for_profile

router = APIRouter(prefix="/api/profile")


# ----------------------------------------------------------------------------
# Reading the whole profile
# ----------------------------------------------------------------------------


def build_full_profile(user: User, session: Session) -> ProfileFullOut:
    """Everything on the student's profile, in one answer."""
    education = session.exec(select(Education).where(Education.user_id == user.id).order_by(Education.id)).all()
    experience = session.exec(select(Experience).where(Experience.user_id == user.id).order_by(Experience.id)).all()
    languages = session.exec(select(UserLanguage).where(UserLanguage.user_id == user.id).order_by(UserLanguage.id)).all()
    skill_rows = session.exec(
        select(Skill, UserSkill.source).join(UserSkill, UserSkill.skill_id == Skill.id).where(UserSkill.user_id == user.id).order_by(Skill.name)
    ).all()
    hobbies = session.exec(
        select(Tag.name).join(UserTag, UserTag.tag_id == Tag.id).where(UserTag.user_id == user.id).order_by(Tag.id)
    ).all()

    return ProfileFullOut(
        id=user.id, name=user.name, ucl_email=user.ucl_email, headline=user.headline, bio=user.bio,
        hometown=user.hometown, relationship_status=user.relationship_status, zodiac=user.zodiac,
        profile_note=user.profile_note, avatar_url=user.avatar_url, linkedin_url=user.linkedin_url,
        is_alumni=user.is_alumni, grad_year=user.grad_year, needs_visa_sponsorship=user.needs_visa_sponsorship,
        hidden_fields=user.hidden_fields or [], theme=user.theme, connection_style=user.connection_style,
        onboarding_step=user.onboarding_step,
        education=[EducationItem(**e.model_dump(include=set(EducationItem.model_fields))) for e in education],
        experience=[ExperienceItem(**e.model_dump(include=set(ExperienceItem.model_fields))) for e in experience],
        skills=[SkillOut(id=s.id, name=s.name, category=s.category, source=source) for s, source in skill_rows],
        languages=[LanguageItem(language=l.language, level=l.level) for l in languages],
        hobbies=list(hobbies),
        big_five=user.big_five or {},
    )


@router.get("", response_model=ProfileFullOut)
def get_profile(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """My whole profile: education, experience, skills, languages, hobbies, personality and settings."""
    return build_full_profile(user, session)


# ----------------------------------------------------------------------------
# 1. Upload a CV -> a draft
# ----------------------------------------------------------------------------


@router.post("/cv", response_model=CVDraftOut)
async def upload_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Read a PDF or DOCX CV and return a draft for the student to review. NOTHING is added to the profile yet.

    The file is read in memory and then dropped: it is never saved, and neither is its text.
    """
    data = await file.read(MAX_FILE_BYTES + 1)  # read one byte too many so we can tell it is too big
    filename = file.filename or "cv"

    try:
        text = extract_text(filename, data)
    except CVError as problem:
        session.add(CVUpload(user_id=user.id, filename=filename[:200], status="failed"))
        session.commit()
        raise HTTPException(status_code=422, detail=str(problem))
    del data  # the file itself is no longer needed

    draft, read_by = parse_cv(text)
    del text  # nor is the text: only the draft survives

    record = CVUpload(user_id=user.id, filename=filename[:200], status="done", parsed_json=draft)
    session.add(record)
    session.commit()
    session.refresh(record)

    # Fill in anything missing so the draft always has the same shape.
    return CVDraftOut(
        cv_id=record.id,
        read_by=read_by,
        education=[EducationItem(**e) for e in _valid_items(draft.get("education"), EducationItem)],
        experience=[ExperienceItem(**e) for e in _valid_items(draft.get("experience"), ExperienceItem)],
        skills=[str(s) for s in draft.get("skills", [])][:60],
        languages=[LanguageItem(**l) for l in _valid_items(draft.get("languages"), LanguageItem)],
        interests=[str(i) for i in draft.get("interests", [])][:30],
    )


def _valid_items(items, model) -> list:
    """Keep only the draft entries that fit the schema, so one odd entry cannot break the whole draft."""
    good = []
    for item in items or []:
        try:
            good.append(model(**item).model_dump())
        except Exception:
            continue
    return good


# ----------------------------------------------------------------------------
# 2. Save the reviewed profile
# ----------------------------------------------------------------------------


@router.put("", response_model=ProfileFullOut)
def save_profile(data: ProfileSaveIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Save the profile the student has reviewed (from a CV draft or typed by hand).

    This REPLACES education, experience, skills and languages with exactly what is sent.
    Skills the student did not list are also spotted in their degrees and roles
    (for example 'Python' in a job description), and marked 'detected'.
    """
    # Throw away the old lists, then write the new ones.
    for table in (Education, Experience, UserLanguage, UserSkill):
        for row in session.exec(select(table).where(table.user_id == user.id)).all():
            session.delete(row)
    session.flush()

    for item in data.education:
        session.add(Education(user_id=user.id, **item.model_dump()))
    for item in data.experience:
        session.add(Experience(user_id=user.id, **item.model_dump()))
    for item in data.languages:
        session.add(UserLanguage(user_id=user.id, **item.model_dump()))

    text_parts = [f"{e.degree} {e.institution} {e.grade or ''}" for e in data.education]
    text_parts += [f"{x.title} {x.organisation} {x.description or ''}" for x in data.experience]
    for skill_id, source in skills_for_profile(session, data.skills, text_parts, data.experience).items():
        session.add(UserSkill(user_id=user.id, skill_id=skill_id, source=source))

    # Keep the older "course" field (used by the existing matching) in step with the newest degree.
    if data.education:
        user.course = data.education[-1].degree[:100]
    if user.onboarding_step < 2:
        user.onboarding_step = 2  # step 2 of 6 in the profile creator is "review"
    session.add(user)

    # The student has approved a profile, so the CV draft is no longer needed.
    for cv in session.exec(select(CVUpload).where(CVUpload.user_id == user.id, CVUpload.approved_at.is_(None))).all():
        if cv.status == "done":
            cv.parsed_json = {}
            cv.approved_at = now()
            session.add(cv)

    session.commit()
    session.refresh(user)
    return build_full_profile(user, session)


# ----------------------------------------------------------------------------
# 3. Details and settings
# ----------------------------------------------------------------------------


@router.put("/details", response_model=ProfileFullOut)
def update_details(changes: DetailsIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Bio, hometown, theme, visa setting, hidden fields and the rest. Only the fields you send are changed."""
    sent = changes.model_dump(exclude_unset=True)
    for field, value in sent.items():
        # null means "leave it", except for the free-text fields where it means "clear it".
        if value is None and field not in ("bio", "hometown", "relationship_status", "zodiac", "profile_note", "avatar_url", "headline"):
            continue
        setattr(user, field, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    if "alcohol_pref" in sent:
        rebuild_match_cache(session)  # alcohol preference changes who suits whom
    return build_full_profile(user, session)


# ----------------------------------------------------------------------------
# 4. Optional Big Five personality check (social matching only)
# ----------------------------------------------------------------------------


def _personality_items() -> dict:
    return json.loads((SEED_DIR / "personality.json").read_text(encoding="utf-8"))


@router.get("/personality")
def personality_questions(user: User = Depends(get_current_user)):
    """The 10 statements to ask, and the student's saved result if they have taken it."""
    data = _personality_items()
    return {
        "prompt": data["prompt"],
        "scale": {"1": "Disagree strongly", "3": "Neither", "5": "Agree strongly"},
        "items": [{"id": i["id"], "text": i["text"]} for i in data["items"]],  # the trait is not sent: no need to show it
        "result": user.big_five or None,
    }


@router.put("/personality")
def save_personality(data: PersonalityIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Save the 10 answers and work out the five trait scores (1 to 5 each)."""
    items = {i["id"]: i for i in _personality_items()["items"]}
    if set(data.answers) != set(items):
        raise HTTPException(status_code=422, detail=f"Please answer all {len(items)} statements: {', '.join(items)}.")

    totals: dict = {}
    for item_id, answer in data.answers.items():
        item = items[item_id]
        score = 6 - answer if item["reverse"] else answer  # a reversed statement is scored the other way round
        totals.setdefault(item["trait"], []).append(score)
    user.big_five = {trait: round(sum(scores) / len(scores), 1) for trait, scores in totals.items()}

    for row in session.exec(select(PersonalityAnswer).where(PersonalityAnswer.user_id == user.id)).all():
        session.delete(row)
    session.flush()
    for item_id, answer in data.answers.items():
        session.add(PersonalityAnswer(user_id=user.id, statement_id=item_id, value=answer))
    session.add(user)
    session.commit()
    return {"result": user.big_five}


# ----------------------------------------------------------------------------
# 5. Hobbies (social only)
# ----------------------------------------------------------------------------


@router.put("/hobbies", response_model=ProfileFullOut)
def save_hobbies(data: HobbiesIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Replace the student's interest tags (up to 8). Used for social matching only, never for jobs."""
    tag_ids = sorted(set(data.tag_ids))
    if tag_ids:
        found = session.exec(select(Tag.id).where(Tag.id.in_(tag_ids))).all()
        missing = set(tag_ids) - set(found)
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown tag id(s): {sorted(missing)}")
    for row in session.exec(select(UserTag).where(UserTag.user_id == user.id)).all():
        session.delete(row)
    session.flush()
    for tag_id in tag_ids:
        session.add(UserTag(user_id=user.id, tag_id=tag_id))
    session.commit()
    rebuild_match_cache(session)  # interests drive the social matches
    return build_full_profile(user, session)


# ----------------------------------------------------------------------------
# Skill search (for the "add a skill" box)
# ----------------------------------------------------------------------------


@router.get("/skills/search", response_model=list[SkillOut])
def skill_search(q: str, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Suggest skills while the student types. Matches names and synonyms (type 'team' to find Teamwork)."""
    return [SkillOut(id=s.id, name=s.name, category=s.category) for s in search_skills(session, q)]
