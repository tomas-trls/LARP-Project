"""
Career routes: pick a target role, rate work values, get suggestions, see how close you are.

All paths start with /api and (except role search) need a login token.

    GET  /api/roles?q=            search the career paths
    POST /api/roles/resolve       turn any typed title into one of our roles
    GET  /api/work-values         the UCL values list, with the student's picks marked
    POST /api/work-values         add a value of your own
    PUT  /api/work-values         pick your top 3 to 5 (most important first)
    POST /api/routes/suggest      suggest 3 to 5 roles from the profile and values
    GET  /api/routes              my saved routes
    POST /api/routes              save a route (the first one becomes active)
    PUT  /api/routes/{id}/activate   make a saved route the active one
    DELETE /api/routes/{id}       remove a saved route
    GET  /api/routes/{id}/gap     the gap summary: 5 category scores and what to build next
"""

import difflib
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app import fit
from app.auth import get_current_user
from app.career_ai import write_whys
from app.database import get_session
from app.models import Role, RoleAlias, RouteScore, User, UserRoute, UserWorkValue, WorkValue
from app.pipeline.cv_parser import make_client
from app.roles import resolve_role
from app.schemas_career import PickValuesIn, ResolveRoleIn, SaveRouteIn, SuggestIn, WorkValueIn

router = APIRouter(prefix="/api")

MAX_SAVED_ROUTES = 8
MAX_CUSTOM_VALUES = 10


# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------


def role_card(role: Role, requirements: Optional[list] = None, session: Optional[Session] = None) -> dict:
    """The short description of a role that every answer includes."""
    if requirements is None:
        requirements = fit.requirements_for(session, role.id)
    return {
        "id": role.id, "name": role.name, "sector": role.sector, "alumni_count": role.alumni_count,
        "median_start_salary_k": role.median_start_salary_k, "is_custom": role.is_custom,
        "data_status": fit.data_status(role, requirements),
    }


def closest_roles(session: Session, role: Role, limit: int = 5) -> List[dict]:
    """Common roles with enough data, nearest in name (and same sector first). Offered when a role has no data."""
    all_reqs = fit.all_requirements(session)
    candidates = [r for r in session.exec(select(Role)).all()
                  if r.id != role.id and not r.is_custom and fit.data_status(r, all_reqs.get(r.id, [])) != "not_enough_data"]
    candidates.sort(key=lambda r: (r.sector != role.sector,
                                   -difflib.SequenceMatcher(None, role.name.lower(), r.name.lower()).ratio(),
                                   -r.alumni_count))
    return [role_card(r, all_reqs.get(r.id, [])) for r in candidates[:limit]]


def compute_fit(session: Session, user: User, role: Role) -> dict:
    """Work out the five scores for this student and role. Nothing is saved here."""
    requirements = fit.requirements_for(session, role.id)
    status = fit.data_status(role, requirements)
    if status == "not_enough_data":
        return {"status": status, "requirements": requirements, "scores": [], "fit_pct": None, "have": set()}
    have = fit.user_skill_ids(session, user.id)
    scores = fit.score_requirements(requirements, have)
    return {"status": status, "requirements": requirements, "scores": scores, "fit_pct": fit.overall_fit(scores), "have": have}


def store_scores(session: Session, route: UserRoute, result: dict) -> None:
    """Save the five category scores on the route (replacing the old ones)."""
    for old in session.exec(select(RouteScore).where(RouteScore.route_id == route.id)).all():
        session.delete(old)
    session.flush()
    for s in result["scores"]:
        if s.user_score is None:
            continue
        session.add(RouteScore(
            route_id=route.id, category=s.category, user_score=s.user_score, benchmark_score=s.benchmark_score,
            matched_skills=s.matched, missing_skills=[m["name"] for m in s.missing],
        ))
    route.fit_pct = result["fit_pct"]
    session.add(route)


def route_card(session: Session, route: UserRoute) -> dict:
    role = session.get(Role, route.role_id) if route.role_id else None
    return {
        "id": route.id, "is_active": route.is_active, "source": route.source, "rationale": route.rationale,
        "fit_pct": route.fit_pct, "title": role.name if role else route.custom_title,
        "role": role_card(role, session=session) if role else None,
    }


def get_my_route(session: Session, user: User, route_id: int) -> UserRoute:
    route = session.get(UserRoute, route_id)
    if route is None or route.user_id != user.id:  # someone else's route looks exactly like a missing one
        raise HTTPException(status_code=404, detail="No such route.")
    return route


