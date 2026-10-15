"""Checks the career engine: the fit maths, role matching, work values, suggestions, saved routes and the gap summary."""

import json

import pytest
from sqlmodel import select

from app import settings
from app.fit import (
    Requirement, biggest_gap, data_status, overall_fit, ranked_gaps, score_requirements, similarity, value_match,
)
from app.models import Role, RoleAlias, RouteScore, Skill, UserRoute, WorkValue
from app.roles import resolve_role
from app.seed_career import load_career_data
from tests.test_auth import auth_header, register
from tests.test_profile import CV_TEXT


@pytest.fixture
def career(session):
    load_career_data(session)


def login(client, email="test.student@ucl.ac.uk"):
    return auth_header(register(client, ucl_email=email).json()["token"])


def role_id(client, name):
    return next(r["id"] for r in client.get("/api/roles", params={"q": name, "limit": 50}).json() if r["name"] == name)


def value_id(client, headers, title):
    return next(v["id"] for v in client.get("/api/work-values", headers=headers).json()["values"] if v["title"] == title)


def save_cv_profile(client, headers):
    """A profile like the sample CV: Python, SQL, a Deloitte-style internship, a society treasurer."""
    body = {
        "education": [{"degree": "MSc Business Analytics", "institution": "UCL", "grade": "Distinction"}],
        "experience": [
            {"title": "Product Intern", "organisation": "Deliveroo", "kind": "internship", "description": "Wrote SQL for supply analysis"},
            {"title": "Treasurer", "organisation": "Data Science Society", "kind": "society", "description": "Led a team of 6"},
        ],
        "skills": ["Python", "SQL", "Cooperative"],
        "languages": [],
    }
    assert client.put("/api/profile", headers=headers, json=body).status_code == 200


# ---------- the maths (no database) ----------

def reqs(category, count, importance=1.0):
    return [Requirement(i + 100 * len(category), f"{category} skill {i}", category, importance) for i in range(count)]


def test_four_of_five_leadership_skills_is_80():
    """The example from the brief."""
    requirements = reqs("leadership", 5)
    have = {r.skill_id for r in requirements[:4]}
    leadership = next(s for s in score_requirements(requirements, have) if s.category == "leadership")
    assert leadership.user_score == 80
    assert leadership.missing == [{"name": "leadership skill 4", "importance": 1.0}]
    assert len(leadership.matched) == 4


def test_importance_weights_the_score():
    requirements = [Requirement(1, "big", "skills", 1.0), Requirement(2, "small", "skills", 0.25)]
    assert score_requirements(requirements, {1})[1].user_score == 80  # 1.0 / 1.25
    assert score_requirements(requirements, {2})[1].user_score == 20


def test_all_five_categories_are_always_returned_in_order():
    scores = score_requirements(reqs("skills", 2), set())
    assert [s.category for s in scores] == ["academics", "skills", "teamwork", "experience", "leadership"]
    assert scores[0].user_score is None and scores[1].user_score == 0  # a category the role ignores has no score


def test_benchmark_is_the_core_skills_share():
    requirements = [Requirement(1, "core", "skills", 0.8), Requirement(2, "nice", "skills", 0.2)]
    assert score_requirements(requirements, set())[1].benchmark_score == 80  # alumni are assumed to hold the core skill


def test_overall_and_biggest_gap():
    requirements = reqs("skills", 4) + reqs("leadership", 4)
    have = {r.skill_id for r in reqs("skills", 4)}  # all skills, no leadership
    scores = score_requirements(requirements, have)
    assert overall_fit(scores) == 50
    assert biggest_gap(scores).category == "leadership"
    assert biggest_gap(score_requirements(requirements, {r.skill_id for r in requirements})) is None  # nothing to improve


def test_missing_skills_are_ranked_by_impact():
    requirements = [Requirement(1, "a", "skills", 1.0), Requirement(2, "b", "skills", 0.5), Requirement(3, "c", "teamwork", 0.5)]
    gaps = ranked_gaps(requirements, {3})
    assert [g["skill"] for g in gaps] == ["a", "b"] and gaps[0]["impact_pct"] == 50.0


