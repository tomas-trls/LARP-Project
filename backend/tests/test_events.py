"""Checks event and venue scoring, the alcohol rule, group first events, and the web routes."""

import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app.events import (
    EventItem, VenueItem, alcohol_factor, best_event_for_group, goal_part, proximity_part, rank_events,
    rank_venues, score_event, timing_part, when_text,
)
from app.matching import Person, tag_info
from app.models import Event, Group

# A fixed "now" so dates never matter: Wednesday 14 October 2026, midday UTC.
NOW = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)
DAY = timedelta(days=1)

LIST_KEYS = {"event_id", "title", "start_time", "end_time", "location_name", "area", "event_type",
             "alcohol_role", "tags", "score", "reason", "source_url"}


def person(id=1, tags=("chess",), **changes):
    """A student with sensible defaults. Pass keyword arguments to change a field."""
    details = dict(name=f"Person {id}", campus="main", travel_ok=True, alcohol_pref="drinks", goal="career")
    details.update(changes)
    return Person(id=id, tags=[tag_info(t) for t in tags], **details)


def event(id=1, tags=("chess",), days=3, **changes):
    """An event `days` from now. By default it matches person() perfectly (score 1.0)."""
    details = dict(title=f"Event {id}", event_type="career", area="main", alcohol_role="none",
                   start_time=NOW + days * DAY, end_time=NOW + days * DAY + timedelta(hours=2))
    details.update(changes)
    return EventItem(id=id, tags=[tag_info(t) for t in tags], **details)


def venue(id=1, tags=("food and cafes",), **changes):
    details = dict(name=f"Venue {id}", area="main", alcohol_role="none", category="cafe")
    details.update(changes)
    return VenueItem(id=id, tags=[tag_info(t) for t in tags], **details)


# ---------- which events are shown ----------

def test_events_that_have_ended_are_excluded():
    over = event(1, start_time=NOW - 2 * DAY, end_time=NOW - DAY)
    assert score_event(person(), over, NOW) is None
    assert rank_events(person(), [over], NOW) == []


def test_events_in_progress_and_events_without_times_are_kept():
    happening_now = event(1, start_time=NOW - timedelta(hours=1), end_time=NOW + timedelta(hours=1))
    no_dates = event(2, start_time=None, end_time=None)
    assert score_event(person(), happening_now, NOW) is not None
    assert score_event(person(), no_dates, NOW) is not None


# ---------- the parts of the score ----------

def test_a_perfect_fit_scores_exactly_one():
    assert score_event(person(), event(), NOW).total == pytest.approx(1.0)


def test_weights_add_up_to_one():
    from app import events
    assert events.EW_INTEREST + events.EW_GOAL + events.EW_PROXIMITY + events.EW_TIMING == pytest.approx(1.0)
    assert events.VW_INTEREST + events.VW_PROXIMITY + events.VW_GOAL == pytest.approx(1.0)


def test_same_tag_beats_same_subgroup_beats_unrelated():
    me = person(tags=["chess"])
    same = score_event(me, event(1, tags=["chess"]), NOW).total
    subgroup = score_event(me, event(2, tags=["board games"]), NOW).total  # Hobbies > Games and strategy
    unrelated = score_event(me, event(3, tags=["football"]), NOW).total
    assert same > subgroup > unrelated


def test_goal_part():
    assert goal_part("career", "career") == 1.0
    assert goal_part("both", "social") == 1.0
    assert goal_part("career", "social") == 0.3


def test_proximity_part():
    main_student = person(campus="main", travel_ok=True)
    assert proximity_part(main_student, "main") == 1.0
    assert proximity_part(main_student, "canary") == 0.8
    assert proximity_part(person(campus="main", travel_ok=False), "canary") == 0.4
    both = person(campus="both", travel_ok=False)
    assert proximity_part(both, "main") == 1.0 and proximity_part(both, "canary") == 1.0
    assert proximity_part(both, "other") == 0.4  # 'other' is nobody's campus


