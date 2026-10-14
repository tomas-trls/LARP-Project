"""
Keyword classification: free, fast and predictable.

For each event we work out:
  - event_type    career or social
  - alcohol_role  central, optional or none
  - tags          up to 3 of our 37 interest tags

When the keywords can't decide (no tag found, or a tie for the last place), the
event is marked "needs_claude" and the Claude tagger gets a go (claude_tagger.py).
"""

import re
from typing import List, Tuple

# ---- career or social ------------------------------------------------------

CAREER_WORDS = [
    "career", "careers", "internship", "graduate scheme", "graduate programme", "employer", "cv", "recruiter",
    "recruitment", "networking", "panel", "talk", "fair", "hiring", "job", "jobs", "apprenticeship",
    "industry insight", "alumni", "mentoring", "interview", "assessment centre", "workshop",
]
SOCIAL_WORDS = [
    "social", "party", "night", "tournament", "match", "game night", "quiz", "meetup", "meet-up", "ceilidh",
    "karaoke", "gig", "trip", "picnic", "movie", "film night", "bingo", "mixer",
]


def classify_type(title: str, description: str) -> Tuple[str, bool]:
    """Returns (career or social, ambiguous). Social is the default when nothing points to career."""
    text = f"{title} {description}"
    career = sum(1 for w in CAREER_WORDS if _has(text, w))
    social = sum(1 for w in SOCIAL_WORDS if _has(text, w))
    event_type = "career" if career > social else "social"
    ambiguous = career > 0 and career == social
    return event_type, ambiguous


# ---- alcohol ---------------------------------------------------------------

ALCOHOL_CENTRAL = [
    "club night", "pub crawl", "bar crawl", "tasting", "cocktail", "wine", "beer festival", "bottomless",
    "after-work drinks", "afterwork drinks", "drinks night", "happy hour", "bar night", "rave",
]
ALCOHOL_OPTIONAL = [
    "pub quiz", "bowling", "live music", "pub", "bar", "drinks reception", "networking drinks", "drinks",
    "brewery", "gig",
]


def classify_alcohol(title: str, description: str) -> str:
    """central (alcohol is the point), optional (available) or none."""
    text = f"{title} {description}"
    if any(_has(text, w) for w in ALCOHOL_CENTRAL):
        return "central"
    if any(_has(text, w) for w in ALCOHOL_OPTIONAL):
        return "optional"
    return "none"


# ---- tags ------------------------------------------------------------------

