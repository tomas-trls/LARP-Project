# LARP back end: re-plan for the new screens

## Context
The current back end (FastAPI + SQLModel/SQLite in `backend/app/`) was built for an events-and-groups product: a questionnaire gives interest tags, tags give matches and groups, and groups get events. The new screens (`Project LARP UI Design.zip`) and the new README change the product. A student now builds a profile (CV or manual), picks a career route, and sees how close they are to that role in 5 categories. Every other tab (Home, Opportunities, People, Societies, Messages, Profile) is ranked against that route.

The Future Me profile and Career Path are the new core. Most existing tables and code can be reused for the social and events side. Hackathon demo is **Fri 16 Oct, 4pm**. Today is Thu 15 Oct, so the phasing matters.

Decisions made with you: job listings come from scraping public job sites; fit scores come from a keyword and synonym table with Claude as a cached fallback; the build runs career engine first, then the tabs; messages are stored in tables and polled.

---

## 0. Updates after your review
- **Back end only.** We do not touch `frontend/`.
- **Team docs.** The plan and the table diagram go into the repo so the group can read them: `docs/BACKEND_REPLAN.md` (this plan, tidied) and `docs/DATABASE_DIAGRAM.md` (a Mermaid entity-relationship diagram that GitHub renders, plus a one-line description per table). Both are updated at the end of every phase.
- **Table viewer.** `routes_dev.py` (`/dev/tables`) is updated so it lists every new table and drops the removed ones. It must keep working after each phase.
- **Tab naming.** *Opportunities* = career events (UCL Careers, employer talks, fairs) **plus** scraped jobs, with an Events / Jobs filter. *Societies* = the society directory **plus** an events feed of all society events. `Event` gets `category` (opportunity / social / society) and `society_id`; Home reads the same table.
- **Separate pushes.** One git branch and one push per section (listed in section 5), each with its own tests passing and its docs updated, so the group can follow each stage. I will not push without your go-ahead for each one.

- **Design review (15 Oct).** `docs/DESIGN_DECISIONS.md` overrides this plan where they disagree: free-text roles with a 20-advert minimum and a weekly cache, CV deleted after extraction, Big Five instead of statements, book-first groups of 3-5, visa flag, report/block, alumni handover. The table changes it caused are listed at the end of `docs/DATABASE_DIAGRAM.md`.

## 1. What happens to the existing tables

| Table | Verdict | Why |
|---|---|---|
| `User` | **Change** | Drop `goal`, `experience_industry`, `experience_note`, `availability`, `linkedin_max_optin`. Education and experience now live in their own tables. Add profile and settings columns (see 2a). |
| `Tag`, `UserTag` | **Keep** | They become the hobbies list ("What are you into outside of work?"). Used for social matching only. |
| `Event`, `EventTag` | **Keep + extend** | Home needs a category (careers / social / societies), an optional society, and an employer. |
| `Venue`, `VenueTag` | **Park** | No screen shows venues. Leave them in place, build nothing new on them. |
| `ClassificationCache` | **Keep** | Same idea is reused for the Claude skill extraction cache. |
| `Group`, `GroupMember` | **Keep + extend** | Add `kind` (event pair / auto group) and `event_id`. They back the event pairing and group chats. |
| `MatchCache` | **Keep + extend** | Add `kind` (career / social) and `starter` (the Claude conversation starter). |
| `UserNeed` | **Drop** | "Looking for / offers" appears on no screen. |
| `routes_linkedin.py` and the LinkedIn Max feature | **Retire** | Not in the new screens. Keep `linkedin_url` on the profile only. |

## 2. New tables, grouped by feature

### 2a. Profile (CV or manual)
- `Education` (user_id, degree, institution, start, end, grade)
- `Experience` (user_id, title, organisation, location, start, end, description, kind: job / internship / society / project)
- `UserSkill` (user_id, skill_id, source: cv / manual)
- `UserLanguage` (user_id, language, level)
- `CVUpload` (user_id, filename, raw_text, status: parsing / done / failed, parsed_json). Keep the extracted text, not the file, to limit private data held.
- `PersonalityAnswer` (user_id, statement_id, value) plus result columns on `User` (`personality_type`, e.g. ambivert).
- New `User` columns: `bio`, `hometown`, `relationship_status`, `zodiac`, `profile_note`, `avatar_url`, `is_alumni`, `grad_year`, `headline`, `theme`, `connection_style` (swipe / request), `onboarding_step`.
- `EmailVerification` (email, code_hash, expires_at). Sign-up sends a code. Real SSO needs UCL approval, so it is shown but not built.

