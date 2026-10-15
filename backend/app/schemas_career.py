"""
The shapes of data going IN to the career routes (roles, work values, saved routes).
Answers coming out are plain dictionaries, described in the docstring of each route.
"""

from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

MIN_VALUES = 3
MAX_VALUES = 5


class ResolveRoleIn(BaseModel):
    title: Annotated[str, Field(min_length=2, max_length=60)]


class WorkValueIn(BaseModel):
    """A work value the student makes up themselves."""

    title: Annotated[str, Field(min_length=2, max_length=40)]
    description: Optional[Annotated[str, Field(max_length=200)]] = None


class PickValuesIn(BaseModel):
    """The student's top 3 to 5 work values, most important first."""

    value_ids: List[int] = Field(min_length=MIN_VALUES, max_length=MAX_VALUES)

    @model_validator(mode="after")
    def no_repeats(self):
        if len(set(self.value_ids)) != len(self.value_ids):
            raise ValueError("Each work value can only be picked once.")
        return self


class SaveRouteIn(BaseModel):
    """Save a route. Give EITHER role_id (picked from the list) OR title (typed by the student)."""

    role_id: Optional[int] = None
    title: Optional[Annotated[str, Field(min_length=2, max_length=60)]] = None
    source: Literal["chosen", "suggested"] = "chosen"
    rationale: Optional[Annotated[str, Field(max_length=400)]] = None

    @model_validator(mode="after")
    def exactly_one(self):
        if (self.role_id is None) == (self.title is None):
            raise ValueError("Send either role_id or title, not both and not neither.")
        return self


class SuggestIn(BaseModel):
    """Ask for suggested routes. If from_role_id is given, suggest roles ADJACENT to that role."""

    from_role_id: Optional[int] = None
    limit: int = Field(default=5, ge=1, le=5)
