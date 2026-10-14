"""Checks the matching engine: the maths, the symmetry, and a look at the seed students."""

import itertools

import pytest

from app import matching
from app.matching import (
    Person, campus_bonus, course_score, experience_score, goal_score, interest_score, make_reason,
    people_from_db, rank_matches, score_pair, tag_info, tag_similarity, vibe_score,
)
from app.seed_profiles import load_profiles


def person(id=1, tags=(), **changes):
    """A Person with sensible defaults. Pass keyword arguments to change a field."""
    details = dict(
        name=f"Person {id}", campus="main", travel_ok=True, alcohol_pref="drinks", goal="career",
        course="Economics", year=2, industries=[],
    )
    details.update(changes)
    return Person(id=id, tags=[tag_info(t) for t in tags], **details)


# ---------- tags and interests ----------

def test_tag_similarity_levels():
    assert tag_similarity(tag_info("finance"), tag_info("finance")) == 1.0
    assert tag_similarity(tag_info("finance"), tag_info("data analytics")) == 0.5  # same subgroup
    assert tag_similarity(tag_info("finance"), tag_info("law")) == 0.2  # same category
    assert tag_similarity(tag_info("finance"), tag_info("chess")) == 0.0  # unrelated


def test_interest_score_worked_example_from_the_spec():
    a = person(1, ["finance", "chess"])
    b = person(2, ["data analytics", "chess"])
    assert interest_score(a, b) == pytest.approx(0.75)


def test_no_tags_gives_zero_interest():
    assert interest_score(person(1, []), person(2, ["chess"])) == 0.0


def test_same_tag_beats_same_subgroup_beats_same_category():
    me = person(1, ["chess"])
    same_tag = person(2, ["chess"])
    same_subgroup = person(3, ["board games"])  # Hobbies > Games and strategy
    same_category = person(4, ["photography"])  # Hobbies > Creative
    unrelated = person(5, ["football"])

    scores = [score_pair(me, other).total for other in (same_tag, same_subgroup, same_category, unrelated)]
    assert scores[0] > scores[1] > scores[2] > scores[3]


# ---------- the other parts ----------

def test_goal_grading():
    assert goal_score(person(goal="career"), person(goal="career")) == 1.0
    assert goal_score(person(goal="both"), person(goal="social")) == 0.7
    assert goal_score(person(goal="career"), person(goal="both")) == 0.7
    assert goal_score(person(goal="career"), person(goal="social")) == 0.2


def test_course_grading():
    assert course_score(person(course="Economics"), person(course=" economics ")) == 1.0
    assert course_score(person(course="Economics"), person(course="MSc Finance")) == 0.5  # same field
    assert course_score(person(course="Economics"), person(course="Law")) == 0.1
    assert course_score(person(course=None), person(course=None)) == 0.1


def test_experience_grading():
    # year part: same 1.0, one apart 0.6, further 0.3. Industry part: both none 0.8.
    assert experience_score(person(year=2), person(year=2)) == pytest.approx((1.0 + 0.8) / 2)
    assert experience_score(person(year=2), person(year=3)) == pytest.approx((0.6 + 0.8) / 2)
    assert experience_score(person(year=1), person(year=5)) == pytest.approx((0.3 + 0.8) / 2)
    # industry part: shared 1.0, one has none 0.4, different 0.3
    assert experience_score(person(industries=["finance"]), person(industries=["finance", "tech"])) == pytest.approx((1.0 + 1.0) / 2)
    assert experience_score(person(industries=["finance"]), person()) == pytest.approx((1.0 + 0.4) / 2)
    assert experience_score(person(industries=["finance"]), person(industries=["law"])) == pytest.approx((1.0 + 0.3) / 2)


def test_vibe_grading():
    assert vibe_score(person(alcohol_pref="drinks"), person(alcohol_pref="drinks")) == 1.0
    assert vibe_score(person(alcohol_pref="drinks"), person(alcohol_pref="bars_no_drink")) == 0.6
    assert vibe_score(person(alcohol_pref="bars_no_drink"), person(alcohol_pref="avoid")) == 0.6
    assert vibe_score(person(alcohol_pref="drinks"), person(alcohol_pref="avoid")) == 0.3


def test_campus_bonus_rules():
    stays = dict(travel_ok=False)
    # same campus and someone is not happy to travel: bonus
    assert campus_bonus(person(campus="main", **stays), person(campus="main")) == 0.05
    # "both" counts as sharing a campus
    assert campus_bonus(person(campus="both", **stays), person(campus="canary")) == 0.05
    # same campus but both happy to travel: no bonus
    assert campus_bonus(person(campus="main"), person(campus="main")) == 0.0
    # different campuses: no bonus
    assert campus_bonus(person(campus="main", **stays), person(campus="canary", **stays)) == 0.0