### 2b. Career engine (the core)
- `Skill` (id, name, category: academics / skills / teamwork / experience / leadership). This is the single canonical skill list.
- `SkillSynonym` (term, skill_id). Maps "cooperative", "collaborated" and similar words to canonical skills, so the CV words can match.
- `Role` (id, name, sector, alumni_count, median_start_salary, description). Seeded from the ~200-role list in the screens (`Product Manager|Tech|1240|48;...`). This is the searchable "career paths" list.
- `RoleSkill` (role_id, skill_id, importance 0–1). The role's requirement list.
- `WorkValue` (id, title, description). Seeded from the UCL Careers values activity docx (about 40 values; users can add their own).
- `UserWorkValue` (user_id, work_value_id, rank). Changed to **pick the top 3–5**, not a 1–5 rating.
- `RoleWorkValue` (role_id, work_value_id, strength). Tags each role with the values it offers.
- `UserRoute` (id, user_id, role_id or custom_title, source: chosen / suggested, rationale, is_active, fit_pct). Users can save several and switch.
- `RouteScore` (route_id, category, user_score, benchmark_score, matched_skills JSON, missing_skills JSON). One row per category (5 per route).

### 2c. Jobs (Opportunities)
- `Job` (title, company, location, work_mode, salary_text, summary, source, source_url unique, posted_on, closes_on, scraped_at, role_id nullable, raw_text)
- `JobSkill` (job_id, skill_id), filled by the same skill extractor. Aggregating `JobSkill` by role is how `RoleSkill.importance` gets built ("communication: 82% of adverts").
- `JobSave` (user_id, job_id, status: saved / applied)
- `Notification` (see 2f), used for "new roles on a saved route".

### 2d. People (Networking, Social, Connections)
- `Connection` (user_id, other_user_id, kind: career / social, status: pending / accepted / declined, requested_by, note). Mutual accept is what unlocks messaging.
- `Follow` (user_id, followed_user_id), for the "follow people who share hobbies" list.
- `EventPair` (event_id, user_id, partner_id, status), for "Pair up with Marco" on a Students' Union event.
- Matching: career matching compares route, skills and programme. Social matching compares personality and hobbies only, never career data (README privacy rule).

### 2e. Societies
- `Society` (name, category incl. new "Academic", tagline, description, membership_price, membership_url, member_count)
- `SocietyTag` (society_id, tag_id), used for fit ranking
- `SocietyMember` (society_id, user_id, role: member / committee)
- `SocietyRole` (society_id, title, description, counts_as_category) – student rep roles. `counts_as_category` is "leadership" in the screens' example.
- `SocietyRoleApplication` (role_id, user_id, status)
- `SocietyAnnouncement` (society_id, title, body, members_only)
- Add `society_id` to `Event`.

### 2f. Messages, notifications, profile
- `Conversation` (kind: direct / group / society / event / system, title, group_id, society_id, event_id)
- `ConversationMember` (conversation_id, user_id, last_read_at, muted)
- `Message` (conversation_id, sender_id, body, created_at)
- `Notification` (user_id, kind: match / message / event / role, title, body, link, read_at)
- `NotificationPref` (user_id, kind, enabled)
- `Badge` (code, name, how_earned) and `UserBadge` (user_id, badge_code). Profile stats (events attended, connections, societies) are counted from `EventPair`, `Connection` and `SocietyMember`. They are not stored.
- `EventSave` (user_id, event_id, status: saved / going / attended), feeds Home and the profile stats.

