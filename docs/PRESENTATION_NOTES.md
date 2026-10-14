# LARP: what we built, and what to know for the presentation

Written from the code as it stands on 2026-10-14. Every number below can be changed in the file named next to it.

## 1. What LARP is, in one breath

A UCL student fills in a 7-screen questionnaire. LARP then (a) ranks other students by how well they fit, (b) puts them in a group of 3 to 6 with a suggested first event, (c) ranks career and social events and venues near UCL Bloomsbury and Canary Wharf, and (d) offers "LinkedIn Max": one person at a time, with their LinkedIn link, so the student connects themselves.

## 2. Systems used

| Part | Technology | Job |
|---|---|---|
| Front end | React 19, Vite, Tailwind CSS 4, React Router | The screens in the browser (`frontend/`) |
| Back end | Python 3.11, FastAPI, Uvicorn | The rules and the API (`backend/app/`) |
| Database | SQLite (one file, `backend/larp.db`) via SQLModel | Stores everything. Rebuilt by `reset_db` |
| Passwords | bcrypt | Stores a scrambled hash, never the password |
| Login | JWT token (PyJWT, HS256), valid 24 hours | Proves who you are on each request |
| Scraping | `requests` + BeautifulSoup | Reads the Students' Union UCL event pages |
| AI | Anthropic API (Claude) | Optional: web search for events, and tagging events. **Off in demo mode** |
| Tests | pytest (186 passing) | Proves the rules still work |

The front end talks to the back end through `/api/...`. In development Vite forwards those calls to port 8000.

## 3. Is any outside API used?

- **Anthropic API (Claude)** is the only paid outside API, and only in two places:
  1. *Web search* (`pipeline/providers/anthropic_web_search.py`): Claude's built-in web search finds candidate event pages. Model set by `EVENT_SEARCH_MODEL`.
  2. *Event tagging* (`pipeline/claude_tagger.py`): a cheaper model (`EVENT_TAG_MODEL`) tags an event only when plain keywords could not decide. Each answer is cached so an event is never asked about twice.
- **Both need `ANTHROPIC_API_KEY` in `.env` and are skipped when `DEMO_MODE=true` or the key is empty.** Honest status: the key has not been added yet, so the live search has never run for real. The events you see in the demo come from the hand-checked file.
- **No LinkedIn API.** We never contact LinkedIn. The app shows a link and the student opens it and connects themselves.
- **No maps, email or payment services.** Nothing is sent out by the app.

## 4. The database: tables and data types

SQLite, defined in `backend/app/models.py`. "Text" fields with fixed choices are checked when a student registers.

| Table | Holds | Key columns (type) |
|---|---|---|
| `user` | One row per student | `id` (int), `name` (text), `ucl_email` (text, unique), `password_hash` (text), `linkedin_url` (text), `campus` (main / canary / both), `travel_ok` (true/false), `alcohol_pref` (drinks / bars_no_drink / avoid), `goal` (career / social / both), `course` (text), `year` (1 to 5, 5 = postgrad), `experience_industry` (list), `experience_note` (text), `availability` (list), `linkedin_max_optin` (true/false), `auto_pair_opt_in` (true/false), `created_at` (date-time) |
| `tag` | The shared interest list (37 tags) | `id`, `name` (unique), `category`, `subgroup` |
| `usertag` | Student to tag (up to 8 each) | `user_id`, `tag_id` |
| `userneed` | What a student looks for or offers | `user_id`, `kind` (looking_for / offers), `skill` (text) |
| `event` | A dated event | `title`, `description`, `start_time`, `end_time` (date-time, stored as UTC), `location_name`, `area` (main / canary / other), `event_type` (career / social), `alcohol_role` (central / optional / none), `source`, `source_url` (unique, stops duplicates), `image_url`, `updated_at` |
| `eventtag` | Event to tag (up to 3 each) | `event_id`, `tag_id` |
| `venue` | An always-available place (café, bar, arcade) | `name`, `category`, `area`, `address`, `url`, `alcohol_role`, `verified_on` |
| `venuetag` | Venue to tag (up to 3 each) | `venue_id`, `tag_id` |
| `group` / `groupmember` | An auto-paired group and its members | `group.first_event_id`, `groupmember.group_id`, `groupmember.user_id` |
| `matchcache` | Each student's saved top-20 matches | `user_id`, `other_user_id`, `score` (0 to 1), `reason` (text) |
| `classificationcache` | Claude's saved answers about events | `source_url`, `text_hash`, `answer` (JSON) |

