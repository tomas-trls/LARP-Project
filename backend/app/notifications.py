"""
Small helper for sending a student an in-app alert (a row in the notification table).

A student can switch a kind of alert off (notificationpref). A missing preference row means "on".
The full notification routes (list, mark read, settings) come with the Messages stage.
"""

from typing import Optional

from sqlmodel import Session

from app.models import Notification, NotificationPref


def notify(session: Session, user_id: int, kind: str, title: str, body: Optional[str] = None,
           link: Optional[str] = None) -> bool:
    """Add an alert unless the student turned this kind off. Returns True if it was added. Does not commit."""
    pref = session.get(NotificationPref, (user_id, kind))
    if pref is not None and not pref.enabled:
        return False
    session.add(Notification(user_id=user_id, kind=kind, title=title, body=body, link=link))
    return True