## 3. How the tables connect
```
User ─┬─ Education / Experience / UserSkill ── Skill ── SkillSynonym
      │                                          │
      ├─ UserWorkValue ── WorkValue ── RoleWorkValue ──┐
      │                                                ▼
      └─ UserRoute ──────────────────────────────────► Role ── RoleSkill ── Skill
              │                                         ▲
              └─ RouteScore (5 rows)                    │ aggregated from
                                                  Job ── JobSkill ── Skill
User ── Connection / Follow / EventPair ── User      Event ── Society ── SocietyMember ── User
Conversation ── ConversationMember / Message          Society ── SocietyRole ── Application
```
`Skill` is the hub. CV text, role requirements, job adverts and society roles all resolve to the same skill rows, which is what makes the matching and the fit scores comparable.

## 4. Fit-score logic (route page, 5 categories)
1. **Normalise** the user's CV/manual entries to `Skill` rows: exact name, then `SkillSynonym`, then a simple fuzzy match. Anything still unmatched goes to Claude once and the answer is cached in `SkillSynonym`.
2. **Per category**: `score = sum(importance of the role's skills the user has) / sum(importance of all the role's skills in that category) × 100`. Five leadership skills required and four held gives 80.
3. **Academics** use degree level, subject and grade against the role's academic skills. **Experience** uses roles, internships and years.
4. Store 5 `RouteScore` rows, with `matched_skills` and `missing_skills` driving the gap summary. `fit_pct` is the average. The alumni benchmark comes from `RoleSkill`, with seed values for the demo.
5. Route suggestions: top roles ranked by profile fit plus overlap between the user's top work values and `RoleWorkValue`. Claude writes the one-line rationale (cached; demo mode uses saved text).

## 5. Phases and pushes (each one demoable, tested, documented, and pushed on its own)
Push order: **P0 docs** → **P1a tables + seeds** → **P1b profile + CV** → **P1c career engine** → **P2a opportunities (events + jobs)** → **P2b home** → **P2c people** → **P3a societies** → **P3b messages + notifications** → **P3c profile summary**. Each push updates `docs/DATABASE_DIAGRAM.md` and `/dev/tables`.

**P0 – Docs push:** this plan and the diagram committed to `docs/` so the group sees the design first.

**Phase 1 – Career engine (build first, tonight)**
1. Migrations/reset: new tables, drop `UserNeed`, update `reset_db.py` and seeds (`roles.json`, `skills.json`, `synonyms.json`, `work_values.json`).
2. Profile: `POST /api/cv` (upload PDF/DOCX, text extraction with `pypdf`/`python-docx`, Claude extraction, demo fallback), `GET/PUT /api/profile` (education, experience, skills, languages), personality and hobbies endpoints.
3. Career: `GET /api/roles?q=`, `GET /api/work-values`, `PUT /api/me/work-values`, `POST /api/routes/suggest`, `POST/GET/DELETE /api/routes`, `PUT /api/routes/{id}/activate`, `GET /api/routes/{id}/gap`.
4. Tests: synonym matching, the 80% leadership example, suggestion ranking, CV parse (fixture CV, no live Claude).

**Phase 2 – Home, Opportunities, People**
1. Job scraper plus seeded fallback, `GET /api/jobs` ranked by active route with a "why" line, save/apply, `Notification` on new roles.
2. `GET /api/home` (action of the day, featured event, filtered feed with reasons), extend event scoring to use route gaps.
3. People: `GET /api/people?kind=career|social`, connection request/accept, follow, event pairing, `GET /api/connections`.

**Phase 3 – Societies, Messages, Profile**
1. Societies list, ranked by fit, join, rep-role apply, announcements.
2. Conversations, messages (front end polls `GET /api/conversations/{id}/messages?after=`), unread counts, notification prefs, Claude conversation starters.
3. `GET /api/profile/summary` (stats, badges, active route gap, saved routes), settings.

