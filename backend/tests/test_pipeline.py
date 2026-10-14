"""Checks the event pipeline: cleaning, tagging, saving, the safety net, the page checks and the swappable search. No internet."""

import json
import pathlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from sqlmodel import select

from app import settings
from app.models import ClassificationCache, Event, EventTag, Group, Tag
from app.pipeline import base, classify, normalise, runner, su_whats_on
from app.pipeline.base import DateWindow, EventFinder, EventSource, RawEvent, SearchHit
from app.pipeline.claude_tagger import ClaudeTagger, clean_answer
from app.pipeline.finders.category_sweep import CategorySweepFinder, clean_url, looks_like_listing_page
from app.pipeline.finders.curated_file import CuratedFileSource
from app.pipeline.providers.fake import FakeProvider
from app.pipeline.search_plan import AREAS, CATEGORIES
from app.pipeline.store import ReadyEvent, delete_ended, save_events
from app.pipeline.verify import PageVerifier

NOW = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)
WINDOW = DateWindow.from_days(NOW, 30)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def raw(title="Finance Networking Evening", url="https://example.com/e/1", days=3, **changes):
    details = dict(
        title=title, url=url, source="test_source", start_time=NOW + timedelta(days=days),
        end_time=NOW + timedelta(days=days, hours=2), location_text="Gower Street, Bloomsbury",
        description="Meet people working in finance and banking.",
    )
    details.update(changes)
    return RawEvent(**details)


class ListSource(EventSource):
    """A pretend source that returns a fixed list."""

    def __init__(self, name, events):
        self.name, self._events = name, events

    def fetch(self, window):
        return list(self._events)


class FakeFetcher:
    """A pretend web fetcher: a dictionary of url -> (status, html)."""

    def __init__(self, pages, blocked=()):
        self.pages, self.blocked, self.asked = pages, set(blocked), []

    def get(self, url):
        self.asked.append(url)
        if url in self.blocked:
            raise PermissionError("robots")
        if url not in self.pages:
            raise ConnectionError("no such page")
        return self.pages[url]


def event_page(name="Banking Careers Talk", start="2026-10-20T18:00:00+01:00", location="UCL, Gower Street, London WC1E 6BT", mode=None, extra=None):
    data = {"@context": "https://schema.org", "@type": "Event", "name": name, "startDate": start,
            "location": {"@type": "Place", "name": location}, "description": "<p>A talk.</p>"}
    if mode:
        data["eventAttendanceMode"] = mode
    data.update(extra or {})
    return (200, f'<html><head><script type="application/ld+json">{json.dumps(data)}</script></head><body></body></html>')


# ---------------------------------------------------------------------------
# cleaning
# ---------------------------------------------------------------------------

def test_times_become_london_time_in_summer_and_winter():
    summer = normalise.to_london(datetime(2026, 7, 1, 18, 0))  # no time zone: taken as London time
    winter = normalise.to_london(datetime(2026, 12, 1, 18, 0))
    assert summer.utcoffset() == timedelta(hours=1) and winter.utcoffset() == timedelta(0)
    assert normalise.to_utc(datetime(2026, 7, 1, 18, 0)).hour == 17  # summer time is an hour ahead of UTC
    assert normalise.to_utc(datetime(2026, 12, 1, 18, 0)).hour == 18
    assert normalise.to_london(datetime(2026, 7, 1, 17, 0, tzinfo=timezone.utc)).hour == 18
    assert normalise.to_london(None) is None


def test_area_is_found_from_place_names():
    assert normalise.detect_area("Canary Wharf, London E14 5AB") == "canary"
    assert normalise.detect_area("Student Centre, Gordon Square, WC1H") == "main"
    assert normalise.detect_area("Room 4, Bloomsbury") == "main"
    assert normalise.detect_area("UCL East, Stratford") == "other"
    assert normalise.detect_area("Shoreditch") == "other"
    assert normalise.detect_area("", "Careers night at Canary Wharf") == "canary"  # falls back to the title