def test_timing_part():
    assert timing_part(NOW + 7 * DAY, NOW) == 1.0
    assert timing_part(NOW + 8 * DAY, NOW) == 0.8
    assert timing_part(NOW + 14 * DAY, NOW) == 0.8
    assert timing_part(NOW + 15 * DAY, NOW) == 0.5
    assert timing_part(NOW + 28 * DAY, NOW) == 0.5
    assert timing_part(NOW + 29 * DAY, NOW) == 0.3
    assert timing_part(None, NOW) == 0.3


def test_sooner_beats_later_when_all_else_is_equal():
    soon = score_event(person(), event(1, days=2), NOW).total
    later = score_event(person(), event(2, days=20), NOW).total
    assert soon > later


# ---------- the alcohol rule: every cell of the spec's table ----------

@pytest.mark.parametrize("preference, role, expected", [
    ("drinks", "central", 1.0), ("drinks", "optional", 1.0), ("drinks", "none", 1.0),
    ("bars_no_drink", "central", 0.7), ("bars_no_drink", "optional", 1.0), ("bars_no_drink", "none", 1.0),
    ("avoid", "central", None), ("avoid", "optional", 0.85), ("avoid", "none", 1.0),
])
def test_alcohol_rule_table(preference, role, expected):
    assert alcohol_factor(preference, role) == expected

    result = score_event(person(alcohol_pref=preference), event(alcohol_role=role), NOW)
    if expected is None:
        assert result is None  # hidden
    else:
        assert result.total == pytest.approx(1.0 * expected)  # a perfect fit, times the rule


def test_a_non_drinker_who_likes_bars_still_sees_bar_events():
    me = person(tags=["bars and pubs"], goal="social", alcohol_pref="bars_no_drink")
    pub_quiz = event(1, tags=["bars and pubs"], event_type="social", alcohol_role="central")
    board_games = event(2, tags=["bars and pubs"], event_type="social", alcohol_role="none")

    ranked = rank_events(me, [pub_quiz, board_games], NOW)
    assert {s.item.id for s in ranked} == {1, 2}  # the pub event is still there
    scores = {s.item.id: s.total for s in ranked}
    assert scores[1] == pytest.approx(scores[2] * 0.7)  # only a little lower


def test_someone_who_avoids_alcohol_never_sees_central_events_but_still_sees_optional_ones():
    me = person(alcohol_pref="avoid")
    events = [event(1, alcohol_role="central"), event(2, alcohol_role="optional"), event(3, alcohol_role="none")]
    ranked = rank_events(me, events, NOW)
    assert [s.item.id for s in ranked] == [3, 2]  # 'none' first, then 'optional' (x0.85); 'central' hidden


# ---------- ranking ----------

def test_students_who_want_both_get_career_and_social_mixed():
    me = person(goal="both", tags=["finance"])
    career = [event(i, tags=["finance"], event_type="career") for i in range(1, 7)]  # strong matches
    social = [event(i, tags=["football"], event_type="social") for i in range(11, 17)]  # weak matches

    top10 = rank_events(me, career + social, NOW, limit=10)
    types = [s.item.event_type for s in top10]
    assert types.count("career") == 5 and types.count("social") == 5
    assert set(types[:2]) == {"career", "social"}  # alternating from the start


def test_filters_and_limit():
    me = person(goal="both")
    events = [event(1, event_type="career", area="main"), event(2, event_type="social", area="canary"),
              event(3, event_type="social", area="main")]
    assert [s.item.id for s in rank_events(me, events, NOW, event_type="social", area="main")] == [3]
    assert len(rank_events(me, events, NOW, limit=2)) == 2


def test_reasons_are_short_sentences_without_private_details():
    me = person(tags=["chess"])
    scored = score_event(me, event(1, tags=["chess"], days=1), NOW)
    assert scored.reason == "Matches your interest in chess. In your campus area. Tomorrow."
    assert "@" not in scored.reason