# ----------------------------------------------------------------------------
# Roles
# ----------------------------------------------------------------------------


@router.get("/roles")
def search_roles(q: str = "", limit: int = 20, session: Session = Depends(get_session)):
    """Search the career paths by name, sector or a known alternative title. With no search text, the most
    popular roles (most UCL alumni) come first. Roles typed by students are not listed here."""
    limit = max(1, min(limit, 50))
    roles = [r for r in session.exec(select(Role)).all() if not r.is_custom]
    needle = q.strip().lower()
    if needle:
        alias_role_ids = {a.role_id for a in session.exec(select(RoleAlias)).all() if needle in a.term}

        def rank(r: Role):
            name = r.name.lower()
            if name.startswith(needle):
                return 0
            if needle in name:
                return 1
            if needle in r.sector.lower():
                return 2
            return 3 if r.id in alias_role_ids else None

        roles = [r for r in roles if rank(r) is not None]
        roles.sort(key=lambda r: (rank(r), -r.alumni_count))
    else:
        roles.sort(key=lambda r: -r.alumni_count)
    all_reqs = fit.all_requirements(session)
    return [role_card(r, all_reqs.get(r.id, [])) for r in roles[:limit]]


@router.post("/roles/resolve")
def resolve(data: ResolveRoleIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Turn any role the student types into one of our roles.
    Returns {"role": ..., "matched_by": exact | alias | similar | claude | custom, "closest_roles": [...]}.
    closest_roles is only filled in when there is not enough data behind the role."""
    try:
        role, how = resolve_role(session, data.title, make_client)
    except ValueError as problem:
        raise HTTPException(status_code=422, detail=str(problem))
    session.commit()
    card = role_card(role, session=session)
    return {"role": card, "matched_by": how,
            "closest_roles": closest_roles(session, role) if card["data_status"] == "not_enough_data" else []}


# ----------------------------------------------------------------------------
# Work values
# ----------------------------------------------------------------------------


@router.get("/work-values")
def list_work_values(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """The UCL Careers values list (plus any the student made up), with their picks marked by rank."""
    picks = {p.work_value_id: p.rank for p in session.exec(select(UserWorkValue).where(UserWorkValue.user_id == user.id)).all()}
    values = session.exec(
        select(WorkValue).where((WorkValue.added_by_user_id.is_(None)) | (WorkValue.added_by_user_id == user.id)).order_by(WorkValue.id)
    ).all()
    return {
        "pick_between": [3, 5],
        "values": [{"id": v.id, "title": v.title, "description": v.description,
                    "is_custom": v.added_by_user_id is not None, "rank": picks.get(v.id)} for v in values],
    }


@router.post("/work-values")
def add_work_value(data: WorkValueIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Add a value of your own ("What matters to you at work"). It is kept on your list, but no role is tagged
    with it, so it does not change which roles are suggested."""
    title = " ".join(data.title.split())
    existing = session.exec(select(WorkValue).where(WorkValue.title == title)).first()
    if existing is not None and (existing.added_by_user_id in (None, user.id)):
        return {"id": existing.id, "title": existing.title, "description": existing.description,
                "is_custom": existing.added_by_user_id is not None}
    if existing is not None:
        raise HTTPException(status_code=409, detail="That name is taken. Try wording it differently.")
    mine = session.exec(select(WorkValue).where(WorkValue.added_by_user_id == user.id)).all()
    if len(mine) >= MAX_CUSTOM_VALUES:
        raise HTTPException(status_code=400, detail=f"You can add up to {MAX_CUSTOM_VALUES} values of your own.")
    value = WorkValue(title=title, description=data.description, added_by_user_id=user.id)
    session.add(value)
    session.commit()
    session.refresh(value)
    return {"id": value.id, "title": value.title, "description": value.description, "is_custom": True}


@router.put("/work-values")
def pick_work_values(data: PickValuesIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Pick your top 3 to 5 work values. The order you send is the order of importance."""
    found = {v.id: v for v in session.exec(select(WorkValue).where(WorkValue.id.in_(data.value_ids))).all()}
    for value_id in data.value_ids:
        value = found.get(value_id)
        if value is None or value.added_by_user_id not in (None, user.id):
            raise HTTPException(status_code=422, detail=f"Unknown work value id {value_id}.")
    for old in session.exec(select(UserWorkValue).where(UserWorkValue.user_id == user.id)).all():
        session.delete(old)
    session.flush()
    for rank, value_id in enumerate(data.value_ids, start=1):
        session.add(UserWorkValue(user_id=user.id, work_value_id=value_id, rank=rank))
    session.commit()
    return {"picked": [{"rank": r, "id": v, "title": found[v].title} for r, v in enumerate(data.value_ids, start=1)]}


# ----------------------------------------------------------------------------
# Suggested routes
# ----------------------------------------------------------------------------


@router.post("/routes/suggest")
def suggest_routes(data: SuggestIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Suggest up to 5 roles.

    Without from_role_id: ranked by how well the profile fits (60%) and how well the role offers the student's
    top work values (40%). With from_role_id: roles ADJACENT to that role (similar skills), still preferring
    ones the student can reach. Only roles with data behind them are offered.
    Each suggestion has a 'why'. Save one with POST /api/routes using its role id.
    """
    have = fit.user_skill_ids(session, user.id)
    values = fit.user_values(session, user.id)
    if not have and not values:
        raise HTTPException(status_code=400, detail="Add your profile (CV or manual) or pick your work values first, so there is something to base suggestions on.")

    all_reqs = fit.all_requirements(session)
    strengths = fit.role_value_strengths(session)
    saved_ids = {r.role_id for r in session.exec(select(UserRoute).where(UserRoute.user_id == user.id)).all()}

    anchor_reqs = None
    if data.from_role_id is not None:
        anchor = session.get(Role, data.from_role_id)
        if anchor is None:
            raise HTTPException(status_code=404, detail="No such role.")
        anchor_reqs = all_reqs.get(anchor.id, [])
        if not anchor_reqs:
            raise HTTPException(status_code=422, detail="There is not enough data on that role to find similar ones yet.")

    scored = []
    for role in session.exec(select(Role)).all():
        reqs = all_reqs.get(role.id, [])
        if role.is_custom or fit.data_status(role, reqs) == "not_enough_data" or role.id in saved_ids:
            continue
        if data.from_role_id is not None and role.id == data.from_role_id:
            continue
        scores = fit.score_requirements(reqs, have)
        profile_fit = fit.overall_fit(scores)
        values_fit = fit.value_match(values, strengths.get(role.id, {}))
        rank = fit.combined_rank_score(profile_fit, values_fit)
        if anchor_reqs is not None:
            rank = 0.6 * 100 * fit.similarity(anchor_reqs, reqs) + 0.4 * rank
        scored.append((rank, role, reqs, scores, profile_fit, values_fit))
    scored.sort(key=lambda item: (-item[0], -item[1].alumni_count))
    top = scored[: data.limit]

    facts = []
    for rank, role, reqs, scores, profile_fit, values_fit in top:
        gap = fit.biggest_gap(scores)
        matched_values = [v.title for v, _ in values if strengths.get(role.id, {}).get(v.id, 0) >= 0.6]
        strongest = sorted((r for r in reqs if r.skill_id in have), key=lambda r: -r.importance)
        facts.append({
            "role": role.name, "fit_pct": profile_fit, "strengths": [r.name for r in strongest[:3]],
            "values": matched_values, "top_gap": (gap.missing[0]["name"] if gap and gap.missing else None),
        })
    whys = write_whys(facts, make_client)

    return {
        "based_on": ("roles similar to the one you chose" if data.from_role_id else
                     "your profile and work values" if values else "your profile"),
        "suggestions": [{
            "role": role_card(role, reqs), "fit_pct": profile_fit, "value_match_pct": values_fit,
            "why": whys[f["role"]], "strengths": f["strengths"], "matched_values": f["values"],
            "biggest_gap_category": (fit.biggest_gap(scores).category if fit.biggest_gap(scores) else None),
        } for (rank, role, reqs, scores, profile_fit, values_fit), f in zip(top, facts)],
    }


# ----------------------------------------------------------------------------
# Saved routes
# ----------------------------------------------------------------------------


@router.get("/routes")
def list_routes(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """My saved routes (active one first) and my average fit across them."""
    routes = session.exec(select(UserRoute).where(UserRoute.user_id == user.id)).all()
    routes.sort(key=lambda r: (not r.is_active, r.id))
    fits = [r.fit_pct for r in routes if r.fit_pct is not None]
    return {"routes": [route_card(session, r) for r in routes], "average_fit": round(sum(fits) / len(fits)) if fits else None}


@router.post("/routes", status_code=201)
def save_route(data: SaveRouteIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Save a route. Send role_id (picked from the list) or title (typed; matched to a known role if possible).
    The first route you save becomes your active one. The five scores are worked out straight away."""
    existing = session.exec(select(UserRoute).where(UserRoute.user_id == user.id)).all()
    if len(existing) >= MAX_SAVED_ROUTES:
        raise HTTPException(status_code=400, detail=f"You can save up to {MAX_SAVED_ROUTES} routes. Remove one first.")

    if data.role_id is not None:
        role = session.get(Role, data.role_id)
        if role is None:
            raise HTTPException(status_code=404, detail="No such role.")
        how = "exact"
    else:
        try:
            role, how = resolve_role(session, data.title, make_client)
        except ValueError as problem:
            raise HTTPException(status_code=422, detail=str(problem))
    if any(r.role_id == role.id for r in existing):
        raise HTTPException(status_code=409, detail=f"You have already saved {role.name}.")

    route = UserRoute(user_id=user.id, role_id=role.id, source=data.source, rationale=data.rationale,
                      is_active=not existing)  # the very first route is active
    session.add(route)
    session.flush()
    store_scores(session, route, compute_fit(session, user, role))
    session.commit()
    session.refresh(route)
    card = route_card(session, route)
    card["matched_by"] = how
    card["closest_roles"] = closest_roles(session, role) if card["role"]["data_status"] == "not_enough_data" else []
    return card


@router.put("/routes/{route_id}/activate")
def activate_route(route_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Make this route the active one. Only one route is active at a time; it drives Home and Opportunities."""
    route = get_my_route(session, user, route_id)
    for other in session.exec(select(UserRoute).where(UserRoute.user_id == user.id)).all():
        other.is_active = other.id == route.id
        session.add(other)
    session.commit()
    session.refresh(route)
    return route_card(session, route)


@router.delete("/routes/{route_id}")
def delete_route(route_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Remove a saved route. If it was the active one, the newest remaining route becomes active."""
    route = get_my_route(session, user, route_id)
    was_active = route.is_active
    for score in session.exec(select(RouteScore).where(RouteScore.route_id == route.id)).all():
        session.delete(score)
    session.delete(route)
    session.flush()
    if was_active:
        newest = session.exec(select(UserRoute).where(UserRoute.user_id == user.id).order_by(UserRoute.id.desc())).first()
        if newest:
            newest.is_active = True
            session.add(newest)
    session.commit()
    return {"deleted": route_id}


@router.get("/routes/{route_id}/gap")
def gap_summary(route_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """The gap summary for one route, worked out fresh from the current profile.

    Returns the five category scores (you vs the alumni benchmark), the biggest gap, and every missing skill
    ranked by impact. If the role has too little data, status is 'not_enough_data' and closest_roles is filled in.
    The benchmark is an estimate for now (see app/fit.py).
    """
    route = get_my_route(session, user, route_id)
    if route.role_id is None:
        raise HTTPException(status_code=422, detail="This route has no role to compare against.")
    role = session.get(Role, route.role_id)
    result = compute_fit(session, user, role)
    store_scores(session, route, result)  # keep the saved scores up to date with the profile
    session.commit()

    card = role_card(role, result["requirements"])
    if result["status"] == "not_enough_data":
        return {"route_id": route.id, "role": card, "status": result["status"], "fit_pct": None, "categories": [],
                "biggest_gap": None, "missing_skills": [], "closest_roles": closest_roles(session, role),
                "message": "Not enough data on this role yet. Try one of the closest common roles."}

    worst = fit.biggest_gap(result["scores"])
    return {
        "route_id": route.id, "role": card, "status": result["status"],
        "benchmark_is_estimate": True,
        "fit_pct": result["fit_pct"],
        "categories": [{"category": s.category, "user_score": s.user_score, "benchmark_score": s.benchmark_score,
                        "gap": (s.benchmark_score - s.user_score) if s.user_score is not None else None,
                        "matched_skills": s.matched, "missing_skills": s.missing} for s in result["scores"]],
        "biggest_gap": ({"category": worst.category, "next_skill": worst.missing[0]["name"] if worst.missing else None}
                        if worst else None),
        "missing_skills": fit.ranked_gaps(result["requirements"], result["have"]),
    }