def test_location_is_tidied():
    assert normalise.tidy_location("  Location:  UCL,\n  Gower Street, ") == "UCL, Gower Street"


# ---------------------------------------------------------------------------
# keyword classification
# ---------------------------------------------------------------------------

def test_career_and_social_keywords():
    assert classify.classify_type("Graduate scheme employer fair", "")[0] == "career"
    assert classify.classify_type("Friday board game night", "")[0] == "social"
    assert classify.classify_type("Something unusual", "")[0] == "social"  # the default
    assert classify.classify_type("Networking social", "")[1] is True  # one of each: ambiguous


def test_alcohol_keywords():
    assert classify.classify_alcohol("Friday club night", "") == "central"
    assert classify.classify_alcohol("Pub quiz", "") == "optional"
    assert classify.classify_alcohol("Careers talk", "A talk about law") == "none"


def test_tag_points_title_two_description_one_keep_at_two_max_three():
    assert classify.score_tags("Chess tournament", "") == {"chess": 2}
    assert classify.score_tags("Meetup", "We play chess.") == {"chess": 1}
    tags, needs_claude = classify.keyword_tags("Chess tournament", "")
    assert tags == ["chess"] and needs_claude is False
    tags, needs_claude = classify.keyword_tags("Meetup", "We play chess.")  # only 1 point: not enough
    assert tags == [] and needs_claude is True

    title = "Finance consulting entrepreneurship law gym"
    tags, _ = classify.keyword_tags(title, "")
    assert len(tags) == 3  # never more than 3


def test_a_tie_for_the_last_place_goes_to_claude():
    tags, needs_claude = classify.keyword_tags("Finance law gym chess night", "")  # four tags, all 2 points
    assert len(tags) == 3 and needs_claude is True


def test_short_words_only_match_whole_words():
    assert "AI and machine learning" not in classify.score_tags("Main campus social", "")  # 'ai' inside 'main'
    assert "AI and machine learning" in classify.score_tags("AI in healthcare", "")


def test_every_tag_has_synonyms_and_matches_our_tag_list(session):
    names = {t.name for t in session.exec(select(Tag)).all()}
    assert set(classify.TAG_SYNONYMS) == names  # all 37, no typos


# ---------------------------------------------------------------------------
# Claude tagger (with a pretend Claude)
# ---------------------------------------------------------------------------

class FakeClaude:
    def __init__(self, reply=None, fail=False):
        self.reply, self.fail, self.calls = reply, fail, 0
        self.messages = self

    def create(self, **kwargs):
        self.calls += 1
        self.last_request = kwargs
        if self.fail:
            raise RuntimeError("no credit")
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=self.reply)],
                               usage=SimpleNamespace(input_tokens=100, output_tokens=20))


def tagger_with(fake):
    return ClaudeTagger(client_factory=lambda: fake, enabled=True)


def test_claude_answer_is_cleaned_invented_tags_are_rejected():
    answer = clean_answer(json.dumps({"tags": ["chess", "underwater basket weaving", "chess", "gym", "law", "finance"],
                                      "event_type": "party", "alcohol_role": "central"}))
    assert answer["tags"] == ["chess", "gym", "law"]  # invented tag dropped, duplicates dropped, max 3
    assert answer["event_type"] is None  # not career or social: ignored
    assert answer["alcohol_role"] == "central"
    assert clean_answer("not json") is None and clean_answer("") is None and clean_answer("[1]") is None