## 6. Risks and rules to keep
- **Job scraping:** you chose to scrape. I will reuse `PoliteFetcher` in `app/pipeline/web.py` (robots.txt check, 2s delay, named User-Agent). **CLAUDE.md says never scrape LinkedIn, so LinkedIn is excluded.** Indeed's terms and robots.txt also forbid it, so each site is only enabled if its robots.txt allows the page, and the seeded job file stays as the guaranteed demo fallback. Expect to try gov.uk Find a Job or graduate boards; I will check robots.txt first.
- **Time:** Phase 1 is the realistic target before Fri 4pm; Phases 2–3 are likely beyond it, so the seeded versions of Phase 2 endpoints come first.
- Never auto-send LinkedIn requests; passwords stay bcrypt hashes; secrets stay in `.env`; keep `DEMO_MODE` fallbacks for every Claude call.
- SQLite resets on Render restart, so seeds must load on startup.
- New packages: `python-multipart`, `pypdf`, `python-docx`.

## 7. Files touched
- `backend/app/models.py` (all table changes), `schemas.py`, `main.py` (register new routers), `reset_db.py`, `seed_*.py`
- New: `routes_profile.py`, `routes_career.py`, `routes_jobs.py`, `routes_people.py`, `routes_societies.py`, `routes_messages.py`, `fit.py` (scoring), `skills.py` (normaliser), `pipeline/cv_parser.py`, `pipeline/job_scraper.py`
- Reuse: `auth.get_current_user`, `matching.py` scoring helpers for social matches, `match_cache.py`, `pipeline/web.py` `PoliteFetcher`, `pipeline/claude_tagger.py` client and cache pattern, `settings.DEMO_MODE`
- Seeds from the zip: `LARP App Screens.dc.html` (roles, areas), `Career values activity.docx` (values)

## 8. Verification
- `py -m pytest` from `backend/` after each phase; new tests per feature as listed.
- Run `uvicorn app.main:app --reload`, walk the journey in `/docs`: register → upload fixture CV → review profile → set values → suggest routes → open `/gap` (5 scores) → jobs → people → societies → messages.
- Run with `DEMO_MODE=true` to prove no live Claude or scraping is needed.

## Build log

### P1b – Profile and CV (done)
All routes need a login token and start with `/api/profile`.

| Route | What it does |
|---|---|
| `GET /api/profile` | The whole profile: education, experience, skills, languages, hobbies, Big Five, settings |
| `POST /api/profile/cv` | Upload a PDF or DOCX (max 5 MB). Returns a **draft**; nothing is saved to the profile. The file and its text are dropped, never stored |
| `PUT /api/profile` | Save the reviewed profile (from the draft, or typed by hand). Replaces education, experience, skills and languages. Skills hidden in degrees and job descriptions are added as "detected" |
| `PUT /api/profile/details` | Bio, hometown, theme, visa setting, hidden fields, connection style, onboarding step |
| `GET` / `PUT /api/profile/personality` | The 10 optional Big Five statements and scoring |
| `PUT /api/profile/hobbies` | Up to 8 interest tags (social matching only) |
| `GET /api/profile/skills/search?q=` | Skill suggestions as the student types (matches synonyms) |

How the CV is read: with an API key and `DEMO_MODE=false` Claude reads it (`CV_MODEL` in `.env`, default `claude-sonnet-5-5`). Otherwise, or if Claude fails, a simple offline reader looks for headings such as Education and Experience.

Skill matching (`app/skills.py`): exact name or synonym, then a whole-word scan of longer text, then a fuzzy match for typos. A skill nobody has heard of is kept as a custom skill in the "skills" category.


### P1c – Career engine (done)
Routes start with `/api`. Everything needs a login token except role search.

| Route | What it does |
|---|---|
| `GET /roles?q=` | Search the career paths by name, sector or a known alternative title. No search text gives the most popular roles |
| `POST /roles/resolve` | Turn any typed title into one of our roles (exact, alias, close spelling, Claude if live, else a new custom role) |
| `GET` / `POST` / `PUT /work-values` | The UCL values list; add a value of your own; pick your top 3 to 5 in order |
| `POST /routes/suggest` | 1 to 5 suggested roles from the profile (60%) and work values (40%), or roles adjacent to a chosen role. Each has a "why" |
| `GET` / `POST /routes` | List saved routes (with average fit) / save one. The first becomes active; up to 8 |
| `PUT /routes/{id}/activate`, `DELETE /routes/{id}` | Switch the active route / remove one |
| `GET /routes/{id}/gap` | The gap summary: five category scores vs the alumni benchmark, the biggest gap, and every missing skill ranked by impact |

