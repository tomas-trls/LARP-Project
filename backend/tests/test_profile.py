"""Checks the profile routes: CV draft, saving a profile, details, Big Five, hobbies and skill matching."""

import io

import pytest
from docx import Document
from sqlmodel import select

from app import settings
from app.models import CVUpload, Education, Skill, UserSkill
from app.pipeline import cv_parser
from app.pipeline.cv_parser import CVError, extract_text, parse_cv, parse_cv_with_rules
from app.seed_career import load_career_data
from app.skills import find_skills_in_text, match_skill_name, search_skills
from tests.test_auth import auth_header, register

CV_TEXT = """Maya Whitfield
maya@example.com

Education
MSc Business Analytics | UCL School of Management | 2025 - 2026
Distinction expected
BSc Computer Science, University of Warwick, 2021 - 2024
First-class honours

Experience
Product Intern | Deliveroo, London | Jun 2024 - Sep 2024
- Cooperative team player on the marketplace squad; wrote SQL queries for supply analysis
Treasurer | Data Science Society | Sep 2023 - Present
- Led a team of 6 and organised events for 200 members

Skills
Python, SQL, Tableau, Stakeholder management

Languages
English (native), French (intermediate)

Interests
Bouldering, Film
"""


@pytest.fixture
def career(session):
    load_career_data(session)


def make_docx(text: str) -> bytes:
    doc = Document()
    for line in text.splitlines():
        doc.add_paragraph(line)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def make_pdf(text: str) -> bytes:
    """A tiny hand-made one-page PDF containing the text (enough for pypdf to read back)."""
    body = "BT /F1 12 Tf 50 700 Td (" + text.replace("(", "").replace(")", "") + ") Tj ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(body)} >>\nstream\n{body}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = "%PDF-1.4\n"
    offsets = []
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{obj}\nendobj\n"
    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{offset:010d} 00000 n \n" for offset in offsets)
    out += f"trailer\n<< /Root 1 0 R /Size {len(objects) + 1} >>\nstartxref\n{xref_at}\n%%EOF\n"
    return out.encode("latin-1")


def login(client):
    return auth_header(register(client).json()["token"])


# ---------- skills matching ----------

def test_synonyms_find_the_skill(session, career):
    teamwork = session.exec(select(Skill).where(Skill.name == "Teamwork")).one()
    assert match_skill_name(session, "cooperative") == teamwork.id  # the brief's example
    assert match_skill_name(session, "Team Player") == teamwork.id


def test_a_typo_still_finds_the_skill_but_nonsense_does_not(session, career):
    python = session.exec(select(Skill).where(Skill.name == "Python")).one()
    assert match_skill_name(session, "pyhton") == python.id
    assert match_skill_name(session, "basket weaving") is None


def test_scanning_text_matches_whole_words_only(session, career):
    found = {session.get(Skill, i).name for i in find_skills_in_text(session, "Wrote SQL and used mysqlx. A cooperative person.")}
    assert "SQL" in found and "Teamwork" in found
    assert find_skills_in_text(session, "mysqlx") == set()  # sql inside another word is not a match


def test_skill_search_finds_by_synonym(session, career):
    assert "Teamwork" in [s.name for s in search_skills(session, "collab")]


# ---------- reading CV files ----------

def test_rule_reader_finds_every_section():
    draft = parse_cv_with_rules(CV_TEXT)
    degrees = [e["degree"] for e in draft["education"]]
    assert "MSc Business Analytics" in degrees and "BSc Computer Science" in degrees
    msc = draft["education"][0]
    assert msc["institution"] == "UCL School of Management" and msc["end_year"] == 2026
    assert [e["grade"] for e in draft["education"]] == ["Distinction", "First-Class"]
    jobs = {e["title"]: e for e in draft["experience"]}
    assert jobs["Product Intern"]["organisation"] == "Deliveroo" and jobs["Product Intern"]["kind"] == "internship"
    assert jobs["Product Intern"]["start"] == "2024-06" and jobs["Product Intern"]["end"] == "2024-09"
    assert jobs["Treasurer"]["end"] is None and jobs["Treasurer"]["kind"] == "society"
    assert draft["skills"] == ["Python", "SQL", "Tableau", "Stakeholder management"]
    assert {"language": "French", "level": "conversational"} in draft["languages"]
    assert draft["interests"] == ["Bouldering", "Film"]


def test_docx_and_pdf_can_be_read():
    assert "Business Analytics" in extract_text("cv.docx", make_docx(CV_TEXT))
    assert "Hello CV reader this is a test of reading text" in extract_text("cv.pdf", make_pdf("Hello CV reader this is a test of reading text"))