# For each of our 37 tags, the words that point to it.
TAG_SYNONYMS = {
    "finance": ["finance", "financial", "quant", "trading", "trader", "investment", "investing", "banking", "bank", "fintech", "markets", "private equity", "hedge fund", "asset management"],
    "consulting": ["consulting", "consultancy", "consultant", "case study", "case interview", "strategy consulting", "management consulting"],
    "entrepreneurship": ["entrepreneur", "entrepreneurship", "startup", "start-up", "founder", "venture", "pitch", "innovation"],
    "economics": ["economics", "economist", "economy", "macroeconomics", "microeconomics", "policy economics"],
    "data analytics": ["data analytics", "data science", "analytics", "data analyst", "statistics", "big data", "sql", "business intelligence"],
    "software development": ["software", "developer", "development", "coding", "programming", "hackathon", "engineering team", "web dev", "devops", "python", "javascript"],
    "AI and machine learning": ["artificial intelligence", "machine learning", "deep learning", "llm", "generative ai", "neural", "ai"],
    "product and design": ["product management", "product manager", "ux", "ui design", "design thinking", "product design", "user experience", "design"],
    "law": ["law", "legal", "solicitor", "barrister", "lawyer", "litigation", "pro bono", "training contract"],
    "politics and policy": ["politics", "political", "policy", "parliament", "government", "public affairs", "debate", "think tank"],
    "sustainability": ["sustainability", "sustainable", "climate", "net zero", "esg", "environmental"],
    "healthcare": ["healthcare", "health care", "medicine", "medical", "nhs", "clinical", "nursing", "public health", "doctor"],
    "biomedical science": ["biomedical", "biotech", "biotechnology", "life sciences", "pharma", "pharmaceutical", "biology", "genomics"],
    "engineering": ["engineering", "engineer", "civil engineering", "mechanical", "robotics", "built environment", "infrastructure"],
    "psychology": ["psychology", "psychologist", "mental health", "wellbeing", "neuroscience", "behavioural"],
    "padel": ["padel"],
    "tennis": ["tennis"],
    "football": ["football", "soccer", "five-a-side", "5-a-side"],
    "basketball": ["basketball"],
    "gym": ["gym", "weights", "strength training", "crossfit", "powerlifting", "workout"],
    "running": ["running", "parkrun", "park run", "5k", "10k", "marathon", "runner", "run club"],
    "boxing": ["boxing", "kickboxing", "muay thai", "martial arts"],
    "chess": ["chess"],
    "board games": ["board game", "board games", "tabletop", "dungeons", "d&d", "card game", "game night"],
    "video games": ["video game", "video games", "gaming", "esports", "e-sports", "console", "playstation", "nintendo"],
    "photography": ["photography", "photographer", "photo walk", "camera", "photo"],
    "music": ["music", "choir", "orchestra", "band", "singing", "musician", "concert", "jam session"],
    "film and theatre": ["film", "cinema", "movie", "theatre", "theater", "drama", "screening", "musical"],
    "writing": ["writing", "writer", "poetry", "poet", "creative writing", "journalism", "book club", "storytelling"],
    "food and cafes": ["food", "cafe", "café", "coffee", "brunch", "street food", "supper club", "dinner", "cooking", "baking", "restaurant"],
    "bars and pubs": ["pub", "bar", "pub quiz", "cocktail", "drinks", "beer", "brewery", "wine tasting"],
    "clubs": ["club night", "nightclub", "clubbing", "dj", "rave", "dance night", "disco"],
    "live music": ["live music", "gig", "live band", "open mic", "jazz", "acoustic", "concert"],
    "bowling and arcades": ["bowling", "arcade", "pinball", "escape room", "mini golf", "crazy golf", "laser tag"],
    "parks and outdoors": ["park", "outdoors", "hiking", "walking", "picnic", "cycling", "garden", "nature", "canal"],
    "museums and culture": ["museum", "gallery", "exhibition", "culture", "heritage", "history walk", "art show"],
    "comedy": ["comedy", "stand-up", "standup", "comedian", "improv", "sketch"],
}

TITLE_POINTS = 2  # points for each synonym found in the title
DESCRIPTION_POINTS = 1  # points for each synonym found in the description
KEEP_AT = 2  # a tag needs at least this many points to be attached
MAX_TAGS = 3


def _has(text: str, word: str) -> bool:
    """Is `word` in `text` as a whole word (so 'ai' does not match 'main')?"""
    return re.search(rf"(?<![a-z0-9]){re.escape(word.lower())}(?![a-z0-9])", text.lower()) is not None


def score_tags(title: str, description: str) -> dict:
    """tag -> points (title hits count 2 each, description hits 1 each). Only tags with points are listed."""
    scores = {}
    for tag, words in TAG_SYNONYMS.items():
        points = sum(TITLE_POINTS for w in words if _has(title, w)) + sum(DESCRIPTION_POINTS for w in words if _has(description, w))
        if points:
            scores[tag] = points
    return scores


def keyword_tags(title: str, description: str) -> Tuple[List[str], bool]:
    """
    Returns (tags, needs_claude).
    Tags are those scoring KEEP_AT or more, best first, at most MAX_TAGS.
    needs_claude is True when there are none, or when a tie decides who gets the last place.
    """
    scores = score_tags(title, description)
    qualifying = sorted(((tag, pts) for tag, pts in scores.items() if pts >= KEEP_AT), key=lambda item: (-item[1], item[0]))
    if not qualifying:
        return [], True

    kept = qualifying[:MAX_TAGS]
    dropped = qualifying[MAX_TAGS:]
    tie_for_last_place = bool(dropped) and dropped[0][1] == kept[-1][1]
    return [tag for tag, _ in kept], tie_for_last_place