def test_claude_is_asked_once_per_event_then_the_saved_answer_is_used(session):
    fake = FakeClaude(json.dumps({"tags": ["finance"], "event_type": "career", "alcohol_role": "none"}))
    tagger = tagger_with(fake)

    first = tagger.classify(session, "Quant talk", "About trading", "https://example.com/e/9")
    second = tagger.classify(session, "Quant talk", "About trading", "https://example.com/e/9")
    assert first == second and first["tags"] == ["finance"]
    assert fake.calls == 1  # the second time came from the saved answer
    assert len(session.exec(select(ClassificationCache)).all()) == 1

    tagger.classify(session, "Quant talk", "A different description now", "https://example.com/e/9")
    assert fake.calls == 2  # changed text: asked again


def test_claude_request_follows_the_haiku_rules():
    fake = FakeClaude(json.dumps({"tags": [], "event_type": "social", "alcohol_role": "none"}))
    tagger_with(fake)._ask("text")
    request = fake.last_request
    assert request["model"] == "claude-haiku-5-5"
    assert "temperature" not in request and "thinking" not in request  # Haiku 5.5 rejects non-default sampling settings
    assert request["output_config"]["format"]["type"] == "json_schema"


def test_if_claude_fails_nothing_breaks(session):
    assert tagger_with(FakeClaude(fail=True)).classify(session, "Talk", "x", "https://example.com/e/2") is None
    assert tagger_with(FakeClaude("garbage")).classify(session, "Talk", "x", "https://example.com/e/3") is None
    assert ClaudeTagger(enabled=False).classify(session, "Talk", "x", "https://example.com/e/4") is None  # no key: skipped


def test_prepare_uses_claude_only_when_keywords_cannot_decide(session):
    fake = FakeClaude(json.dumps({"tags": ["comedy"], "event_type": "social", "alcohol_role": "optional"}))
    tagger = tagger_with(fake)

    clear = runner.prepare(raw(title="Chess tournament", description=""), tagger, session)
    assert clear.tags == ["chess"] and fake.calls == 0  # keywords were enough

    vague = runner.prepare(raw(title="An evening with friends", description="Come along."), tagger, session)
    assert vague.tags == ["comedy"] and vague.alcohol_role == "optional" and fake.calls == 1


def test_prepare_trusts_what_a_source_already_knows(session):
    fake = FakeClaude("{}")
    item = raw(title="Odd title", description="", event_type_hint="career", alcohol_hint="none", tags_hint=["law", "not a tag"], area_hint="canary")
    ready = runner.prepare(item, tagger_with(fake), session)
    assert (ready.event_type, ready.alcohol_role, ready.tags, ready.area) == ("career", "none", ["law"], "canary")
    assert fake.calls == 0


# ---------------------------------------------------------------------------
# saving
# ---------------------------------------------------------------------------

def ready(title="Talk", url="https://example.com/e/1", days=3, **changes):
    details = dict(title=title, url=url, source="t", area="main", event_type="career", alcohol_role="none",
                   start_time=NOW + timedelta(days=days), end_time=NOW + timedelta(days=days, hours=2), tags=["finance"])
    details.update(changes)
    return ReadyEvent(**details)


def test_running_twice_adds_nothing_new_and_updates_in_place(session):
    assert save_events(session, [ready()], NOW) == {"added": 1, "updated": 0, "duplicates": 0}
    again = save_events(session, [ready(title="Talk (new title)", tags=["law"])], NOW)
    assert again == {"added": 0, "updated": 1, "duplicates": 0}

    events = session.exec(select(Event)).all()
    assert len(events) == 1 and events[0].title == "Talk (new title)"
    names = session.exec(select(Tag.name).join(EventTag, EventTag.tag_id == Tag.id)).all()
    assert names == ["law"]  # tags were replaced, not added to


def test_same_title_and_time_under_a_different_link_is_a_duplicate(session):
    counts = save_events(session, [ready(url="https://a.com/1"), ready(url="https://b.com/2")], NOW)
    assert counts["added"] == 1 and counts["duplicates"] == 1