@pytest.mark.parametrize("name,data,message", [
    ("cv.txt", b"x" * 100, "PDF or DOCX"),
    ("cv.pdf", b"", "empty"),
    ("cv.pdf", b"not really a pdf", "could not read"),
    ("cv.pdf", "BIG", "too big"),
], ids=["wrong-type", "empty", "garbage", "too-big"])
def test_bad_files_are_refused_with_a_clear_message(name, data, message):
    if data == "BIG":  # built here, not in the list above, so the long bytes do not end up in the test name
        data = b"x" * (5 * 1024 * 1024 + 1)
    with pytest.raises(CVError, match=message):
        extract_text(name, data)


def test_claude_is_used_when_live_and_rules_when_it_fails(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "fake-key")
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    claude_draft = {"education": [], "experience": [], "skills": ["Rust"], "languages": [], "interests": []}

    class FakeBlock:
        type = "text"
        text = __import__("json").dumps(claude_draft)

    class FakeClient:
        class messages:
            @staticmethod
            def create(**kwargs):
                return type("R", (), {"content": [FakeBlock()]})()

    assert parse_cv(CV_TEXT, lambda: FakeClient()) == (claude_draft, "claude")

    class BrokenClient:
        class messages:
            @staticmethod
            def create(**kwargs):
                raise RuntimeError("no internet")

    draft, how = parse_cv(CV_TEXT, lambda: BrokenClient())
    assert how == "rules" and draft["skills"][0] == "Python"  # falls back to the offline reader


def test_demo_mode_never_calls_claude(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "fake-key")
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    def explode():
        raise AssertionError("Claude must not be called in demo mode")

    assert parse_cv(CV_TEXT, explode)[1] == "rules"


# ---------- the routes ----------

def test_routes_need_a_login(client):
    assert client.get("/api/profile").status_code == 401
    assert client.post("/api/profile/cv", files={"file": ("cv.docx", b"x")}).status_code == 401


def test_upload_gives_a_draft_and_saves_nothing_to_the_profile(client, session, career):
    headers = login(client)
    response = client.post("/api/profile/cv", headers=headers, files={"file": ("cv.docx", make_docx(CV_TEXT))})
    assert response.status_code == 200
    draft = response.json()
    assert draft["read_by"] == "rules" and len(draft["education"]) == 2 and "Python" in draft["skills"]

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["education"] == [] and profile["skills"] == []  # still nothing saved
    record = session.exec(select(CVUpload)).one()
    assert record.status == "done" and record.filename == "cv.docx"
    assert not hasattr(record, "raw_text")  # the CV text is never stored


def test_unreadable_upload_is_422_and_recorded_as_failed(client, session):
    headers = login(client)
    response = client.post("/api/profile/cv", headers=headers, files={"file": ("cv.pdf", b"garbage")})
    assert response.status_code == 422 and "could not read" in response.json()["detail"]
    assert session.exec(select(CVUpload)).one().status == "failed"


def test_review_and_save_replaces_the_lists_and_clears_the_draft(client, session, career):
    headers = login(client)
    draft = client.post("/api/profile/cv", headers=headers, files={"file": ("cv.docx", make_docx(CV_TEXT))}).json()
    body = {k: draft[k] for k in ("education", "experience", "skills", "languages")}
    body["experience"] = body["experience"][:1]  # the student deletes one entry while reviewing

    saved = client.put("/api/profile", headers=headers, json=body)
    assert saved.status_code == 200
    profile = saved.json()
    assert len(profile["education"]) == 2 and len(profile["experience"]) == 1
    assert profile["onboarding_step"] == 2
    skills = {s["name"]: s for s in profile["skills"]}
    assert skills["Python"]["source"] == "manual"
    assert skills["Teamwork"]["source"] == "detected"  # "Cooperative team player" was in a job description
    assert skills["Postgraduate degree"]["category"] == "academics"  # from "MSc"
    assert skills["Strong grades (2:1 or above)"]["source"] == "detected"  # from "Distinction"

    record = session.exec(select(CVUpload)).one()
    assert record.parsed_json == {} and record.approved_at is not None  # the draft is gone once approved

    # Saving again with less really removes things.
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": [], "languages": []})
    assert session.exec(select(Education)).all() == []
    assert session.exec(select(UserSkill)).all() == []