def test_data_status_follows_the_20_advert_rule(session):
    some = reqs("skills", 1)
    assert data_status(Role(name="x", sector="s", data_source="adverts", advert_count=19), some) == "not_enough_data"
    assert data_status(Role(name="x", sector="s", data_source="adverts", advert_count=20), some) == "ok"
    assert data_status(Role(name="x", sector="s", data_source="estimate"), some) == "estimate"
    assert data_status(Role(name="x", sector="s", data_source="estimate"), []) == "not_enough_data"


def test_value_match_counts_the_top_value_most():
    class V:  # stands in for a WorkValue
        def __init__(self, id): self.id = id

    values = [(V(1), 1), (V(2), 2)]
    assert value_match(values, {1: 1.0}) == 56  # weights 1.0 and 0.8: 1.0 / 1.8
    assert value_match(values, {2: 1.0}) == 44
    assert value_match([], {1: 1.0}) is None


def test_similarity_of_identical_and_different_roles():
    a = [Requirement(1, "a", "skills", 1.0)]
    assert similarity(a, a) == pytest.approx(1.0)
    assert similarity(a, [Requirement(2, "b", "skills", 1.0)]) == 0.0


# ---------- matching typed roles ----------

def test_resolve_exact_alias_similar_and_custom(session, career):
    assert resolve_role(session, "product manager")[1] == "exact"
    role, how = resolve_role(session, "Data Analysts")  # a near spelling
    assert (role.name, how) == ("Data Analyst", "similar")
    assert session.get(RoleAlias, "data analysts").role_id == role.id  # remembered...
    assert resolve_role(session, "data analysts")[1] == "alias"  # ...so next time it is exact
    custom, how = resolve_role(session, "Beekeeping Coordinator")
    assert how == "custom" and custom.is_custom and custom.sector == "Your own"
    assert resolve_role(session, "beekeeping coordinator")[0].id == custom.id  # not created twice


def test_resolve_rejects_titles_with_no_letters(session, career):
    with pytest.raises(ValueError):
        resolve_role(session, "1234")


def test_claude_can_group_a_title_when_live(session, career, monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "fake")
    monkeypatch.setattr(settings, "DEMO_MODE", False)

    class Block:
        type = "text"
        text = json.dumps({"role": "Product Manager"})

    class Client:
        class messages:
            @staticmethod
            def create(**kwargs):
                return type("R", (), {"content": [Block()]})()

    role, how = resolve_role(session, "Associate Product Lead (Graduate Scheme)", lambda: Client())
    assert (role.name, how) == ("Product Manager", "claude")


def test_claude_is_never_called_in_demo_mode(session, career, monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "fake")
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    def explode():
        raise AssertionError("no Claude in demo mode")

    assert resolve_role(session, "Associate Product Lead (Graduate Scheme)", explode)[1] == "custom"


# ---------- experience skills inferred from the profile ----------

