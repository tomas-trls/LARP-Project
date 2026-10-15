"""
Admin routes (development only). They need the ADMIN_KEY from .env, sent in an X-Admin-Key header.
"""

import secrets
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app import settings
from app.database import get_session
from app.models import Report, User
from app.pipeline.claude_tagger import ClaudeTagger
from app.jobs import refresh_jobs
from app.pipeline.job_scraper import GradcrackerSource, SeedJobsSource
from app.pipeline.runner import build_sources, refresh_events

router = APIRouter(prefix="/api/admin")


def require_admin_key(x_admin_key: str = Header(default="")):
    """Route guard: the right key, or 403. compare_digest avoids leaking the key through timing."""
    if not secrets.compare_digest(x_admin_key.encode(), settings.ADMIN_KEY.encode()):
        raise HTTPException(status_code=403, detail="Missing or wrong admin key.")


@router.post("/refresh-events", dependencies=[Depends(require_admin_key)])
def refresh(session: Session = Depends(get_session)):
    """
    Run the event pipeline and return what it did.
    With DEMO_MODE=true (the default) only the hand-checked curated file is loaded: no internet, no Claude.
    """
    live = not settings.DEMO_MODE
    tagger = ClaudeTagger() if live else None
    return {"live": live, **refresh_events(session, build_sources(live=live), tagger=tagger)}


class ReportDecisionIn(BaseModel):
    action: Literal["dismiss", "warn", "suspend", "ban"]  # the moderator's ladder: warning > suspension > ban


@router.get("/reports", dependencies=[Depends(require_admin_key)])
def list_reports(status: str = "open", session: Session = Depends(get_session)):
    """The moderator's inbox: reports waiting for a decision (status=open), oldest first. Use status=all for everything."""
    query = select(Report).order_by(Report.id)
    if status != "all":
        query = query.where(Report.status == status)
    return {"reports": [{
        "report_id": r.id, "reporter_id": r.reporter_id, "reported_user_id": r.reported_user_id,
        "group_id": r.group_id, "reason": r.reason, "status": r.status, "created_at": r.created_at,
    } for r in session.exec(query).all()]}


@router.put("/reports/{report_id}", dependencies=[Depends(require_admin_key)])
def decide_report(report_id: int, data: ReportDecisionIn, session: Session = Depends(get_session)):
    """Close a report. 'warn', 'suspend' and 'ban' set the reported person's account status; a suspended or
    banned account can no longer log in or use the API. 'dismiss' changes nothing."""
    report = session.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="No such report.")
    status = {"dismiss": "dismissed", "warn": "warned", "suspend": "suspended", "ban": "banned"}[data.action]
    if status != "dismissed":
        if report.reported_user_id is None:
            raise HTTPException(status_code=422, detail="This report is about a group, not a person. Dismiss it or open a new report about the person.")
        session.get(User, report.reported_user_id).account_status = status
    report.status, report.resolved_at = status, datetime.now(timezone.utc)
    session.commit()
    return {"report_id": report.id, "status": report.status}


@router.post("/refresh-jobs", dependencies=[Depends(require_admin_key)])
def refresh_job_listings(session: Session = Depends(get_session)):
    """
    Load job listings and return what happened.
    With DEMO_MODE=true (the default) only the invented demo jobs are loaded: no internet.
    With DEMO_MODE=false the polite Gradcracker scraper runs as well (robots.txt checked, slow on purpose).
    """
    live = not settings.DEMO_MODE
    sources = [SeedJobsSource()] + ([GradcrackerSource()] if live else [])
    return {"live": live, **refresh_jobs(session, sources)}