**Tags** have a tree: 4 categories (Academic and professional, Sport, Hobbies, Just here for fun) containing 12 subgroups (for example Tech, Racquet sports, Games and strategy) containing 37 tags (for example `chess`, `padel`, `finance`). Students and events use the same tags, which is what lets us compare them. Source: `backend/app/seed/tags.json`.

You can look at all of this live at `http://localhost:8000/dev/tables` (read-only, hides password hashes, only works on the same computer).

## 5. Account generation and information storage

- **Registering** (`POST /api/register`): the questionnaire answers plus name, email and a password (8 to 72 characters) are sent together. The back end checks every field (allowed values, lengths, max 8 tags), hashes the password with bcrypt, saves the user, their tags and needs, then updates the match lists and returns a login token.
- **UCL email rule:** real use requires an `@ucl.ac.uk` address. For the demo, `REQUIRE_UCL_EMAIL=false` in `.env` lets any email work. Tests force the real rule on.
- **Logging in** (`POST /api/login`): checks the password against the hash and returns a token. The front end keeps the token in the browser's `localStorage` and sends it on every request. Tokens last 24 hours (`TOKEN_HOURS` in `settings.py`).
- **Questionnaire answers before sign-up** live only in the browser tab's `sessionStorage` until the student registers. Closing the tab clears them.
- **LinkedIn links** are optional, only shown to others if the student opts in, and must start with `https://linkedin.com/in/`, `https://www.linkedin.com/in/` or `https://uk.linkedin.com/in/` (blocks links like `javascript:`).
- **What other students never see:** email, password hash, alcohol preference. Groups and match lists show name, course, year and campus only. Privacy tests (`test_privacy.py`) check this on every endpoint.
- **Not built yet (say so if asked):** deleting an account. That is a GDPR item for after the hackathon.

## 6. Fake student profiles (seed data)

- 32 invented students in `backend/app/seed/profiles.json`. Each has campus, course, year, goal, alcohol preference, 3 to 4 interest tags, things they look for and offer, availability and (for 21 of them) an opted-in placeholder LinkedIn link.
- Emails look like `ava.test01@ucl.ac.uk`. **All seed accounts use the password `demo1234`**, stored hashed like any real password. `seed_profiles.py` loads them and is safe to run twice.
- Two demo accounts: `demo.main@ucl.ac.uk` (main campus, career) and `demo.canary@ucl.ac.uk` (Canary Wharf, social).
- The LinkedIn links are placeholders (`.../in/placeholder-NN`), so on LinkedIn they show "profile not found". That is expected.
- Everything is reset by `python -m app.reset_db` (`start-demo.bat` does this), so the demo always starts clean. It deletes the database and reloads tags, students, match lists, events and venues.

## 7. Matching students (people to people)

File: `backend/app/matching.py`. Score from 0 to 1:

`score = 0.40 x Interests + 0.20 x Goals + 0.20 x Course + 0.10 x Experience + 0.10 x Vibe + campus bonus`

| Part | Rule |
|---|---|
| Interests (0.40) | For each of my tags, find its best match among theirs: same tag = 1.0, same subgroup = 0.5, same category = 0.2, else 0. Average, do it both ways round, and average the two. |
| Goals (0.20) | Same goal 1.0. One of them "both" 0.7. Career against social 0.2. |
| Course (0.20) | Same course 1.0. Same field 0.5 (fields worked out from keywords: tech, business and quant, law and society, health and science). Otherwise 0.1. |
| Experience (0.10) | Average of year score (same 1.0, one apart 0.6, further 0.3) and industry score (shared 1.0, both none 0.8, one has some 0.4, different 0.3). |
| Vibe (0.10) | Alcohol preference: same 1.0, neighbours 0.6, "drinks" against "avoid" 0.3. |
| Campus bonus | +0.05 if they share a campus and at least one is not happy to travel. |

Properties worth saying out loud:
- **Symmetrical:** A's score for B always equals B's for A.
- **Nobody is filtered out.** Cross-campus pairs rank like anyone else. The parts only change the order.
- **Every match has a reason** built from a template (not AI-generated text), for example "You both like chess and finance, and you are both here for career events." It names up to two things in common.
- **Speed:** each student's top 20 is saved in `matchcache` and updated when someone joins, so lists load instantly.

