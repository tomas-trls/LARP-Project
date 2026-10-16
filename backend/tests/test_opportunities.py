"""Checks the Opportunities tab: job scraping and saving, role data from adverts, alerts, and the ranked events and jobs."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app import settings
from app.jobs import aggregate_role_skills, delete_old_jobs, notify_new_jobs, refresh_jobs, save_jobs
from app.models import (
    Event, EventSkill, Job, JobSave, JobSkill, Notification, NotificationPref, Role, RoleSkill, Skill, UserRoute,
)
from app.pipeline.job_scraper import (
    GradcrackerSource, RawJob, SeedJobsSource, company_from_url, level_from_title, parse_deadline,
    parse_gradcracker_listing,
)
from app.pipeline.store import backfill_event_data
from app.roles import find_role
from app.seed_career import load_career_data
from tests.test_auth import auth_header, register
from tests.test_career import login, role_id, save_cv_profile

NOW = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)

LISTING_HTML = """
<html><body>
<a href="https://www.gradcracker.com/hub/9000001/featured-graduate-employer/graduate-job/1/graduate-software-engineer">Featured banner</a>
<div class="results">
  <div class="card">
    <div><a href="https://www.gradcracker.com/hub/89/bae-systems/graduate-job/85408/graduate-data-analyst">Graduate Data Analyst</a></div>
    <p>Analyse data with SQL and Python for defence programmes.</p>
    <span>Add to Shortlist</span><span>Shortlisted</span>
    <dl><dt>Deadline</dt><dd>October 31st, 2026</dd><dt>Salary</dt><dd>£34,000</dd>
        <dt>Location</dt><dd>Bristol (Hybrid)</dd><dt>Degree required</dt><dd>2:1</dd></dl>
    <a href="https://www.gradcracker.com/hub/89/bae-systems/graduate-job/85408/graduate-data-analyst">View job</a>
  </div>
  <div class="card">
    <div><a href="https://www.gradcracker.com/hub/12/cgi/graduate-job/99/software-engineering-placement">Software Engineering Placement</a></div>
    <p>A year in industry.</p>
    <dl><dt>Deadline</dt><dd>Ongoing</dd><dt>Salary</dt><dd>Competitive</dd><dt>Location</dt><dd>Various locations</dd></dl>
    <a href="https://www.gradcracker.com/hub/12/cgi/graduate-job/99/software-engineering-placement">View job</a>
  </div>