def test_ended_events_are_deleted_and_groups_let_go_of_them(session):
    save_events(session, [ready(title="Old", url="https://example.com/old", days=-2), ready(title="New", url="https://example.com/new", days=5)], NOW)
    old = session.exec(select(Event).where(Event.title == "Old")).one()
    group = Group(first_event_id=old.id)
    session.add(group)
    session.commit()

    assert delete_ended(session, NOW) == 1
    assert [e.title for e in session.exec(select(Event)).all()] == ["New"]
    session.refresh(group)
    assert group.first_event_id is None
    assert session.exec(select(EventTag).where(EventTag.event_id == old.id)).all() == []


def test_events_are_stored_in_utc(session):
    summer_evening = datetime(2026, 7, 1, 18, 0)  # London time, no zone given
    save_events(session, [ready(start_time=summer_evening, end_time=None)], NOW)
    stored = session.exec(select(Event)).one()
    assert stored.start_time.hour == 17


# ---------------------------------------------------------------------------
# the runner and its safety net
# ---------------------------------------------------------------------------

def test_refresh_saves_events_from_every_working_source(session):
    sources = [ListSource("one", [raw(title="A", url="https://example.com/a")]), ListSource("two", [raw(title="B", url="https://example.com/b", days=4)])]
    report = runner.refresh_events(session, sources, WINDOW, NOW)
    assert report["added"] == 2
    assert [(s["name"], s["status"], s["found"]) for s in report["sources"]] == [("one", "ok", 1), ("two", "ok", 1)]


def test_a_failing_source_falls_back_cleanly(session):
    # First run: everything works and 2 events are saved.
    good = ListSource("web", [raw(title="Saved A", url="https://example.com/a"), raw(title="Saved B", url="https://example.com/b", days=4)])
    runner.refresh_events(session, [good], WINDOW, NOW)
    assert len(session.exec(select(Event)).all()) == 2

    # Second run: the web source breaks. The saved events stay, and the other source still contributes.
    other = ListSource("curated", [raw(title="Safety net", url="https://example.com/c", days=6)])
    report = runner.refresh_events(session, [runner.FailingSource("web"), other], WINDOW, NOW)

    titles = sorted(e.title for e in session.exec(select(Event)).all())
    assert titles == ["Safety net", "Saved A", "Saved B"]  # nothing was lost
    statuses = {s["name"]: s for s in report["sources"]}
    assert statuses["web"]["status"] == "failed" and "on purpose" in statuses["web"]["error"]
    assert statuses["curated"]["status"] == "ok"


def test_one_bad_event_does_not_lose_the_others(session):
    broken = raw(title="Broken", url="https://example.com/x")
    broken.title = None  # makes cleaning fail
    report = runner.refresh_events(session, [ListSource("s", [broken, raw(url="https://example.com/ok")])], WINDOW, NOW)
    assert report["added"] == 1


def test_events_that_already_ended_are_never_saved(session):
    report = runner.refresh_events(session, [ListSource("s", [raw(days=-3)])], WINDOW, NOW)
    assert report["added"] == 0


def test_the_curated_file_is_read_and_its_answers_are_trusted(session, tmp_path):
    path = tmp_path / "events_curated.json"
    path.write_text(json.dumps([{
        "title": "Real Event", "url": "https://example.com/real", "start": "2026-10-20T18:00:00", "end": "2026-10-20T20:00:00",
        "location": "Canary Wharf", "description": "x", "event_type": "career", "alcohol_role": "optional",
        "tags": ["finance", "consulting"], "area": "canary", "verified_on": "2026-10-14",
    }]), encoding="utf-8")
    report = runner.refresh_events(session, [CuratedFileSource(path)], WINDOW, NOW)
    assert report["added"] == 1
    event = session.exec(select(Event)).one()
    assert (event.area, event.event_type, event.alcohol_role) == ("canary", "career", "optional")
    assert event.start_time.hour == 17  # 18:00 London summer time is 17:00 UTC


def test_a_missing_curated_file_is_not_an_error(session, tmp_path):
    assert CuratedFileSource(tmp_path / "nope.json").fetch(WINDOW) == []


