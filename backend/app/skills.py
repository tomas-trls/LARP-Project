"""
Turns words into skills.

Everything in LARP that talks about skills (a CV, a role, a job advert, a society role)
points at the same rows in the `skill` table. This file is how loose human words get
there. "cooperative" and "worked in a team" both become the Teamwork skill.

There are three ways to match, from strictest to loosest:
  1. exact:  the words are a known name or synonym ("python", "team player")
  2. scan:   look through a long text for any known name or synonym
  3. fuzzy:  a near miss for a short typed skill ("pyhton" is probably Python)
"""

import difflib
import re
from typing import Iterable, List, Optional, Set

from sqlmodel import Session, select

from app.models import Skill, SkillSynonym

FUZZY_CUTOFF = 0.8  # 1.0 would be identical. Lower means more guesses, and more wrong ones. 0.8 allows one swapped pair ("pyhton").


def synonym_table(session: Session) -> dict:
    """Every known term (lower case) mapped to its skill id."""
    return {row.term: row.skill_id for row in session.exec(select(SkillSynonym)).all()}


def match_skill_name(session: Session, name: str) -> Optional[int]:
    """The skill id for one typed skill, or None if nothing close exists."""
    term = " ".join(name.lower().split())
    if not term:
        return None
    table = synonym_table(session)
    if term in table:
        return table[term]
    close = difflib.get_close_matches(term, table.keys(), n=1, cutoff=FUZZY_CUTOFF)
    return table[close[0]] if close else None


def find_skills_in_text(session: Session, text: str) -> Set[int]:
    """Every skill id whose name or a synonym appears in a piece of text."""
    table = synonym_table(session)
    if not table or not text:
        return set()
    # One big pattern of all the terms, longest first so "machine learning" wins over "learning".
    # The lookarounds make sure we match whole words only ("sql" must not match inside "mysqlx").
    terms = sorted(table, key=len, reverse=True)
    pattern = re.compile(r"(?<![a-z0-9])(" + "|".join(re.escape(t) for t in terms) + r")(?![a-z0-9])")
    return {table[m.group(1)] for m in pattern.finditer(text.lower())}


def get_or_create_custom_skill(session: Session, name: str) -> int:
    """A skill the student typed that LARP has never heard of. It is added to the 'skills' category
    so it still shows on their profile (no role asks for it yet, so it does not change any score)."""
    name = " ".join(name.split())[:60]
    existing = session.exec(select(Skill).where(Skill.name == name)).first()
    if existing:
        return existing.id
    skill = Skill(name=name, category="skills")
    session.add(skill)
    session.flush()
    session.add(SkillSynonym(term=name.lower(), skill_id=skill.id))
    return skill.id


# Words in a job or internship that show which industry it was in. The first item is the experience skill
# it earns (these are the 'experience' skills in skills.json).
INDUSTRY_WORDS = {
    "Tech internship": r"\b(software|data|product|engineer\w*|developer|analytics|tech\w*|machine learning|app|cloud|ai|digital)\b",
    "Finance internship": r"\b(bank\w*|financ\w*|invest\w*|audit\w*|trading|equity|fund|asset management|accounting|insurance)\b",
    "Consulting experience": r"\b(consult\w*|advisory|strategy)\b",
    "Marketing or media experience": r"\b(marketing|media|journalis\w*|pr|brand\w*|content|social media|communications|publishing)\b",
    "Public sector experience": r"\b(government|civil service|policy|charity|ngo|parliament\w*|council|public sector)\b",
    "Healthcare or science experience": r"\b(nhs|clinical|lab|hospital|pharma\w*|biomedical|health\w*|laborator\w*)\b",
    "Operations experience": r"\b(operations|supply chain|logistics|procurement|warehouse)\b",
    "Design experience": r"\b(design\w*|ux|ui|creative)\b",
    "Energy or environment experience": r"\b(energy|climate|sustainab\w*|renewable|environment\w*)\b",
}


def infer_experience_skills(session: Session, experiences: Iterable) -> Set[int]:
    """Experience skills worked out from the kind and wording of each job, internship or project.

    'Product Intern at Deliveroo' earns 'Tech internship'; a 'Treasurer' role earns 'Society committee role';
    anything marked as a project earns 'Project portfolio'. Each item needs .kind, .title, .organisation, .description.
    """
    by_name = {s.name: s.id for s in session.exec(select(Skill).where(Skill.category == "experience")).all()}
    earned: Set[str] = set()
    for item in experiences:
        text = f"{item.title} {item.organisation} {item.description or ''}".lower()
        if item.kind in ("job", "internship", "project"):
            for skill_name, words in INDUSTRY_WORDS.items():
                if re.search(words, text):
                    earned.add(skill_name)
        if item.kind == "project":
            earned.add("Project portfolio")
        if item.kind == "job" and re.search(r"retail|hospitality|bar |waiter|waitress|cafe|shop|barista|tutor", text):
            earned.add("Part-time or customer work")
        if re.search(r"volunteer", text):
            earned.add("Volunteering")
        if re.search(r"research assistant|dissertation|thesis|research project", text):
            earned.add("Research experience")
    ids = {by_name[n] for n in earned if n in by_name}
    if any(item.kind == "society" for item in experiences):  # running or joining a society committee is leadership
        committee = session.exec(select(Skill).where(Skill.name == "Society committee role")).first()
        if committee:
            ids.add(committee.id)
    return ids


def skills_for_profile(session: Session, typed_names: Iterable[str], text_parts: Iterable[str], experiences: Iterable = ()) -> dict:
    """Work out all the skill ids for a profile.

    typed_names: skills the student listed themselves (matched loosely, or added as custom skills).
    text_parts:  degrees, job titles and descriptions, scanned for skills the student did not list.
    experiences: the job/internship/society/project entries, used to work out experience and leadership skills.
    Returns {skill_id: "manual" or "detected"}.
    """
    found: dict = {}
    for text_skill in find_skills_in_text(session, "\n".join(text_parts)):
        found[text_skill] = "detected"
    for skill_id in infer_experience_skills(session, list(experiences)):
        found[skill_id] = "detected"
    for name in typed_names:
        skill_id = match_skill_name(session, name) or get_or_create_custom_skill(session, name)
        found[skill_id] = "manual"  # something they typed counts as manual even if we also spotted it
    return found


def search_skills(session: Session, query: str, limit: int = 10) -> List[Skill]:
    """Skills whose name or a synonym contains the query (for the 'add a skill' box)."""
    q = query.strip().lower()
    if not q:
        return []
    ids = [skill_id for term, skill_id in synonym_table(session).items() if q in term]
    if not ids:
        return []
    skills = session.exec(select(Skill).where(Skill.id.in_(set(ids))).order_by(Skill.name)).all()
    # Names that start with the query come first.
    skills.sort(key=lambda s: (not s.name.lower().startswith(q), s.name))
    return skills[:limit]