</div>
</body></html>
"""


@pytest.fixture
def career(session):
    load_career_data(session)


@pytest.fixture
def demo_jobs(session, career):
    return refresh_jobs(session, [SeedJobsSource()])


def raw(title="Graduate Data Analyst", url="https://example.com/job/1", source="gradcracker", **kw):
    return RawJob(title=title, company="Acme", url=url, source=source, **kw)


# ---------- reading Gradcracker ----------

def test_deadline_parsing():
    assert parse_deadline("October 31st, 2026") == datetime(2026, 10, 31, tzinfo=timezone.utc)
    assert parse_deadline("5pm, October 23rd, 2026") == datetime(2026, 10, 23, tzinfo=timezone.utc)
    assert parse_deadline("January 2nd, 2027") == datetime(2027, 1, 2, tzinfo=timezone.utc)
    assert parse_deadline("Ongoing") is None and parse_deadline(None) is None and parse_deadline("soon-ish") is None


def test_company_and_level_from_the_listing():
    assert company_from_url("https://www.gradcracker.com/hub/89/bae-systems/graduate-job/1/x") == "BAE Systems"
    assert company_from_url("https://www.gradcracker.com/hub/89/tesco/graduate-job/1/x") == "Tesco"
    assert level_from_title("Software Engineering Placement", "") == "internship"
    assert level_from_title("Degree Apprenticeship", "") == "entry"
    assert level_from_title("Graduate Data Analyst", "") == "graduate"


def test_listing_page_is_parsed_into_jobs():
    jobs = parse_gradcracker_listing(LISTING_HTML)
    assert [j.title for j in jobs] == ["Graduate Data Analyst", "Software Engineering Placement"]  # the banner is skipped
    first, second = jobs
    assert first.company == "BAE Systems" and first.location == "Bristol (Hybrid)" and first.work_mode == "hybrid"
    assert first.salary_text == "£34,000" and first.closes_on == datetime(2026, 10, 31, tzinfo=timezone.utc)
    assert "SQL and Python" in first.summary and first.level == "graduate" and first.source == "gradcracker"
    assert second.level == "internship" and second.salary_text is None and second.closes_on is None  # 'Competitive' / 'Ongoing'


class FakeFetcher:
    def __init__(self, pages):
        self.pages, self.asked = pages, []

    def get(self, url):
        self.asked.append(url)
        page = self.pages.pop(0)
        if isinstance(page, Exception):
            raise page
        return page


def test_scraper_reads_pages_until_one_is_empty():
    fetcher = FakeFetcher([(200, LISTING_HTML), (200, "<html></html>")])
    jobs = GradcrackerSource(fetcher).fetch()
    assert len(jobs) == 2 and len(fetcher.asked) == 2
    assert fetcher.asked[0].endswith("/search/computing-technology/graduate-jobs") and "page=2" in fetcher.asked[1]


def test_scraper_respects_robots_and_errors():
    assert GradcrackerSource(FakeFetcher([PermissionError("robots.txt says no")])).fetch() == []
    assert GradcrackerSource(FakeFetcher([(503, "busy")])).fetch() == []
    assert GradcrackerSource(FakeFetcher([ConnectionError("down")])).fetch() == []


def test_demo_jobs_are_invented_and_never_use_real_sites():
    jobs = SeedJobsSource(now=NOW).fetch()
    assert len(jobs) == 39 and all(j.source == "demo" and j.url.startswith("demo://") for j in jobs)
    assert not any(name in j.company for j in jobs for name in ("Deloitte", "Google", "Goldman", "LinkedIn", "Indeed"))
    assert all(j.closes_on > NOW for j in jobs)


# ---------- saving jobs ----------

def test_jobs_are_tagged_with_a_role_and_skills_and_never_duplicated(session, career):
    new = save_jobs(session, [raw(summary="You will use SQL and Python daily.")])
    assert len(new) == 1
    job = new[0]
    assert session.get(Role, job.role_id).name == "Data Analyst"
    tagged = {session.get(Skill, link.skill_id).name for link in session.exec(select(JobSkill)).all()}
    assert {"SQL", "Python"} <= tagged
    closes = datetime(2026, 11, 1, tzinfo=timezone.utc)
    assert save_jobs(session, [raw(summary="x", closes_on=closes)]) == []  # same link: not added again
    assert len(session.exec(select(Job)).all()) == 1 and session.exec(select(Job)).one().closes_on.date() == closes.date()


def test_find_role_uses_the_longest_name_inside_a_title(session, career):
    assert find_role(session, "Graduate Software Engineer 2027").name == "Software Engineer"
    assert find_role(session, "Senior Data Analyst - Graduate").name == "Data Analyst"
    assert find_role(session, "Underwater Basket Weaver") is None


def test_old_closed_jobs_are_removed_with_their_saves(session, career):
    save_jobs(session, [raw(url="a", closes_on=NOW - timedelta(days=30)), raw(url="b", closes_on=NOW + timedelta(days=3)),
                        raw(url="c")])
    assert delete_old_jobs(session, NOW) == 1
    assert sorted(j.source_url for j in session.exec(select(Job)).all()) == ["b", "c"]


# ---------- role data from adverts ----------

def make_adverts(session, role, count, sql=0, python=0, excel=0):
    skill = {s.name: s.id for s in session.exec(select(Skill)).all()}
    for n in range(count):
        job = Job(title=f"{role.name} {n}", company="Acme", source="gradcracker", source_url=f"x{n}", role_id=role.id)
        session.add(job)
        session.flush()
        for name, how_many in (("SQL", sql), ("Python", python), ("Excel", excel)):
            if n < how_many:
                session.add(JobSkill(job_id=job.id, skill_id=skill[name]))
    session.commit()


def test_a_role_is_rebuilt_from_20_real_adverts(session, career):
    role = session.exec(select(Role).where(Role.name == "Data Analyst")).one()
    make_adverts(session, role, 20, sql=14, python=2, excel=1)  # SQL 70%, Python 10%, Excel 5%
    assert aggregate_role_skills(session, NOW) == ["Data Analyst"]
    session.refresh(role)
    assert (role.data_source, role.advert_count, role.aggregated_at) == ("adverts", 20, NOW)
    importance = {session.get(Skill, r.skill_id).name: r.importance for r in session.exec(select(RoleSkill).where(RoleSkill.role_id == role.id)).all()}
    assert importance == {"SQL": 0.7, "Python": 0.1}  # Excel is under the 10% cut-off


def test_fewer_than_20_adverts_keeps_the_starter_estimate(session, career):
    role = session.exec(select(Role).where(Role.name == "Data Analyst")).one()
    before = len(session.exec(select(RoleSkill).where(RoleSkill.role_id == role.id)).all())
    make_adverts(session, role, 19, sql=19)
    assert aggregate_role_skills(session, NOW) == []
    session.refresh(role)
    assert role.advert_count == 19 and role.data_source == "estimate"
    assert len(session.exec(select(RoleSkill).where(RoleSkill.role_id == role.id)).all()) == before


def test_demo_jobs_never_count_as_real_adverts(session, career):
    role = session.exec(select(Role).where(Role.name == "Data Analyst")).one()
    make_adverts(session, role, 25, sql=25)
    for job in session.exec(select(Job)).all():
        job.source = "demo"
        session.add(job)
    session.commit()
    assert aggregate_role_skills(session, NOW) == []


def test_role_results_are_cached_for_a_week(session, career):
    role = session.exec(select(Role).where(Role.name == "Data Analyst")).one()
    make_adverts(session, role, 20, sql=20)
    aggregate_role_skills(session, NOW)
    assert aggregate_role_skills(session, NOW + timedelta(days=3)) == []  # too soon
    assert aggregate_role_skills(session, NOW + timedelta(days=8)) == ["Data Analyst"]
    assert aggregate_role_skills(session, NOW + timedelta(days=9), force=True) == ["Data Analyst"]


# ---------- alerts ----------

def test_new_jobs_alert_students_with_that_active_route(client, session, career):
    headers = login(client)
    client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    new = save_jobs(session, [raw(title="Graduate Data Analyst"), raw(title="Trader", url="t")])
    assert notify_new_jobs(session, new) == 1
    note = session.exec(select(Notification)).one()
    assert note.kind == "role" and "Graduate Data Analyst" in note.title


def test_alerts_respect_the_notification_setting_and_skip_demo_jobs(client, session, career):
    headers = login(client)
    client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    user_id = session.exec(select(UserRoute)).one().user_id
    session.add(NotificationPref(user_id=user_id, kind="role", enabled=False))
    session.commit()
    assert notify_new_jobs(session, save_jobs(session, [raw()])) == 0
    session.get(NotificationPref, (user_id, "role")).enabled = True
    session.commit()
    assert notify_new_jobs(session, save_jobs(session, [raw(title="Data Analyst Intern", url="d", source="demo")])) == 0


def test_a_failing_source_is_reported_not_fatal(session, career):
    class Broken:
        name = "broken"

        def fetch(self):
            raise RuntimeError("site is down")

    report = refresh_jobs(session, [Broken(), SeedJobsSource(now=NOW)], now=NOW)
    assert report["added"] == 39 and report["problems"] == ["broken: site is down"]


# ---------- admin ----------

def test_admin_refresh_jobs_needs_the_key_and_stays_offline_in_demo_mode(client, session, career, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    assert client.post("/api/admin/refresh-jobs").status_code == 403
    done = client.post("/api/admin/refresh-jobs", headers={"X-Admin-Key": settings.ADMIN_KEY}).json()
    assert done["live"] is False and done["added"] == 39


# ---------- the tab: jobs ----------

def test_jobs_need_a_login(client):
    assert client.get("/api/opportunities/jobs").status_code == 401
    assert client.get("/api/opportunities").status_code == 401


def test_jobs_are_ranked_for_the_active_route(client, demo_jobs):
    headers = login(client)
    save_cv_profile(client, headers)
    client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    answer = client.get("/api/opportunities/jobs", headers=headers).json()
    jobs = answer["jobs"]
    assert answer["active_route"] == "Data Analyst" and answer["total"] == 39
    assert [j["match_pct"] for j in jobs] == sorted((j["match_pct"] for j in jobs), reverse=True)
    assert jobs[0]["on_active_route"] and "Data Analyst" in jobs[0]["title"]
    assert jobs[0]["why"].startswith("Why: matches your Data Analyst route")
    assert all(j["is_demo"] for j in jobs)  # the front end must label invented adverts


def test_jobs_without_a_route_are_ranked_by_skills_you_have(client, demo_jobs):
    headers = login(client)
    save_cv_profile(client, headers)  # Python and SQL, but no route saved
    answer = client.get("/api/opportunities/jobs", headers=headers).json()
    assert answer["active_route"] is None and answer["jobs"][0]["match_pct"] > 0


def test_job_filters(client, demo_jobs):
    headers = login(client)
    get = lambda **params: client.get("/api/opportunities/jobs", params=params, headers=headers).json()
    assert {j["level"] for j in get(level="internship")["jobs"]} == {"internship"}
    assert sorted(j["title"] for j in get(location="leeds")["jobs"]) == ["Backend Developer", "Policy Advisor"]
    assert {j["work_mode"] for j in get(work_mode="remote")["jobs"]} == {"remote"}
    assert len(get(q="granite")["jobs"]) == 2
    assert get(closing_soon=True)["jobs"] and all(j["title"] for j in get(closing_soon=True)["jobs"])
    closing = get(sort="closing", limit=100)["jobs"]
    assert [j["closes_on"] for j in closing] == sorted(j["closes_on"] for j in closing)
    assert get(level="graduate", location="London", limit=5)["total"] > 5 and len(get(limit=5)["jobs"]) == 5
    assert client.get("/api/opportunities/jobs", params={"level": "wizard"}, headers=headers).status_code == 422


def test_visa_flags_only_appear_for_students_who_need_sponsorship(client, demo_jobs):
    headers = login(client)
    by_title = lambda: {j["title"]: j for j in client.get("/api/opportunities/jobs", params={"limit": 100}, headers=headers).json()["jobs"]}
    assert all(j["visa_flag"] is None for j in by_title().values())
    client.put("/api/profile/details", headers=headers, json={"needs_visa_sponsorship": True})
    jobs = by_title()
    assert jobs["Graduate Data Analyst"]["visa_flag"] is None  # sponsors
    assert jobs["Junior Data Analyst"]["visa_flag"] == "check with employer"  # unknown is flagged, not hidden
    assert jobs["Data Analyst Intern"]["visa_flag"] == "no sponsorship offered"
    hidden = client.get("/api/opportunities/jobs", params={"hide_no_sponsorship": True, "limit": 100}, headers=headers).json()["jobs"]
    assert "Data Analyst Intern" not in [j["title"] for j in hidden] and "Junior Data Analyst" in [j["title"] for j in hidden]


def test_saving_applying_and_unsaving_jobs(client, demo_jobs):
    headers = login(client)
    job_id = client.get("/api/opportunities/jobs", headers=headers).json()["jobs"][0]["id"]
    assert client.post(f"/api/opportunities/jobs/{job_id}/save", headers=headers).json()["status"] == "saved"
    assert client.post(f"/api/opportunities/jobs/{job_id}/save", headers=headers, json={"status": "applied"}).json()["status"] == "applied"
    saved = client.get("/api/opportunities/jobs", params={"saved_only": True}, headers=headers).json()
    assert [(j["id"], j["saved_status"]) for j in saved["jobs"]] == [(job_id, "applied")]
    assert client.get("/api/opportunities", headers=headers).json()["saved"] == 1
    client.delete(f"/api/opportunities/jobs/{job_id}/save", headers=headers)
    assert client.get("/api/opportunities/jobs", params={"saved_only": True}, headers=headers).json()["total"] == 0
    assert client.post("/api/opportunities/jobs/99999/save", headers=headers).status_code == 404
    other = login(client, "other@ucl.ac.uk")  # saves are private
    assert client.get("/api/opportunities/jobs", params={"saved_only": True}, headers=other).json()["total"] == 0


def test_job_detail_shows_skills_you_have_and_need(client, demo_jobs):
    headers = login(client)
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": ["SQL"], "languages": []})
    jobs = client.get("/api/opportunities/jobs", params={"q": "Graduate Data Analyst"}, headers=headers).json()["jobs"]
    detail = client.get(f"/api/opportunities/jobs/{jobs[0]['id']}", headers=headers).json()
    assert "SQL" in detail["skills_you_have"] and "Python" in detail["skills_to_build"] and detail["sponsorship"] == "yes"
    assert client.get("/api/opportunities/jobs/99999", headers=headers).status_code == 404


def test_summary_counts(client, demo_jobs):
    headers = login(client)
    answer = client.get("/api/opportunities", headers=headers).json()
    assert answer["jobs"] == 39 and answer["closing_soon"] >= 1 and answer["saved"] == 0 and answer["active_route"] is None


# ---------- the tab: career events ----------

def add_event(session, title, category="opportunity", skills=(), days=5):
    event = Event(title=title, event_type="career" if category == "opportunity" else "social", category=category,
                  start_time=datetime.now(timezone.utc) + timedelta(days=days), area="other", source_url=f"https://x/{title}",
                  employer="Acme" if category == "opportunity" else None)
    session.add(event)
    session.flush()
    ids = {s.name: s.id for s in session.exec(select(Skill)).all()}
    for name in skills:
        session.add(EventSkill(event_id=event.id, skill_id=ids[name]))
    session.commit()
    return event


def test_career_events_that_build_the_route_gap_come_first(client, session, career):
    headers = login(client)
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": ["Excel"], "languages": []})
    client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    add_event(session, "Networking Mixer")
    add_event(session, "SQL Workshop", skills=["SQL", "Python"])
    add_event(session, "Pub Quiz", category="social", skills=["SQL"])  # not a career event: never listed here
    answer = client.get("/api/opportunities/events", headers=headers).json()
    titles = [e["title"] for e in answer["events"]]
    assert titles == ["SQL Workshop", "Networking Mixer"] and answer["active_route"] == "Data Analyst"
    top = answer["events"][0]
    assert top["builds"] == ["Python", "SQL"] and top["build_score"] > 0
    assert top["reason"] == "Builds SQL - a gap on your Data Analyst route"
    assert answer["events"][1]["build_score"] == 0


def test_events_you_already_cover_are_not_boosted(client, session, career):
    headers = login(client)
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": ["SQL", "Python"], "languages": []})
    client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    add_event(session, "SQL Workshop", skills=["SQL"])
    assert client.get("/api/opportunities/events", headers=headers).json()["events"][0]["build_score"] == 0


def test_events_work_without_a_route(client, session, career):
    headers = login(client)
    add_event(session, "Networking Mixer")
    answer = client.get("/api/opportunities/events", headers=headers).json()
    assert answer["active_route"] is None and [e["title"] for e in answer["events"]] == ["Networking Mixer"]


def test_backfill_gives_old_events_a_category_and_skills(session, career):
    old = Event(title="Learn SQL and Python", event_type="career", start_time=NOW + timedelta(days=3), source_url="o1")
    social = Event(title="Board games", event_type="social", start_time=NOW + timedelta(days=3), source_url="o2")
    session.add(old)
    session.add(social)
    session.commit()
    assert old.category == "social"  # the column default, before the backfill
    backfill_event_data(session)
    session.refresh(old), session.refresh(social)
    assert (old.category, social.category) == ("opportunity", "social")
    assert {session.get(Skill, e.skill_id).name for e in session.exec(select(EventSkill).where(EventSkill.event_id == old.id)).all()} >= {"SQL", "Python"}