def test_build_sources_offline_is_just_the_curated_file():
    assert [s.name for s in runner.build_sources(live=False)] == ["curated_file"]


def test_break_switches_off_the_named_source_only(monkeypatch):
    monkeypatch.setattr(settings, "EVENT_SEARCH_PROVIDER", "fake")
    sources = runner.build_sources(live=True, break_source="su_whats_on")
    assert [s.name for s in sources] == ["su_whats_on", "category_sweep", "curated_file"]
    assert isinstance(sources[0], runner.FailingSource) and not isinstance(sources[1], runner.FailingSource)


# ---------------------------------------------------------------------------
# the "open the page and check it" step
# ---------------------------------------------------------------------------

def verify(page, url="https://example.com/e/1"):
    fetcher = FakeFetcher({url: page})
    return PageVerifier(fetcher).verify(SearchHit("x", url), WINDOW, NOW, source="s")


def test_a_good_page_is_kept_with_facts_only():
    verdict = verify(event_page())
    assert verdict.ok
    event = verdict.event
    assert event.title == "Banking Careers Talk" and event.area_hint == "main"
    assert event.start_time.hour == 18 and event.verified_on == NOW
    assert event.description == "A talk."  # tags removed


def test_each_check_can_reject_a_page():
    assert "status 403" in verify((403, "forbidden")).reason
    assert "machine-readable" in verify((200, "<html><body>No event data here</body></html>")).reason
    assert "outside the window" in verify(event_page(start="2026-12-25T18:00:00+00:00")).reason  # too late
    assert "outside the window" in verify(event_page(start="2026-09-01T18:00:00+01:00")).reason  # already passed
    assert "online" in verify(event_page(mode="https://schema.org/OnlineEventAttendanceMode")).reason
    assert "not near UCL" in verify(event_page(location="Manchester Central")).reason
    assert "no clear title" in verify(event_page(name="")).reason


def test_unreachable_and_blocked_pages_are_dropped_not_fatal():
    url = "https://example.com/e/1"
    hit = SearchHit("x", url)
    assert "could not be opened" in PageVerifier(FakeFetcher({})).verify(hit, WINDOW, NOW, "s").reason
    assert "robots.txt" in PageVerifier(FakeFetcher({}, blocked=[url])).verify(hit, WINDOW, NOW, "s").reason


def test_an_event_later_today_still_counts():
    assert verify(event_page(start="2026-10-14T19:00:00+01:00")).ok


def test_mixed_online_and_in_person_events_are_allowed():
    assert verify(event_page(mode="https://schema.org/MixedEventAttendanceMode")).ok


# ---------------------------------------------------------------------------
# the search strategy
# ---------------------------------------------------------------------------

def make_finder(provider, pages=None, **options):
    return CategorySweepFinder(provider=provider, verifier=PageVerifier(FakeFetcher(pages or {})), now_fn=lambda: NOW, **options)


def test_one_query_per_category_per_area_and_ucl_comes_first():
    finder = make_finder(FakeProvider())
    queries = finder.build_queries(WINDOW, AREAS, CATEGORIES)
    assert len(queries) == len(AREAS) * len(CATEGORIES) == 24
    assert all("UCL Bloomsbury" in q.text for q in queries[:12])
    assert all("Canary Wharf" in q.text for q in queries[12:])
    assert [q.category["name"] for q in queries[:12]] == [q.category["name"] for q in queries[12:]]


def test_career_categories_use_career_wording_and_social_ones_social_wording():
    queries = make_finder(FakeProvider()).build_queries(WINDOW, AREAS, CATEGORIES)
    finance = next(q for q in queries if q.category["name"] == "Business and quant")
    padel = next(q for q in queries if q.category["name"] == "Racquet sports")
    assert "networking" in finance.text and "for students" in finance.text and "October November 2026" in finance.text
    assert "networking" not in padel.text and "meetup" in padel.text