**The maths** (`app/fit.py`): category score = importance of the role's skills you have in that category ÷ importance of all the role's skills in it × 100. So 4 of 5 equal leadership skills scores 80. The overall fit is the average of the five. The alumni benchmark is an **estimate** (alumni are assumed to hold the role's core skills, importance 0.6 or more) until we have alumni profiles.

**Data rules** (from `DESIGN_DECISIONS.md`): a role built from real adverts needs 20 or more, otherwise it is "not enough data" and the closest common roles are offered. Our seeded roles are marked `estimate` until job adverts replace them (P2a).

**Also changed:** saving a profile now works out experience skills from internships, jobs and societies (a "Product Intern" earns Tech internship; a society treasurer earns Society committee role).

### P2a – Opportunities: career events and jobs (done)
All routes need a login token. The Opportunities tab holds **career events** and **jobs**; both are ranked for the student's active route and every item says why.

| Route | What it does |
|---|---|
| `GET /api/opportunities` | Counts for the tab header: events, open jobs, closing soon, saved |
| `GET /api/opportunities/events` | Career events. Each skill the student lacks for their route is weighted by how often the role asks for it; an event scores the sum of the weights it builds ("Builds SQL - a gap on your Data Analyst route") |
| `GET /api/opportunities/jobs` | Jobs with filters (`level`, `location`, `work_mode`, `q`, `saved_only`, `closing_soon`, `hide_no_sponsorship`) and sort (`best`, `closing`, `newest`) |
| `GET /api/opportunities/jobs/{id}` | One job, with the skills you have and the skills to build |
| `POST` / `DELETE /api/opportunities/jobs/{id}/save` | Save, mark applied, or un-save a job |
| `POST /api/admin/refresh-jobs` | (admin key) load jobs. Demo mode: the invented demo jobs only. `DEMO_MODE=false`: the Gradcracker scraper too |

**Where jobs come from**
- **Demo jobs** (`seed/jobs_seed.json`, 39 jobs): invented, with fictional employers, marked `source="demo"` and `is_demo: true` in the API so the front end can label them. They never count as real adverts.
- **Gradcracker** (live scraper, `pipeline/job_scraper.py`): its `robots.txt` allows its job listing pages (checked 15 Oct 2026). It uses the polite fetcher (reads robots.txt, waits 2 seconds between requests, names a contact) and reads at most 3 pages. It only runs when `DEMO_MODE=false`.
- **Not scraped:** LinkedIn (`CLAUDE.md` forbids it) and Indeed (its terms forbid it). Check a site's robots.txt and terms before adding one. Robots.txt alone does not settle whether scraping is allowed.

**Role data from adverts** (`app/jobs.py`): a role with 20 or more real adverts is rebuilt from them (a skill asked for in 70% of adverts gets importance 0.7, skills under 10% are dropped), then marked `data_source="adverts"`. The result is cached for a week. Under 20, the starter estimate is kept. Students whose active route matches a brand new real job get a "role" notification, unless they switched role alerts off.

**Also changed:** events now have a `category` (career events are `opportunity`, the rest `social`) and are tagged with the skills they build. This is filled in on startup for older events (`backfill_event_data`) and whenever events are saved.

### P2b – Home (done)
All routes need a login token.

| Route | What it does |
|---|---|
| `GET /api/home?filter=` | Everything on the Home screen in one answer (`filter` is `all`, `careers`, `social` or `societies`) |
| `PUT` / `DELETE /api/events/{id}/rsvp` | Mark an event `saved`, `going` or `attended` ("I went"), or remove the mark |
| `POST /api/profile/skills` | Add skills to the profile without replacing anything (used after "I went") |

What `GET /api/home` returns:
- **greeting:** first name, part of the day (London time), date and how many events are coming up.
- **actions:** up to three recommended actions. The first is the action of the day. Rules, in priority order: add a profile (no skills yet), choose a career path (no active route), finish a saved job that closes within 7 days, go to the event that builds most of the route's gap, look at the best job on the route. If none apply: explore.
- **featured:** the career event that builds the most of the gap and starts within 14 days; otherwise the soonest event.
- **feed:** every upcoming event, soonest first, each with a `why` line, a button label (`Book` for career events, `Join` for the rest), how many connections are going, and the student's own saved status. Events ruled out by the student's preferences (for example alcohol) are left out.
- **filters:** how many events each chip shows. The counts ignore the current filter.
- **this_week:** the weekly digest section: new jobs and events that build the gap. (The Monday email itself is not built yet.)

"I went": only works once the event has started. The answer suggests the skills the event builds; the student confirms the ones they want and they are added with `POST /api/profile/skills`, so progress follows the profile and not attendance counts.

Not built yet: groups forming for the student (Event Groups), and society events (they need the Societies push; the filter is ready and shows 0 until then).

### P2c – People and Event Groups (done)
All routes need a login token (the moderator routes need the admin key instead).

| Route | What it does |
|---|---|
| `GET /api/people/career` | Alumni who hold or held the active route's role, then students further along the same route, each with a reason |
| `GET /api/people/social` | People ranked by shared hobbies, similar personality (if both took the Big Five check) and shared societies |
| `POST /api/connections` | Ask to connect (`kind` career or social, optional note). If that person already asked you, it accepts |
| `GET /api/connections` | `connections` (accepted), `incoming` (waiting for my answer), `outgoing` (I asked) |
| `PUT /api/connections/{id}` | The receiver accepts or declines |
| `DELETE /api/connections/{id}` | Withdraw a request or remove a connection |
| `GET` / `PUT` / `DELETE /api/follows[/{user_id}]` | One-way follow |
| `GET` / `PUT` / `DELETE /api/blocks[/{user_id}]` | Block (works both ways, removes any connection or follow) |
| `POST /api/reports` | Report a person or a group you are in |
| `GET /api/admin/reports`, `PUT /api/admin/reports/{id}` | The moderator's inbox and decision (`dismiss`, `warn`, `suspend`, `ban`). Needs `X-Admin-Key` |
| `POST` / `GET` / `DELETE /api/events/{id}/group` | Event Groups: "I've booked" (join), see my group, leave |
| `GET /api/event-groups` | My groups for events that have not ended |
| `POST /api/groups/{id}/members/{user_id}/no-show` | Flag a member who did not turn up (after the event starts, once each) |

**Career and social are kept apart** (design decisions, section 8). The career list uses only experience, skills and routes. The social list uses only hobbies, personality and societies, and shows no course, year or job. A field a student hides is never used or shown, so someone who hides their hobbies is left out of other people's social list.

**Connections:** both people must agree. A request someone declined still shows as "requested" to the sender, so nobody is told no. Alumni can set `max_alumni_requests_per_month`: once that many requests have arrived this month (any answer), new requests get a polite 409 until next month. Accepting someone who asked first is never blocked by the limit. Messaging between connections arrives with the Messages stage.

**Event Groups (book first):** the student books the event on its own site, then presses "I've booked" (`booked` must be `true`). They are put in the group with room (max 5) that suits them best on the social score, or start a new one. 1-2 members = `forming`; 3 or more = `open` and the chat can open (members get a notification); less than 24 hours before the event = `closed` (nobody new can join, people can still leave). The status follows the clock. If a group drops below 3 it merges into another group for the same event when everyone fits, otherwise it stays `forming` so new people can join it. Blocked people are never put in the same group. These groups are `group.kind = "event"` rows, so the old `/api/pair/auto` groups are unaffected.

**Safety:** a suspended or banned account gets 403 on every route. Blocking does not remove either person from a group they already share (they leave it themselves).

**Also added:** `notifications.py` (a small helper that respects each student's alert settings; the full notification routes come with Messages) and the `noshowflag` table. No existing columns changed, so no `reset_db` is needed (the new table is created on startup).

Not built yet: group chat messages (Messages stage), the Claude conversation starter, "pair up" via `EventPair` (replaced by Event Groups, to be removed), and recommended societies in People -> Social (Societies stage).