def test_when_text_wording():
    assert when_text(NOW + timedelta(hours=3), None, NOW) == "Today."
    assert when_text(NOW + 1 * DAY, None, NOW) == "Tomorrow."
    assert when_text(NOW + 6 * DAY, None, NOW) == "On Tuesday."
    assert when_text(NOW + 13 * DAY, None, NOW) == "Next Tuesday."
    assert when_text(NOW + 20 * DAY, None, NOW) == "In 20 days."
    assert when_text(None, None, NOW) == "Date to be announced."
    assert when_text(NOW - timedelta(hours=1), NOW + timedelta(hours=1), NOW) == "Happening now."


# ---------- venues ----------

def test_venues_rank_by_interest_and_have_no_timing():
    me = person(tags=["board games"], goal="social")
    games = venue(1, tags=["board games"])
    other = venue(2, tags=["football"])
    ranked = rank_venues(me, [other, games])
    assert [s.item.id for s in ranked] == [1, 2]
    assert ranked[0].total == pytest.approx(1.0)  # interest 0.5 + proximity 0.3 + goal 0.2


def test_avoiders_lose_only_central_venues():
    me = person(alcohol_pref="avoid")
    venues = [venue(1, alcohol_role="central"), venue(2, alcohol_role="optional"), venue(3, alcohol_role="none")]
    assert {s.item.id for s in rank_venues(me, venues)} == {2, 3}


def test_venue_filters():
    venues = [venue(1, category="cafe", area="main"), venue(2, category="pub", area="canary")]
    assert [s.item.id for s in rank_venues(person(), venues, category="pub")] == [2]
    assert [s.item.id for s in rank_venues(person(), venues, area="main")] == [1]


# ---------- a group's first event ----------

def test_group_event_uses_the_strictest_alcohol_preference():
    pub = event(1, tags=["bars and pubs"], event_type="social", alcohol_role="central")
    talk = event(2, tags=["football"], event_type="social", alcohol_role="none")
    drinkers = [person(1, tags=["bars and pubs"], goal="social"), person(2, tags=["bars and pubs"], goal="social")]
    mixed = [drinkers[0], person(3, tags=["bars and pubs"], goal="social", alcohol_pref="avoid")]

    assert best_event_for_group(drinkers, [pub, talk], NOW).item.id == 1  # everyone drinks: the pub wins
    assert best_event_for_group(mixed, [pub, talk], NOW).item.id == 2  # one avoids: never the pub


def test_group_event_must_be_reachable_by_everyone():
    canary_event = event(1, area="canary")
    main_only = person(1, campus="main", travel_ok=False)
    canary_only = person(2, campus="canary", travel_ok=False)
    assert best_event_for_group([main_only, canary_only], [canary_event], NOW) is None  # one can't get there

    willing = person(3, campus="main", travel_ok=True)
    assert best_event_for_group([willing, canary_only], [canary_event], NOW).item.id == 1


def test_group_event_ignores_ended_events_and_empty_groups():
    assert best_event_for_group([person()], [event(1, start_time=NOW - 2 * DAY, end_time=NOW - DAY)], NOW) is None
    assert best_event_for_group([], [event()], NOW) is None


# ---------- through the web API (with the invented test events) ----------

def titles(response):
    return [e["title"] for e in response.json()]


def test_events_and_venues_need_a_token(client, seeded, with_events):
    assert client.get("/api/events").status_code == 401
    assert client.get("/api/venues").status_code == 401


def test_events_list_shape_and_privacy(client, seeded, with_events, login):
    response = client.get("/api/events?limit=50", headers=login("demo.main@ucl.ac.uk"))
    assert response.status_code == 200
    events = response.json()

    assert events and all(set(e) == LIST_KEYS for e in events)
    assert [e["score"] for e in events if e["event_type"] == "career"] == sorted(
        (e["score"] for e in events if e["event_type"] == "career"), reverse=True)
    assert all(e["reason"] for e in events)
    text = json.dumps(events).lower()
    assert "@" not in text.replace("@example", "") and "password" not in text


def test_past_events_never_appear_and_far_future_ones_do(client, seeded, with_events, login):
    for email in ["demo.main@ucl.ac.uk", "demo.canary@ucl.ac.uk", "hamza.test08@ucl.ac.uk"]:
        names = titles(client.get("/api/events?limit=50", headers=login(email)))
        assert "Past Careers Mixer (already ended)" not in names
        assert "Late Night at the Museum" in names  # 40 days away: low, but still listed