def test_manual_entry_with_an_unknown_skill_keeps_it_as_a_custom_skill(client, session, career):
    headers = login(client)
    body = {"education": [], "experience": [], "skills": ["Cooperative", "Underwater welding"], "languages": []}
    skills = {s["name"]: s for s in client.put("/api/profile", headers=headers, json=body).json()["skills"]}
    assert "Teamwork" in skills and skills["Underwater welding"]["category"] == "skills"


def test_bad_profile_data_is_rejected(client):
    headers = login(client)
    bad_date = {"experience": [{"title": "x", "organisation": "y", "start": "June 2024"}]}
    assert client.put("/api/profile", headers=headers, json=bad_date).status_code == 422
    bad_kind = {"experience": [{"title": "x", "organisation": "y", "kind": "wizard"}]}
    assert client.put("/api/profile", headers=headers, json=bad_kind).status_code == 422


def test_details_only_change_what_is_sent(client):
    headers = login(client)
    response = client.put("/api/profile/details", headers=headers, json={"bio": "Hi", "theme": "dark", "needs_visa_sponsorship": True})
    profile = response.json()
    assert profile["bio"] == "Hi" and profile["theme"] == "dark" and profile["needs_visa_sponsorship"] is True
    assert client.put("/api/profile/details", headers=headers, json={"hometown": "Leeds"}).json()["bio"] == "Hi"
    cleared = client.put("/api/profile/details", headers=headers, json={"bio": None}).json()
    assert cleared["bio"] is None and cleared["hometown"] == "Leeds"


def test_details_validation(client):
    headers = login(client)
    assert client.put("/api/profile/details", headers=headers, json={"theme": "neon"}).status_code == 422
    assert client.put("/api/profile/details", headers=headers, json={"avatar_url": "javascript:alert(1)"}).status_code == 422
    assert client.put("/api/profile/details", headers=headers, json={"hidden_fields": ["password"]}).status_code == 422
    ok = client.put("/api/profile/details", headers=headers, json={"hidden_fields": ["zodiac", "hobbies", "zodiac"]})
    assert ok.json()["hidden_fields"] == ["hobbies", "zodiac"]


def test_big_five_scores_with_reverse_items(client, session):
    headers = login(client)
    questions = client.get("/api/profile/personality", headers=headers).json()
    assert len(questions["items"]) == 10 and "trait" not in questions["items"][0] and questions["result"] is None

    # Agree strongly with everything: reversed statements then count as 1, so each trait is (5 + 1)/2 = 3 or 5.
    result = client.put("/api/profile/personality", headers=headers, json={"answers": {i["id"]: 5 for i in questions["items"]}}).json()["result"]
    assert result["openness"] == 3.0 and result["extraversion"] == 3.0
    assert result["neuroticism"] == 3.0 and result["conscientiousness"] == 3.0 and result["agreeableness"] == 3.0
    # Outgoing (5) and not reserved (1 -> reversed to 5) gives a top extraversion score.
    answers = {i["id"]: 3 for i in questions["items"]}
    answers.update({"bfi6": 5, "bfi1": 1})
    assert client.put("/api/profile/personality", headers=headers, json={"answers": answers}).json()["result"]["extraversion"] == 5.0
    assert client.get("/api/profile", headers=headers).json()["big_five"]["extraversion"] == 5.0


def test_big_five_needs_all_ten_answers_in_range(client):
    headers = login(client)
    assert client.put("/api/profile/personality", headers=headers, json={"answers": {"bfi1": 3}}).status_code == 422
    all_ids = [f"bfi{n}" for n in range(1, 11)]
    assert client.put("/api/profile/personality", headers=headers, json={"answers": {i: 9 for i in all_ids}}).status_code == 422
    assert client.put("/api/profile/personality", headers=headers, json={"answers": {**{i: 3 for i in all_ids}, "nope": 3}}).status_code == 422


def test_hobbies_replace_and_are_limited(client):
    headers = login(client)
    assert client.put("/api/profile/hobbies", headers=headers, json={"tag_ids": [2, 3]}).json()["hobbies"]
    assert len(client.put("/api/profile/hobbies", headers=headers, json={"tag_ids": [4]}).json()["hobbies"]) == 1
    assert client.put("/api/profile/hobbies", headers=headers, json={"tag_ids": [99999]}).status_code == 422
    assert client.put("/api/profile/hobbies", headers=headers, json={"tag_ids": list(range(1, 10))}).status_code == 422


def test_skill_search_route(client, career):
    headers = login(client)
    names = [s["name"] for s in client.get("/api/profile/skills/search", params={"q": "collab"}, headers=headers).json()]
    assert "Teamwork" in names
    assert client.get("/api/profile/skills/search", params={"q": ""}, headers=headers).json() == []
