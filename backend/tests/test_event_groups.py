"""Checks Event Groups: book first, groups of 3 to 5, the chat opening at 3, the 24-hour cut-off, leaving and no-shows."""

from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models import EventSave, Group, GroupMember, Notification
from tests.test_opportunities import add_event
from tests.test_people import make


def book(client, headers, event_id, booked=True):
    return client.post(f"/api/events/{event_id}/group", headers=headers, json={"booked": booked})


def students(client, count):
    """Student 1..count. Returns a list of (headers, user id)."""
    return [make(client, n) for n in range(1, count + 1)]


def start_event(session, event):
    """Pretend the event has now started."""
    event.start_time = datetime.now(timezone.utc) - timedelta(hours=1)
    event.end_time = datetime.now(timezone.utc) + timedelta(hours=2)
    session.add(event)
    session.commit()


def test_you_must_say_you_have_booked_first(client, session):
    me, _ = make(client, 1)
    event = add_event(session, "Gig", category="social", days=5)
    assert book(client, me, event.id, booked=False).status_code == 422
    assert client.post(f"/api/events/{event.id}/group", json={"booked": True}).status_code == 401
    assert book(client, me, 999).status_code == 404
    assert client.get(f"/api/events/{event.id}/group", headers=me).status_code == 404  # not joined yet


def test_first_person_starts_a_forming_group_and_is_marked_as_going(client, session):
    me, my_id = make(client, 1)
    event = add_event(session, "Gig", category="social", days=5)
    group = book(client, me, event.id).json()
    assert group["status"] == "forming" and group["size"] == 1 and group["chat_open"] is False
    assert group["members"][0]["is_me"] and group["members"][0]["booked"] is True
    assert group["matching_open"] is True and group["min_size"] == 3 and group["max_size"] == 5
    assert session.get(EventSave, (my_id, event.id)).status == "going"
    assert book(client, me, event.id).json()["group_id"] == group["group_id"]  # pressing twice changes nothing
    assert client.get(f"/api/events/{event.id}/group", headers=me).json()["group_id"] == group["group_id"]


def test_the_chat_opens_at_three_and_members_are_told(client, session):
    people = students(client, 3)
    event = add_event(session, "Gig", category="social", days=5)
    book(client, people[0][0], event.id)
    book(client, people[1][0], event.id)
    assert session.exec(select(Notification)).all() == []
    group = book(client, people[2][0], event.id).json()
    assert group["status"] == "open" and group["size"] == 3 and group["chat_open"] is True
    notes = session.exec(select(Notification)).all()
    assert sorted(n.user_id for n in notes) == sorted(uid for _, uid in people) and notes[0].kind == "event"
    assert "Gig" in notes[0].title


def test_a_group_holds_at_most_five_then_a_new_group_starts(client, session):
    people = students(client, 6)
    event = add_event(session, "Gig", category="social", days=5)
    ids = [book(client, headers, event.id).json()["group_id"] for headers, _ in people]
    assert len(set(ids[:5])) == 1 and ids[5] != ids[0]
    assert client.get("/api/event-groups", headers=people[5][0]).json()["groups"][0]["size"] == 1


def test_members_see_shared_hobbies_but_not_other_peoples_details(client, session):
    people = students(client, 2)
    event = add_event(session, "Gig", category="social", days=5)
    book(client, people[0][0], event.id)
    group = book(client, people[1][0], event.id).json()
    other = next(m for m in group["members"] if not m["is_me"])
    assert other["shared_hobbies"] and "ucl_email" not in other and "course" not in other


def test_matching_closes_24_hours_before_the_event(client, session):
    early, late = make(client, 1)[0], make(client, 2)[0]
    event = add_event(session, "Tomorrow gig", category="social", days=3)
    book(client, early, event.id)
    event.start_time = datetime.now(timezone.utc) + timedelta(hours=20)  # time passes: now under 24 hours away
    session.add(event)
    session.commit()
    closed = book(client, late, event.id)
    assert closed.status_code == 409 and "24 hours" in closed.json()["detail"]
    mine = client.get(f"/api/events/{event.id}/group", headers=early).json()
    assert mine["status"] == "closed" and mine["matching_open"] is False  # status follows the clock
    assert book(client, early, event.id).status_code == 200  # a member can still look at their group
    assert client.delete(f"/api/events/{event.id}/group", headers=early).json()["left"] is True  # and leave


def test_a_started_event_cannot_be_joined(client, session):
    me, _ = make(client, 1)
    event = add_event(session, "Gig", category="social", days=5)
    start_event(session, event)
    assert book(client, me, event.id).status_code == 409