def test_weights_add_up_to_one():
    total = (matching.W_INTERESTS + matching.W_GOALS + matching.W_COURSE
             + matching.W_EXPERIENCE + matching.W_VIBE)
    assert total == pytest.approx(1.0)


# ---------- whole scores ----------

def test_identical_profiles_score_close_to_one():
    tags = ["finance", "chess", "gym"]
    a = person(1, tags, travel_ok=False)
    b = person(2, tags, travel_ok=False)
    assert score_pair(a, b).total >= 0.95
    assert score_pair(a, b).total <= 1.0  # the bonus can never push it over 1


def test_fully_different_profiles_score_low():
    a = person(1, ["finance", "chess"], campus="main", goal="career", course="Economics",
               year=1, industries=["finance"], alcohol_pref="drinks")
    b = person(2, ["padel", "clubs"], campus="canary", goal="social", course="Medicine",
               year=5, industries=["healthcare"], alcohol_pref="avoid")
    assert score_pair(a, b).total < 0.35


def test_score_is_the_same_both_ways_round():
    people = [
        person(1, ["finance", "chess"], campus="main", goal="career", year=1, alcohol_pref="drinks", travel_ok=False),
        person(2, ["data analytics", "chess", "gym", "clubs"], campus="canary", goal="both", year=3,
               alcohol_pref="avoid", industries=["finance"]),
        person(3, ["football"], campus="both", goal="social", course="Law", year=5, alcohol_pref="bars_no_drink"),
        person(4, [], course=None, year=None),
    ]
    for a, b in itertools.permutations(people, 2):
        assert score_pair(a, b).total == pytest.approx(score_pair(b, a).total)
        assert score_pair(a, b).shared_tags == score_pair(b, a).shared_tags


def test_cross_campus_pair_is_returned_and_can_win():
    me = person(1, ["finance", "chess"], campus="main", goal="career")
    far_but_alike = person(2, ["finance", "chess"], campus="canary", goal="career")
    near_but_different = person(3, ["clubs"], campus="main", goal="social", course="Medicine", travel_ok=False)

    ranked = rank_matches(me, [near_but_different, far_but_alike])
    assert [m.person.id for m in ranked] == [2, 3]  # the Canary Wharf student is included, and first


def test_rank_matches_skips_self_and_respects_limit():
    me = person(1, ["chess"])
    others = [me] + [person(i, ["chess"]) for i in range(2, 8)]
    ranked = rank_matches(me, others, limit=3)
    assert len(ranked) == 3
    assert all(m.person.id != 1 for m in ranked)


# ---------- reasons ----------

def test_reason_mentions_shared_tags_and_goal():
    a = person(1, ["finance", "chess"], goal="career")
    b = person(2, ["data analytics", "chess", "finance"], goal="career")
    reason = make_reason(a, b, score_pair(a, b))
    assert reason == "You both like chess and finance, and you are both here for career events."


def test_reason_has_a_fallback_and_no_private_details():
    a = person(1, ["finance"], goal="career", course="Economics", campus="main", alcohol_pref="drinks")
    b = person(2, ["padel"], goal="social", course="Medicine", campus="canary", alcohol_pref="avoid")
    reason = make_reason(a, b, score_pair(a, b))
    assert reason  # never empty
    assert "@" not in reason and "linkedin" not in reason.lower()


# ---------- the real seed students ----------

CLUSTER = ["Ava Brightwell", "Ben Okafor", "Chloe Marlowe", "Dev Raman"]  # finance + chess, main campus


def test_seed_cluster_matches_each_other_best(session):
    load_profiles(session)
    people = {p.name: p for p in people_from_db(session)}
    outsider = people["Zane Whitlock"]  # history, social, live music: nothing in common

    for a, b in itertools.combinations(CLUSTER, 2):
        together = score_pair(people[a], people[b]).total
        assert together > 0.6
        assert together > score_pair(people[a], outsider).total


def test_seed_canary_finance_student_is_in_a_cluster_members_top_20(session):
    load_profiles(session)
    people = people_from_db(session)
    ava = next(p for p in people if p.name == "Ava Brightwell")

    top20 = rank_matches(ava, people, limit=20)
    canary_names = {m.person.name for m in top20 if m.person.campus == "canary"}
    assert "Elena Voss" in canary_names  # Canary Wharf, finance: still found from the main campus


def test_seed_demo_accounts_get_different_matches(session):
    load_profiles(session)
    people = people_from_db(session)
    demo_main = next(p for p in people if p.name == "Demo Main")
    demo_canary = next(p for p in people if p.name == "Demo Canary")

    top_main = [m.person.id for m in rank_matches(demo_main, people, limit=5)]
    top_canary = [m.person.id for m in rank_matches(demo_canary, people, limit=5)]
    assert top_main != top_canary
