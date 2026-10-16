"""
The fake profile pictures, served as images.

No login needed: a browser loads a picture with a plain image address and cannot send a token.
The pictures are cartoons made from the user id (see avatars.py), so there is nothing private in them.
"""

from fastapi import APIRouter
from fastapi.responses import Response

from app.avatars import face_svg

router = APIRouter(prefix="/api")


@router.get("/avatars/{user_id}.svg")
def get_avatar(user_id: int):
    """The cartoon face for one user id."""
    # A face never changes, so let the browser keep it for a day.
    return Response(face_svg(user_id), media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})