## 8. Groups (auto-pairing)

File: `backend/app/groups.py`. A greedy method:
1. Already in a group: nothing changes.
2. Otherwise join the best existing group with room if the student's **average score against its members is at least 0.35**.
3. Otherwise start a new group: begin with the student, then keep adding whoever fits the members so far best, until the group has **5 people** or nobody averages 0.35.
4. Fewer than **3** people means no group yet, and the student waits.

Settings: `GROUP_TARGET = 5`, `GROUP_MAX = 6`, `GROUP_MIN = 3`, `THRESHOLD = 0.35`. The group page also shows interests that at least two members share.

**First event for the group:** the event with the best average score across members, where the strictest alcohol preference in the group applies to everyone and every member can reach it (it is on their campus or they are happy to travel).

## 9. Ranking events and venues ("nearby" logic)

File: `backend/app/events.py`.

`event score = 0.45 x interest + 0.20 x goal + 0.20 x proximity + 0.15 x timing`, then the alcohol rule is applied.
`venue score = 0.50 x interest + 0.30 x proximity + 0.20 x goal` (venues count as social, and have no timing).

- **Interest:** the event's tags (up to 3) against the student's, using the same same-tag / subgroup / category scale as matching.
- **Goal:** 1.0 if the event type is what the student wants (or they want both), else 0.3.
- **Proximity ("nearby"):** every event and venue has an **area**: `main` (UCL Bloomsbury), `canary` (Canary Wharf) or `other`. In the student's campus area = 1.0. Elsewhere 0.8 if they are happy to travel, otherwise 0.4. There is no GPS or maps API; "near" means "in one of our two areas".
- **Timing:** within 7 days 1.0, 8 to 14 days 0.8, 15 to 28 days 0.5, later or undated 0.3.
- **Alcohol rule:** "drinks" sees everything. "bars_no_drink" keeps bar events but their score is x0.7 where alcohol is central. "avoid" has events where alcohol is central **hidden** entirely, and x0.85 where it is optional.
- Ended events are never shown. Students whose goal is "both" get career and social mixed alternately.
- Each result has a one-line reason, for example "Matches your interest in chess. In your campus area. Tomorrow."

**How an event's area is worked out:** `pipeline/normalise.py` looks for words in the place name. Canary words (`canary wharf`, `e14`, `docklands`...) are checked first, then UCL words (`bloomsbury`, `wc1`, `gower street`, `euston`...). "UCL East" counts as other. Nothing recognised means `other`.

## 10. Where events come from (the pipeline)

Folder: `backend/app/pipeline/`. Full plain-English version: `docs/EVENT_SEARCH_LOGIC.md`. Three sources, run one at a time:

| Source | What it does |
|---|---|
| `curated_file` | Reads `seed/events_curated.json`: 58 events a person checked by hand, each with a date, link and note on how it was verified. **This is what the demo uses.** Always runs last, as a safety net. |
| `su_whats_on` | Scrapes the Students' Union UCL listing pages (tags: careers, free, wellbeing, fitness, beginner-friendly), 25 events per page. No headless browser needed. |
| `category_sweep` | The web search: for each of 2 areas x 12 categories it builds a query, Claude's web search returns up to 5 candidate pages, junk is dropped (list pages, duplicates), then **every page is opened and verified** (see below). |

**Verification of a found page** (`verify.py`): page loads and robots.txt allows it; it has schema.org Event data (so the date is a fact, not a guess); it has a title and a start date; the date is inside the window (`EVENT_WINDOW_DAYS`, default 30); it is not online-only; the place is in or near UCL Bloomsbury or Canary Wharf. Fail any check and it is dropped with a reason.

**Clean-up for every event** (`runner.py`, `classify.py`): tidy the title and times (converted to London time, saved as UTC); work out the area; decide career vs social by counting career and social words; decide alcohol role (central / optional / none) from keywords; pick up to 3 tags using a points system (title hit = 2 points, description hit = 1, a tag needs 2 or more). **Only if the keywords cannot decide** does Claude tag it (cheap model, answer limited to our tag list, cached). Events already over are never saved, and ended events are deleted on each refresh.