def test_the_categories_are_our_own_tag_subgroups(session):
    subgroups = {t.subgroup for t in session.exec(select(Tag)).all()}
    assert {c["name"] for c in CATEGORIES} == subgroups


def test_the_search_keeps_good_candidates_and_drops_the_rest():
    good, wrong_place, listing = "https://example.com/events/good-talk", "https://example.com/events/far-away", "https://example.com/events"
    pages = {good: event_page(name="Good Talk"), wrong_place: event_page(name="Far Away", location="Manchester")}
    provider = FakeProvider(lambda query: [SearchHit("Good", good), SearchHit("Far", wrong_place), SearchHit("List", listing),
                                           SearchHit("Dead link", "https://example.com/gone")])
    finder = make_finder(provider, pages)

    events = finder.find(WINDOW, AREAS[:1], CATEGORIES[:2])
    assert [e.title for e in events] == ["Good Talk"]  # one event, even though both queries found it
    trail = "\n".join(finder.notes)
    assert "KEPT: Good Talk" in trail and "not near UCL" in trail and "looks like a list" in trail
    assert "could not be opened" in trail and "already seen" in trail


def test_one_failing_search_does_not_stop_the_others():
    page = "https://example.com/events/ok-talk"

    def flaky(query):
        if "finance" in query:
            raise RuntimeError("search engine down")
        return [SearchHit("OK", page)]

    finder = make_finder(FakeProvider(flaky), {page: event_page(name="OK Talk")})
    events = finder.find(WINDOW, AREAS[:1], CATEGORIES[:3])
    assert [e.title for e in events] == ["OK Talk"]
    assert any("search failed" in line for line in finder.notes)


def test_results_per_query_limits_candidates():
    pages = {f"https://example.com/events/{i}": event_page(name=f"Talk {i}") for i in range(10)}
    provider = FakeProvider(lambda q: [SearchHit("t", url) for url in pages])
    events = make_finder(provider, pages, results_per_query=3).find(WINDOW, AREAS[:1], CATEGORIES[:1])
    assert len(events) == 3


def test_listing_page_and_url_helpers():
    assert looks_like_listing_page("https://www.eventbrite.co.uk/d/united-kingdom--london/finance/")
    assert looks_like_listing_page("https://example.com/")
    assert looks_like_listing_page("https://example.com/blog/post")
    assert not looks_like_listing_page("https://www.eventbrite.co.uk/e/finance-night-tickets-12345")
    assert clean_url("https://Example.com/e/1/?utm=x#top") == "https://example.com/e/1"


# ---------------------------------------------------------------------------
# swapping strategies
# ---------------------------------------------------------------------------

def test_strategies_and_engines_are_chosen_by_name():
    assert base.get_finder_class("category_sweep") is CategorySweepFinder
    assert base.get_finder_class("curated_file") is CuratedFileSource
    assert base.get_provider_class("fake") is FakeProvider
    assert base.get_provider_class("anthropic_web_search").name == "anthropic_web_search"


def test_a_wrong_name_gives_a_helpful_error():
    with pytest.raises(ValueError) as problem:
        base.get_finder_class("typo")
    message = str(problem.value)
    assert "typo" in message and "category_sweep" in message and "curated_file" in message
    with pytest.raises(ValueError, match="fake"):
        base.get_provider_class("typo")


def test_a_new_strategy_can_be_added_and_selected_without_other_changes(monkeypatch, session):
    @base.register_finder("one_event_only")
    class OneEventFinder(EventFinder):
        def __init__(self, **_ignored):
            pass

        def find(self, window, areas, categories):
            return [raw(title="From my own strategy", url="https://example.com/mine")]

    try:
        monkeypatch.setattr(settings, "EVENT_FINDER", "one_event_only")
        monkeypatch.setattr(settings, "EVENT_SEARCH_PROVIDER", "fake")
        sources = runner.build_sources(live=True)
        assert "one_event_only" in [s.name for s in sources]
        report = runner.refresh_events(session, [s for s in sources if s.name == "one_event_only"], WINDOW, NOW)
        assert report["added"] == 1
    finally:
        base.FINDERS.pop("one_event_only", None)