def test_filters_and_limit_work(client, seeded, with_events, login):
    headers = login("demo.main@ucl.ac.uk")
    careers = client.get("/api/events?type=career&limit=50", headers=headers).json()
    assert careers and {e["event_type"] for e in careers} == {"career"}
    canary = client.get("/api/events?area=canary&limit=50", headers=headers).json()
    assert canary and {e["area"] for e in canary} == {"canary"}
    assert len(client.get("/api/events?limit=3", headers=headers).json()) == 3
    assert client.get("/api/events?limit=0", headers=headers).status_code == 422
    assert client.get("/api/events?limit=51", headers=headers).status_code == 422
    assert client.get("/api/events?type=party", headers=headers).status_code == 422


def test_different_students_get_different_lists(client, seeded, with_events, login):
    main = titles(client.get("/api/events?limit=5", headers=login("demo.main@ucl.ac.uk")))
    canary = titles(client.get("/api/events?limit=5", headers=login("demo.canary@ucl.ac.uk")))
    assert main != canary
    assert "Pub Quiz Night" in titles(client.get("/api/events?limit=50", headers=login("demo.canary@ucl.ac.uk")))


def test_a_student_who_avoids_alcohol_never_gets_central_events(client, seeded, with_events, login):
    events = client.get("/api/events?limit=50", headers=login("hamza.test08@ucl.ac.uk")).json()  # chose "avoid"
    assert events
    assert "central" not in {e["alcohol_role"] for e in events}
    assert "Pub Quiz Night" not in [e["title"] for e in events]


def test_a_non_drinker_who_likes_bars_still_gets_bar_events_through_the_api(client, seeded, with_events, login):
    events = client.get("/api/events?limit=50", headers=login("demo.canary@ucl.ac.uk")).json()  # bars_no_drink
    assert {"Pub Quiz Night", "Canary Wharf After-work Drinks"} <= {e["title"] for e in events}


def test_venues_for_different_students(client, seeded, with_events, login):
    avoider = client.get("/api/venues?limit=50", headers=login("hamza.test08@ucl.ac.uk")).json()
    assert avoider and "central" not in {v["alcohol_role"] for v in avoider}
    assert "optional" in {v["alcohol_role"] for v in avoider}  # only the central ones are hidden

    bars_fine = client.get("/api/venues?limit=50", headers=login("demo.canary@ucl.ac.uk")).json()
    assert {"The Test Arms", "Wharf Test Bar"} <= {v["name"] for v in bars_fine}
    assert {"venue_id", "name", "category", "area", "address", "url", "alcohol_role", "tags", "score", "reason"} == set(bars_fine[0])


def test_venue_filters(client, seeded, with_events, login):
    headers = login("demo.main@ucl.ac.uk")
    cafes = client.get("/api/venues?category=cafe&limit=50", headers=headers).json()
    assert cafes and {v["category"] for v in cafes} == {"cafe"}
    canary = client.get("/api/venues?area=canary&limit=50", headers=headers).json()
    assert canary and {v["area"] for v in canary} == {"canary"}


def test_loading_the_test_events_twice_does_not_duplicate(session, with_events):
    from app.seed_events import load_test_events, load_test_venues
    assert load_test_events(session) == 0 and load_test_venues(session) == 0


def test_demo_groups_get_a_first_event(client, seeded, with_events, session, login):
    group = client.post("/api/pair/auto", headers=login("demo.main@ucl.ac.uk")).json()["group"]
    first = group["first_event"]
    assert first is not None
    assert first["area"] == "main"  # Ben Okafor is in this group and can't travel, so it must be on his campus

    saved = session.exec(select(Group).where(Group.id == group["id"])).one()
    assert saved.first_event_id == first["event_id"]  # remembered on the group
    assert session.get(Event, first["event_id"]) is not None
    assert client.get("/api/group", headers=login("demo.main@ucl.ac.uk")).json()["first_event"] == first
