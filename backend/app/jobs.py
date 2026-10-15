"""
Saving job listings and turning them into role data.

  save_jobs            add new jobs (never twice: the job's link is its identity), tag each with the role it
                       advertises and the skills it asks for
  aggregate_role_skills  once a role has 20 or more real adverts, rebuild its skill list from them
                       ("SQL is asked for in 70% of adverts" becomes importance 0.7)
  notify_new_jobs      tell students whose active route matches a brand new job
  refresh_jobs         the whole thing: gather -> save -> aggregate -> notify
"""

from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional

from sqlmodel import Session, delete, select

from app.fit import MIN_ADVERTS
from app.models import (
    Job, JobSave, JobSkill, Notification, NotificationPref, Role, RoleSkill, Skill, UserRoute, now as utc_now,
)
from app.pipeline.job_scraper import RawJob
from app.roles import find_role
from app.skills import SkillMatcher

CACHE_DAYS = 7  # a role's advert results are rebuilt at most once a week (docs/DESIGN_DECISIONS.md)
KEEP_CLOSED_DAYS = 14  # jobs that closed longer ago than this are removed
MIN_SHARE = 0.1  # a skill must appear in at least 10% of a role's adverts to count


def _aware(moment: Optional[datetime]) -> Optional[datetime]:
    return moment.replace(tzinfo=timezone.utc) if moment is not None and moment.tzinfo is None else moment


def save_jobs(session: Session, raw_jobs: Iterable[RawJob]) -> List[Job]:
    """Add jobs we have not seen. Returns the NEW jobs. Existing ones only get their closing date refreshed."""
    matcher = SkillMatcher(session)
    existing = {j.source_url: j for j in session.exec(select(Job)).all() if j.source_url}
    new_jobs = []
    for raw in raw_jobs:
        found = existing.get(raw.url)
        if found is not None:
            found.closes_on = raw.closes_on or found.closes_on
            session.add(found)
            continue
        role = find_role(session, raw.title)
        job = Job(
            title=raw.title, company=raw.company, location=raw.location, work_mode=raw.work_mode, level=raw.level,
            sponsorship=raw.sponsorship, salary_text=raw.salary_text, summary=raw.summary, source=raw.source,
            source_url=raw.url, closes_on=raw.closes_on, role_id=role.id if role else None,
        )
        session.add(job)
        session.flush()
        for skill_id in matcher.find(f"{raw.title} {raw.summary or ''}"):
            session.add(JobSkill(job_id=job.id, skill_id=skill_id))
        existing[raw.url] = job
        new_jobs.append(job)
    session.commit()
    return new_jobs


def delete_old_jobs(session: Session, now: datetime) -> int:
    """Remove jobs that closed a while ago (and the saves and skill tags that pointed at them)."""
    cutoff = now - timedelta(days=KEEP_CLOSED_DAYS)
    removed = 0
    for job in session.exec(select(Job)).all():
        closes = _aware(job.closes_on)
        if closes is not None and closes < cutoff:
            session.exec(delete(JobSkill).where(JobSkill.job_id == job.id))
            session.exec(delete(JobSave).where(JobSave.job_id == job.id))
            session.delete(job)
            removed += 1
    session.commit()
    return removed


def aggregate_role_skills(session: Session, now: datetime, force: bool = False) -> List[str]:
    """Rebuild a role's skill list from its real adverts, for roles with MIN_ADVERTS or more.

    Demo jobs are NOT counted (they are invented). A role rebuilt less than a week ago is skipped unless force=True.
    Roles with fewer adverts keep their starter estimate; their advert_count is still updated.
    Returns the names of the roles that were rebuilt.
    """
    rebuilt = []
    for role in session.exec(select(Role)).all():
        jobs = session.exec(select(Job).where(Job.role_id == role.id, Job.source != "demo")).all()
        role.advert_count = len(jobs)
        session.add(role)
        if len(jobs) < MIN_ADVERTS:
            continue
        last = _aware(role.aggregated_at)
        if not force and last is not None and now - last < timedelta(days=CACHE_DAYS):
            continue

        counts: dict = {}
        for link in session.exec(select(JobSkill).where(JobSkill.job_id.in_([j.id for j in jobs]))).all():
            counts[link.skill_id] = counts.get(link.skill_id, 0) + 1
        session.exec(delete(RoleSkill).where(RoleSkill.role_id == role.id))
        for skill_id, count in counts.items():
            share = count / len(jobs)
            if share >= MIN_SHARE:
                session.add(RoleSkill(role_id=role.id, skill_id=skill_id, importance=round(share, 2)))
        role.data_source, role.aggregated_at = "adverts", now
        rebuilt.append(role.name)
    session.commit()
    return rebuilt


def notify_new_jobs(session: Session, new_jobs: List[Job]) -> int:
    """A 'new role on your saved route' alert for students whose ACTIVE route is the role a new job advertises.
    Students who switched role alerts off in their notification settings are skipped."""
    sent = 0
    for job in new_jobs:
        if job.role_id is None or job.source == "demo":
            continue
        for route in session.exec(select(UserRoute).where(UserRoute.role_id == job.role_id, UserRoute.is_active.is_(True))).all():
            pref = session.get(NotificationPref, (route.user_id, "role"))
            if pref is not None and not pref.enabled:
                continue
            session.add(Notification(
                user_id=route.user_id, kind="role", title=f"New role: {job.title}",
                body=f"{job.company} - on your saved route", link=f"/opportunities/jobs/{job.id}",
            ))
            sent += 1
    session.commit()
    return sent


def refresh_jobs(session: Session, sources: list, now: Optional[datetime] = None) -> dict:
    """Gather jobs from every source and save them. A source that fails is skipped, not fatal."""
    now = now or utc_now()
    raw: List[RawJob] = []
    problems = []
    for source in sources:
        try:
            raw.extend(source.fetch())
        except Exception as problem:
            problems.append(f"{source.name}: {problem}")
    new_jobs = save_jobs(session, raw)
    removed = delete_old_jobs(session, now)
    rebuilt = aggregate_role_skills(session, now)
    alerts = notify_new_jobs(session, new_jobs)
    return {"found": len(raw), "added": len(new_jobs), "removed": removed, "roles_rebuilt": rebuilt,
            "alerts_sent": alerts, "problems": problems}
