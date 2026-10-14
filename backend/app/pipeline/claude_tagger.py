"""
Claude tagging: the second pass, only for events the keywords could not settle.

We send Claude the title, the first 600 characters of the description and our list of
tags, and ask for JSON only. Safety rules:
  - any tag that is not in our list is thrown away;
  - each answer is saved (table ClassificationCache) under the event's link and a hash
    of its text, so the same event is never sent twice;
  - if anything goes wrong (no key, no credit, network down, odd answer) we return None
    and the caller simply keeps the keyword result. The pipeline never stops because of Claude.
"""

import hashlib
import json
import logging
from typing import Callable, List, Optional

from sqlmodel import Session

from app.models import ClassificationCache
from app.pipeline.classify import MAX_TAGS, TAG_SYNONYMS
from app.settings import ANTHROPIC_API_KEY, EVENT_TAG_MODEL

log = logging.getLogger("pipeline.tagger")

ALL_TAGS = list(TAG_SYNONYMS)
EVENT_TYPES = ["career", "social"]
ALCOHOL_ROLES = ["central", "optional", "none"]

SYSTEM_PROMPT = (
    "You classify student events in London for a university student platform. "
    "Pick up to 3 interest tags from the allowed list that best describe the event. "
    "Choose event_type 'career' for careers, employer, networking, internship or professional-skills events, otherwise 'social'. "
    "Choose alcohol_role 'central' if drinking is the main point (club nights, pub crawls, tastings, bar-led socials), "
    "'optional' if alcohol is available but not the point (pub quizzes, bowling bars, live music venues with a bar, networking drinks), "
    "otherwise 'none'. Answer with JSON only."
)

ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "tags": {"type": "array", "items": {"type": "string", "enum": ALL_TAGS}},
        "event_type": {"type": "string", "enum": EVENT_TYPES},
        "alcohol_role": {"type": "string", "enum": ALCOHOL_ROLES},
    },
    "required": ["tags", "event_type", "alcohol_role"],
    "additionalProperties": False,
}


def make_client():
    """The real Anthropic client (only created when a key exists and we are about to use it)."""
    import anthropic

    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


class ClaudeTagger:
    """Asks Claude about one event at a time, with a saved-answer cache in front."""

    def __init__(self, client_factory: Callable = make_client, model: str = EVENT_TAG_MODEL, enabled: Optional[bool] = None):
        self._client_factory = client_factory
        self._client = None
        self.model = model
        # Without a key there is nothing to call. Tests pass enabled=True with a fake client.
        self.enabled = bool(ANTHROPIC_API_KEY) if enabled is None else enabled
        self.calls = 0  # how many real requests were made (for the cost report)
        self.input_tokens = 0
        self.output_tokens = 0

    def classify(self, session: Session, title: str, description: str, source_url: str) -> Optional[dict]:
        """Returns {"tags": [...], "event_type": ..., "alcohol_role": ...} or None to keep the keyword result."""
        text = f"{title}\n{description[:600]}"
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

        cached = session.get(ClassificationCache, (source_url, text_hash))
        if cached is not None:
            return cached.answer

        if not self.enabled:
            return None

        try:
            answer = self._ask(text)
        except Exception as problem:  # any failure: keep the keyword result
            log.warning("Claude tagging failed for %s: %s", source_url, problem)
            return None
        if answer is None:
            return None

        session.add(ClassificationCache(source_url=source_url, text_hash=text_hash, answer=answer))
        session.commit()
        return answer

    def _ask(self, text: str) -> Optional[dict]:
        if self._client is None:
            self._client = self._client_factory()
        self.calls += 1
        response = self._client.messages.create(
            model=self.model,
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Allowed tags: {', '.join(ALL_TAGS)}\n\nEvent:\n{text}"}],
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": ANSWER_SCHEMA}},
        )
        usage = getattr(response, "usage", None)
        if usage is not None:
            self.input_tokens += getattr(usage, "input_tokens", 0) or 0
            self.output_tokens += getattr(usage, "output_tokens", 0) or 0

        raw = next((b.text for b in response.content if getattr(b, "type", "") == "text"), None)
        return clean_answer(raw)


def clean_answer(raw: Optional[str]) -> Optional[dict]:
    """Turn Claude's text into a safe answer, or None if it is unusable. Never trusts the model blindly."""
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None

    tags: List[str] = []
    for tag in data.get("tags") or []:
        if tag in TAG_SYNONYMS and tag not in tags:  # only tags from our own list
            tags.append(tag)
    event_type = data.get("event_type")
    alcohol = data.get("alcohol_role")
    return {
        "tags": tags[:MAX_TAGS],
        "event_type": event_type if event_type in EVENT_TYPES else None,
        "alcohol_role": alcohol if alcohol in ALCOHOL_ROLES else None,
    }
