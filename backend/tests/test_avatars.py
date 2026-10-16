"""The fake profile pictures: every face is a valid SVG, the same person always looks the same, and people differ."""

from app.avatars import face_svg


def test_a_face_is_the_same_every_time_and_differs_between_people():
    assert face_svg(5) == face_svg(5)
    assert len({face_svg(i) for i in range(1, 21)}) == 20


def test_the_avatar_route_serves_an_svg_without_logging_in(client):
    answer = client.get("/api/avatars/7.svg")
    assert answer.status_code == 200
    assert answer.headers["content-type"].startswith("image/svg+xml")
    assert answer.text.startswith("<svg")