def test_saving_a_profile_infers_experience_skills(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    skills = {s["name"] for s in client.get("/api/profile", headers=headers).json()["skills"]}
    assert "Tech internship" in skills  # Product Intern
    assert "Society committee role" in skills  # Treasurer of a society
    assert "Postgraduate degree" in skills and "Teamwork" in skills


# ---------- roles ----------

def test_role_search(client, career):
    assert client.get("/api/roles", params={"q": "analyst"}).status_code == 200  # no login needed
    names = [r["name"] for r in client.get("/api/roles", params={"q": "data an"}).json()]
    assert names[0] == "Data Analyst"
    popular = client.get("/api/roles").json()
    assert popular[0]["alumni_count"] >= popular[-1]["alumni_count"] and len(popular) == 20
    by_sector = client.get("/api/roles", params={"q": "consulting", "limit": 3}).json()
    assert len(by_sector) == 3 and all(r["sector"] == "Consulting" for r in by_sector)
    assert popular[0]["data_status"] == "estimate"


def test_resolve_route_returns_closest_roles_for_a_custom_title(client, career):
    headers = login(client)
    answer = client.post("/api/roles/resolve", headers=headers, json={"title": "Beekeeping Coordinator"}).json()
    assert answer["matched_by"] == "custom" and answer["role"]["data_status"] == "not_enough_data"
    assert len(answer["closest_roles"]) == 5 and all(r["data_status"] != "not_enough_data" for r in answer["closest_roles"])
    assert client.post("/api/roles/resolve", headers=headers, json={"title": "12345"}).status_code == 422
    # Typed roles are not offered to other people in the search.
    assert not any(r["name"] == "Beekeeping Coordinator" for r in client.get("/api/roles", params={"q": "beekeeping"}).json())


# ---------- work values ----------

def test_work_values_list_pick_and_rank(client, career):
    headers = login(client)
    listing = client.get("/api/work-values", headers=headers).json()
    assert len(listing["values"]) == 43 and listing["pick_between"] == [3, 5]
    money, autonomy, fun = (value_id(client, headers, t) for t in ("Money", "Autonomy", "Fun"))
    picked = client.put("/api/work-values", headers=headers, json={"value_ids": [autonomy, money, fun]}).json()["picked"]
    assert [p["title"] for p in picked] == ["Autonomy", "Money", "Fun"]
    ranks = {v["title"]: v["rank"] for v in client.get("/api/work-values", headers=headers).json()["values"] if v["rank"]}
    assert ranks == {"Autonomy": 1, "Money": 2, "Fun": 3}


def test_work_value_picks_must_be_3_to_5_distinct_and_real(client, career):
    headers = login(client)
    ids = [value_id(client, headers, t) for t in ("Money", "Autonomy", "Fun", "Quality", "Security", "Health")]
    put = lambda v: client.put("/api/work-values", headers=headers, json={"value_ids": v}).status_code
    assert put(ids[:2]) == 422 and put(ids[:6]) == 422  # too few, too many
    assert put([ids[0], ids[0], ids[1]]) == 422  # repeats
    assert put([ids[0], ids[1], 99999]) == 422  # not a real value
    assert put(ids[:5]) == 200 and put(ids[:3]) == 200


def test_custom_values_are_private_and_do_not_change_suggestions(client, career):
    mine, theirs = login(client, "a@ucl.ac.uk"), login(client, "b@ucl.ac.uk")
    own = client.post("/api/work-values", headers=mine, json={"title": "Dog-friendly office"}).json()
    assert own["is_custom"]
    assert client.post("/api/work-values", headers=mine, json={"title": "Dog-friendly office"}).json()["id"] == own["id"]  # no duplicate
    assert "Dog-friendly office" not in [v["title"] for v in client.get("/api/work-values", headers=theirs).json()["values"]]
    assert client.post("/api/work-values", headers=theirs, json={"title": "Dog-friendly office"}).status_code == 409
    money, fun = value_id(client, mine, "Money"), value_id(client, mine, "Fun")
    assert client.put("/api/work-values", headers=mine, json={"value_ids": [own["id"], money, fun]}).status_code == 200
    assert client.put("/api/work-values", headers=theirs, json={"value_ids": [own["id"], money, fun]}).status_code == 422  # not theirs to pick


# ---------- suggestions ----------

def test_suggestions_need_a_profile_or_values(client, career):
    headers = login(client)
    assert client.post("/api/routes/suggest", headers=headers, json={}).status_code == 400


def test_suggestions_rank_by_profile_and_explain_why(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    answer = client.post("/api/routes/suggest", headers=headers, json={"limit": 4}).json()
    suggestions = answer["suggestions"]
    assert answer["based_on"] == "your profile" and len(suggestions) == 4
    assert [s["fit_pct"] for s in suggestions] == sorted((s["fit_pct"] for s in suggestions), reverse=True)
    top = suggestions[0]
    assert any("Data" in s["role"]["name"] for s in suggestions)  # Python, SQL and a business degree point at data roles
    assert str(top["fit_pct"]) in top["why"] and top["why"].endswith(".")
    assert all(s["role"]["data_status"] != "not_enough_data" and not s["role"]["is_custom"] for s in suggestions)


def test_work_values_change_the_order(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    before = [s["role"]["name"] for s in client.post("/api/routes/suggest", headers=headers, json={}).json()["suggestions"]]
    picks = [value_id(client, headers, t) for t in ("Helping society", "Justifiable", "Fairness")]
    client.put("/api/work-values", headers=headers, json={"value_ids": picks})
    after = client.post("/api/routes/suggest", headers=headers, json={}).json()
    assert after["based_on"] == "your profile and work values"
    assert [s["role"]["name"] for s in after["suggestions"]] != before
    assert any(s["matched_values"] for s in after["suggestions"])


def test_adjacent_roles_are_similar_to_the_chosen_one(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    answer = client.post("/api/routes/suggest", headers=headers, json={"from_role_id": role_id(client, "Data Scientist")}).json()
    assert answer["based_on"] == "roles similar to the one you chose"
    names = [s["role"]["name"] for s in answer["suggestions"]]
    assert "Data Scientist" not in names and any(n in names for n in ("Machine Learning Engineer", "Data Analyst", "Data Engineer"))


def test_saved_roles_are_not_suggested_again(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    first = client.post("/api/routes/suggest", headers=headers, json={}).json()["suggestions"][0]["role"]["id"]
    client.post("/api/routes", headers=headers, json={"role_id": first})
    again = [s["role"]["id"] for s in client.post("/api/routes/suggest", headers=headers, json={}).json()["suggestions"]]
    assert first not in again


def test_claude_writes_the_why_when_live_and_template_when_it_fails(client, career, monkeypatch):
    headers = login(client)
    save_cv_profile(client, headers)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "fake")
    monkeypatch.setattr(settings, "DEMO_MODE", False)

    from app import career_ai

    monkeypatch.setattr(career_ai, "claude_whys", lambda facts, client: {f["role"]: "Claude says so." for f in facts})
    live = client.post("/api/routes/suggest", headers=headers, json={}).json()["suggestions"]
    assert all(s["why"] == "Claude says so." for s in live)

    monkeypatch.setattr(career_ai, "claude_whys", lambda facts, client: {})  # Claude failed
    assert all(s["why"].startswith("Your profile covers") for s in client.post("/api/routes/suggest", headers=headers, json={}).json()["suggestions"])


# ---------- saved routes ----------

def test_first_route_is_active_and_scores_are_stored(client, session, career):
    headers = login(client)
    save_cv_profile(client, headers)
    first = client.post("/api/routes", headers=headers, json={"role_id": role_id(client, "Data Analyst")})
    assert first.status_code == 201
    card = first.json()
    assert card["is_active"] and card["title"] == "Data Analyst" and card["fit_pct"] is not None
    second = client.post("/api/routes", headers=headers, json={"title": "product manager"}).json()
    assert not second["is_active"] and second["matched_by"] == "exact"
    assert len(session.exec(select(RouteScore).where(RouteScore.route_id == card["id"])).all()) == 5
    listing = client.get("/api/routes", headers=headers).json()
    assert [r["title"] for r in listing["routes"]] == ["Data Analyst", "Product Manager"]  # active first
    assert listing["average_fit"] == round((card["fit_pct"] + second["fit_pct"]) / 2)


def test_route_validation_and_limits(client, career):
    headers = login(client)
    pm = role_id(client, "Product Manager")
    post = lambda body: client.post("/api/routes", headers=headers, json=body)
    assert post({}).status_code == 422 and post({"role_id": pm, "title": "x y"}).status_code == 422
    assert post({"role_id": 99999}).status_code == 404
    assert post({"role_id": pm}).status_code == 201
    assert post({"role_id": pm}).status_code == 409  # already saved
    assert post({"title": "Product Manager"}).status_code == 409  # same role, typed
    names = [r["name"] for r in client.get("/api/roles", params={"q": "engineer", "limit": 50}).json()][:7]
    for name in names:
        assert post({"title": name}).status_code == 201
    assert post({"title": "Trader"}).status_code == 400  # 8 is the limit


def test_switching_and_deleting_routes(client, career):
    headers = login(client)
    a = client.post("/api/routes", headers=headers, json={"title": "Data Analyst"}).json()["id"]
    b = client.post("/api/routes", headers=headers, json={"title": "Product Manager"}).json()["id"]
    assert client.put(f"/api/routes/{b}/activate", headers=headers).json()["is_active"]
    active = [r["id"] for r in client.get("/api/routes", headers=headers).json()["routes"] if r["is_active"]]
    assert active == [b]  # only one active
    assert client.delete(f"/api/routes/{b}", headers=headers).status_code == 200
    assert [(r["id"], r["is_active"]) for r in client.get("/api/routes", headers=headers).json()["routes"]] == [(a, True)]


def test_nobody_can_touch_someone_elses_route(client, career):
    mine, theirs = login(client, "a@ucl.ac.uk"), login(client, "b@ucl.ac.uk")
    route = client.post("/api/routes", headers=mine, json={"title": "Data Analyst"}).json()["id"]
    for call in (lambda: client.get(f"/api/routes/{route}/gap", headers=theirs),
                 lambda: client.put(f"/api/routes/{route}/activate", headers=theirs),
                 lambda: client.delete(f"/api/routes/{route}", headers=theirs)):
        assert call().status_code == 404
    assert client.get("/api/routes").status_code == 401


# ---------- the gap summary ----------

def test_gap_summary_has_five_categories_and_ranked_gaps(client, career):
    headers = login(client)
    save_cv_profile(client, headers)
    route = client.post("/api/routes", headers=headers, json={"title": "Data Analyst"}).json()["id"]
    gap = client.get(f"/api/routes/{route}/gap", headers=headers).json()
    assert gap["status"] == "estimate" and gap["benchmark_is_estimate"]
    assert [c["category"] for c in gap["categories"]] == ["academics", "skills", "teamwork", "experience", "leadership"]
    skills = next(c for c in gap["categories"] if c["category"] == "skills")
    assert "Python" in skills["matched_skills"] and "SQL" in skills["matched_skills"]
    assert all(0 <= c["user_score"] <= 100 and c["gap"] == c["benchmark_score"] - c["user_score"] for c in gap["categories"])
    impacts = [m["impact_pct"] for m in gap["missing_skills"]]
    assert impacts == sorted(impacts, reverse=True)
    assert gap["biggest_gap"] is None or gap["biggest_gap"]["category"] in {c["category"] for c in gap["categories"]}
    assert gap["fit_pct"] == round(sum(c["user_score"] for c in gap["categories"]) / 5)


def test_gap_updates_when_the_profile_changes(client, session, career):
    headers = login(client)
    route = client.post("/api/routes", headers=headers, json={"title": "Data Analyst"}).json()["id"]
    empty = client.get(f"/api/routes/{route}/gap", headers=headers).json()["fit_pct"]
    assert empty == 0
    save_cv_profile(client, headers)
    better = client.get(f"/api/routes/{route}/gap", headers=headers).json()["fit_pct"]
    assert better > empty
    assert session.get(UserRoute, route).fit_pct == better  # the saved copy is refreshed too


def test_a_custom_role_gets_not_enough_data_and_closest_roles(client, career):
    headers = login(client)
    saved = client.post("/api/routes", headers=headers, json={"title": "Beekeeping Coordinator"}).json()
    assert saved["fit_pct"] is None and saved["role"]["data_status"] == "not_enough_data" and len(saved["closest_roles"]) == 5
    gap = client.get(f"/api/routes/{saved['id']}/gap", headers=headers).json()
    assert gap["status"] == "not_enough_data" and gap["categories"] == [] and len(gap["closest_roles"]) == 5


def test_a_role_with_too_few_adverts_is_not_scored(client, session, career):
    """Once adverts exist (P2a), a role built from fewer than 20 of them must show 'not enough data'."""
    headers = login(client)
    role = session.exec(select(Role).where(Role.name == "Data Analyst")).one()
    role.data_source, role.advert_count = "adverts", 12
    session.add(role)
    session.commit()
    route = client.post("/api/routes", headers=headers, json={"role_id": role.id}).json()
    assert route["role"]["data_status"] == "not_enough_data" and route["fit_pct"] is None
    role.advert_count = 20
    session.add(role)
    session.commit()
    assert client.get(f"/api/routes/{route['id']}/gap", headers=headers).json()["status"] == "ok"