# ---------------------------------------------------------------------------
# the Students' Union source (reads a saved copy of a real listing page: no internet in tests)
# ---------------------------------------------------------------------------

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "su_listing.html"


def su_events():
    return {e.title: e for e in su_whats_on.parse_listing(FIXTURE.read_text(encoding="utf-8"))}


def test_su_listing_cards_become_events():
    events = su_events()
    assert len(events) == 9
    first = events["ARC X CSS: Intro to Computing Club"]
    assert first.url == "https://studentsunionucl.org/whats-on/clubs-societies/arc-x-css-intro-to-computing-club"  # ?v=... removed
    assert (first.start_time.hour, first.start_time.minute) == (13, 30) and first.end_time.hour == 15
    assert first.start_time.date().isoformat() == "2026-10-14" and "command line" in first.description
    assert first.source == "su_whats_on"


def test_su_date_lines_in_every_format_seen():
    events = su_events()
    overnight = events["K-Pop Karaoke Night"]
    assert overnight.start_time.date().isoformat() == "2026-11-17" and overnight.end_time.date().isoformat() == "2026-11-18"
    several_days = events["Sustainability Consultancy Challenge"]
    assert several_days.start_time.date().isoformat() == "2026-11-09" and several_days.end_time.date().isoformat() == "2026-11-12"
    assert su_whats_on.parse_when("05/11/2026 | 22:00 - 01:00")[1].date().isoformat() == "2026-11-06"  # past midnight, one date
    assert su_whats_on.parse_when("no date here") == (None, None)


def test_su_event_kind_comes_from_the_address_and_place_from_the_words():
    events = su_events()
    assert events["Bending Spoons Networking Event"].event_type_hint == "career"  # /jobs-skills/
    assert events["Project Active SOM Run"].event_type_hint == "social"  # /sport/
    assert events["Project Active SOM Run"].area_hint == "canary"  # "Canary Wharf" is in the description
    assert events["Sports Night @ Phineas"].alcohol_hint == "optional"  # /bars/
    assert events["ARC X CSS: Intro to Computing Club"].area_hint == "main"  # no place given: the Bloomsbury campus


class ListingFetcher:
    """Pretend website: page 0 and 1 of the 'careers' tag, then an empty page."""

    def __init__(self):
        self.asked = []

    def get(self, url):
        self.asked.append(url)
        html = FIXTURE.read_text(encoding="utf-8")
        if url.endswith("/tags/careers") or url.endswith("page=1"):
            return 200, html
        return 200, "<html><body>No upcoming events found.</body></html>"


def test_su_source_reads_pages_until_the_window_ends_and_skips_repeats(monkeypatch):
    monkeypatch.setattr(su_whats_on, "SCRAPER_CONTACT", "https://example.com/contact")
    fetcher = ListingFetcher()
    window = DateWindow(NOW, datetime(2026, 12, 31, tzinfo=timezone.utc))
    events = su_whats_on.SuWhatsOnSource(fetcher=fetcher, tags=["careers"]).fetch(window)

    assert len(events) == 9  # page 1 repeats page 0, so nothing is counted twice
    assert fetcher.asked == [
        "https://studentsunionucl.org/tags/careers",
        "https://studentsunionucl.org/tags/careers?page=1",
        "https://studentsunionucl.org/tags/careers?page=2",  # empty: the list ended
    ]