**Safety rules (good to say in Q&A):**
- If any source fails, it is logged and skipped. **Saved events are never deleted because of a failure.**
- Scraping is polite (`pipeline/web.py`): identifies itself with a contact set in `SCRAPER_CONTACT`, obeys robots.txt, waits at least 2 seconds between requests to the same site, reads event information only and never personal data.
- Live scraping and Claude calls only run when you ask (`python -m app.pipeline --live`) **and** `DEMO_MODE=false`. In demo mode nothing leaves the computer.

**Venues:** 40 hand-checked places (cafés, pubs, arcades...) in `seed/venues.json`, always available, each with area, alcohol role and tags.

**Honest gaps:** Canary Wharf has no career events right now (filter career + Canary Wharf shows empty; use "All areas" on stage). The Anthropic key and the Students' Union live-scrape go-ahead are still pending.

## 11. All the back-end logic can be adjusted

Nothing is hard-wired. Almost every behaviour is a named number or a plain list at the top of a file, with a comment, and a test suite to catch mistakes.

| To change... | Edit | What |
|---|---|---|
| How much each match part counts | `matching.py` | `W_INTERESTS`, `W_GOALS`, `W_COURSE`, `W_EXPERIENCE`, `W_VIBE`, `CAMPUS_BONUS` |
| How similar two tags are | `matching.py` | `TAG_SAME`, `TAG_SAME_SUBGROUP`, `TAG_SAME_CATEGORY` |
| What counts as "same field" | `matching.py` | `COURSE_FIELDS` keyword lists |
| Group size and strictness | `groups.py` | `GROUP_TARGET`, `GROUP_MAX`, `GROUP_MIN`, `THRESHOLD` |
| Event and venue weights | `events.py` | `EW_*`, `VW_*`, `GOAL_MISMATCH`, `PROXIMITY_*` |
| Alcohol rules | `events.py` | the `ALCOHOL_RULE` table |
| Event timing buckets | `events.py` | `timing_part` |
| Which places count as UCL / Canary Wharf | `pipeline/normalise.py` | `CANARY_WORDS`, `MAIN_WORDS` |
| Where and what to search | `pipeline/search_plan.py` | `AREAS`, `CATEGORIES`, query words |
| Which Students' Union pages are read | `pipeline/su_whats_on.py` | `LISTING_TAGS`, `MAX_PAGES_PER_TAG` |
| Keywords that tag / classify events | `pipeline/classify.py` | `TAG_SYNONYMS`, career / social / alcohol word lists, `KEEP_AT`, `MAX_TAGS` |
| Search strategy / engine / models | `.env` | `EVENT_FINDER`, `EVENT_SEARCH_PROVIDER`, `EVENT_SEARCH_MODEL`, `EVENT_TAG_MODEL` |
| How far ahead events are collected | `.env` | `EVENT_WINDOW_DAYS` |
| Demo vs live | `.env` | `DEMO_MODE`, `REQUIRE_UCL_EMAIL`, `ANTHROPIC_API_KEY` |
| Login length | `settings.py` | `TOKEN_HOURS` |
| The interest tag list | `seed/tags.json` | add or rename tags, then reset the database |
| Fake students, events, venues | `seed/profiles.json`, `events_curated.json`, `venues.json` | plain JSON |

New search strategies and search engines plug in without touching the rest: `pipeline/finders/` and `pipeline/providers/` register themselves by name, then you switch with one `.env` line.

After changing logic: run `pytest` in `backend/` (should say all pass), then `start-demo.bat` to reset and try it. If a weight changes the ranking on purpose, a test that asserts the old order may need updating.

## 12. Likely questions and short answers

- **Is this using real student data?** No. 32 invented students. Real use needs UCL emails and consent.
- **How do you protect data?** Hashed passwords, signed tokens, LinkedIn shared only if the student opts in, email and drinking preference never shown to others, link validation, privacy tests.
- **Does it automate LinkedIn?** No. No API, no auto-requests. The student clicks Open, connects themselves, then Next.
- **How do you know the events are real?** The demo events were checked by hand. In live mode every found page is opened and must carry a real, dated, in-person event inside the window and near our areas.
- **What if scraping or AI breaks?** Each source fails on its own, saved events are never deleted, and the hand-checked file is always the fallback. The app also runs fully offline in demo mode.
- **Is the match score a black box?** No. It is five readable parts with weights, and every match shows a plain-English reason.
- **What about other universities or cities?** Change `AREAS`, the place words and the seed files; the logic does not change.