def test_leaving_below_three_merges_into_another_group_with_room(client, session):
    people = students(client, 7)
    event = add_event(session, "Gig", category="social", days=5)
    for headers, _ in people:
        book(client, headers, event.id)  # students 1-5 fill group A; 6 and 7 start group B
    group_a = client.get(f"/api/events/{event.id}/group", headers=people[0][0]).json()["group_id"]
    group_b = client.get(f"/api/events/{event.id}/group", headers=people[5][0]).json()["group_id"]
    assert group_a != group_b

    client.delete(f"/api/events/{event.id}/group", headers=people[0][0])  # A drops to 4: one place free
    client.delete(f"/api/events/{event.id}/group", headers=people[6][0])  # B drops to 1: moves into A
    moved = client.get(f"/api/events/{event.id}/group", headers=people[5][0]).json()
    assert moved["group_id"] == group_a and moved["size"] == 5
    assert session.get(Group, group_b) is None


def test_a_small_group_stays_forming_when_nobody_can_take_it(client, session):
    people = students(client, 3)
    event = add_event(session, "Gig", category="social", days=5)
    for headers, _ in people:
        book(client, headers, event.id)
    client.delete(f"/api/events/{event.id}/group", headers=people[2][0])
    group = client.get(f"/api/events/{event.id}/group", headers=people[0][0]).json()
    assert group["status"] == "forming" and group["chat_open"] is False
    newcomer, _ = make(client, 4)  # the pool: a newcomer joins the forming group, which opens again
    assert book(client, newcomer, event.id).json()["status"] == "open"
    assert client.delete(f"/api/events/{event.id}/group", headers=newcomer).json()["left"] is True
    assert client.delete(f"/api/events/{event.id}/group", headers=newcomer).json()["left"] is False


def test_the_last_person_leaving_removes_the_group(client, session):
    me, _ = make(client, 1)
    event = add_event(session, "Gig", category="social", days=5)
    book(client, me, event.id)
    client.delete(f"/api/events/{event.id}/group", headers=me)
    assert session.exec(select(Group)).all() == [] and session.exec(select(GroupMember)).all() == []


def test_blocked_people_are_never_put_in_the_same_group(client, session):
    (a, a_id), (b, b_id) = make(client, 1), make(client, 2)
    event = add_event(session, "Gig", category="social", days=5)
    book(client, a, event.id)
    client.put(f"/api/blocks/{a_id}", headers=b)
    answer = book(client, b, event.id).json()
    assert answer["size"] == 1 and answer["members"][0]["is_me"]  # b starts their own group
    assert client.get(f"/api/events/{event.id}/group", headers=a).json()["size"] == 1


def test_my_event_groups_lists_only_events_that_have_not_ended(client, session):
    me, _ = make(client, 1)
    soon = add_event(session, "Soon", category="social", days=4)
    later = add_event(session, "Later", category="social", days=9)
    over = add_event(session, "Over", category="social", days=5)
    for event in (later, soon, over):
        book(client, me, event.id)
    over.start_time = datetime.now(timezone.utc) - timedelta(days=2)
    over.end_time = datetime.now(timezone.utc) - timedelta(days=1)
    session.add(over)
    session.commit()
    titles = [g["event_title"] for g in client.get("/api/event-groups", headers=me).json()["groups"]]
    assert titles == ["Soon", "Later"]


def test_event_groups_do_not_disturb_the_old_auto_groups(client, session):
    me, _ = make(client, 1)
    event = add_event(session, "Gig", category="social", days=5)
    book(client, me, event.id)
    assert client.get("/api/group", headers=me).status_code == 404  # still "not in a group" for the old feature


def test_flagging_a_no_show(client, session):
    people = students(client, 3)
    event = add_event(session, "Gig", category="social", days=5)
    for headers, _ in people:
        book(client, headers, event.id)
    group_id = client.get(f"/api/events/{event.id}/group", headers=people[0][0]).json()["group_id"]
    url = f"/api/groups/{group_id}/members/{people[2][1]}/no-show"
    assert client.post(url, headers=people[0][0]).status_code == 409  # the event has not started
    start_event(session, event)
    assert client.post(url, headers=people[0][0]).json() == {"flagged": True, "flags": 1}
    assert client.post(url, headers=people[0][0]).status_code == 409  # once each
    assert client.post(url, headers=people[1][0]).json()["flags"] == 2
    assert client.post(url, headers=people[2][0]).status_code == 404  # not yourself
    outsider, _ = make(client, 4)
    assert client.post(url, headers=outsider).status_code == 404  # not in the group
    assert session.get(GroupMember, (group_id, people[2][1])).no_show_flags == 2


def test_reporting_a_group_you_are_in(client, session):
    me, _ = make(client, 1)
    outsider, _ = make(client, 2)
    event = add_event(session, "Gig", category="social", days=5)
    group_id = book(client, me, event.id).json()["group_id"]
    assert client.post("/api/reports", headers=me, json={"group_id": group_id, "reason": "Pushed me to drink"}).status_code == 201
    assert client.post("/api/reports", headers=outsider, json={"group_id": group_id, "reason": "Not my group"}).status_code == 404