def test_su_source_stops_once_events_pass_the_end_of_the_window(monkeypatch):
    monkeypatch.setattr(su_whats_on, "SCRAPER_CONTACT", "https://example.com/contact")
    fetcher = ListingFetcher()
    tight = DateWindow(NOW, datetime(2026, 10, 20, tzinfo=timezone.utc))
    events = su_whats_on.SuWhatsOnSource(fetcher=fetcher, tags=["careers"]).fetch(tight)
    assert len(fetcher.asked) == 1  # the last card on page 0 is already past the window: no second page
    assert all(e.start_time.date().isoformat() <= "2026-10-20" for e in events)


def test_su_source_needs_a_contact_before_it_will_visit_the_site(monkeypatch):
    source = su_whats_on.SuWhatsOnSource(fetcher=ListingFetcher(), tags=["careers"])
    monkeypatch.setattr(su_whats_on, "SCRAPER_CONTACT", "")
    with pytest.raises(RuntimeError, match="SCRAPER_CONTACT"):
        source.fetch(WINDOW)


def test_su_source_failure_is_caught_by_the_runner(session, monkeypatch):
    monkeypatch.setattr(su_whats_on, "SCRAPER_CONTACT", "https://example.com/contact")

    class SiteDown:
        def get(self, url):
            raise ConnectionError("site unreachable")

    report = runner.refresh_events(session, [su_whats_on.SuWhatsOnSource(fetcher=SiteDown(), tags=["careers"])], WINDOW, NOW)
    assert report["sources"][0]["status"] == "failed" and report["added"] == 0


def test_su_events_flow_through_the_pipeline_with_their_hints(session):
    source = ListSource("su_whats_on", list(su_events().values()))
    runner.refresh_events(session, [source], DateWindow(NOW, datetime(2026, 12, 31, tzinfo=timezone.utc)), NOW)
    saved = {e.title: e for e in session.exec(select(Event)).all()}
    assert saved["Bending Spoons Networking Event"].event_type == "career"
    assert saved["Project Active SOM Run"].area == "canary"
    assert saved["Sports Night @ Phineas"].alcohol_role in ("optional", "central")


# ---------------------------------------------------------------------------
# admin route and command line
# ---------------------------------------------------------------------------

def test_admin_refresh_needs_the_key(client):
    assert client.post("/api/admin/refresh-events").status_code == 403
    assert client.post("/api/admin/refresh-events", headers={"X-Admin-Key": "wrong"}).status_code == 403


def test_admin_refresh_in_demo_mode_uses_only_the_curated_file_and_no_internet(client, monkeypatch, tmp_path):
    from app.pipeline.finders import curated_file

    path = tmp_path / "events_curated.json"
    path.write_text(json.dumps([{"title": "Curated", "url": "https://example.com/c", "start": (datetime.now() + timedelta(days=3)).isoformat(),
                                 "location": "Bloomsbury", "event_type": "career", "alcohol_role": "none", "tags": ["law"]}]), encoding="utf-8")
    monkeypatch.setattr(curated_file, "CURATED_FILE", path)
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    response = client.post("/api/admin/refresh-events", headers={"X-Admin-Key": settings.ADMIN_KEY})
    assert response.status_code == 200
    data = response.json()
    assert data["live"] is False and data["added"] == 1
    assert [s["name"] for s in data["sources"]] == ["curated_file"]  # the no-internet guard would have failed the test otherwise


def test_command_line_refuses_to_go_live_in_demo_mode(monkeypatch, capsys):
    from app.pipeline import __main__ as cli

    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr("sys.argv", ["app.pipeline", "--live"])
    assert cli.main() == 2
    assert "DEMO_MODE" in capsys.readouterr().out


def test_command_line_needs_the_api_key_for_the_search(monkeypatch, capsys):
    from app.pipeline import __main__ as cli

    monkeypatch.setattr(settings, "DEMO_MODE", False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr("sys.argv", ["app.pipeline", "--live"])
    assert cli.main() == 2
    assert "ANTHROPIC_API_KEY" in capsys.readouterr().out
