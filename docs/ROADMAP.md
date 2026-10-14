# LARP: Build Roadmap

One step per session. Every step works the same way: plan, then build, then test, then commit.
"Spec refs" names the only doc sections to read for that step.

| Step | Build | Spec refs | Done when |
|---|---|---|---|
| 0 | Repo, folders, CLAUDE.md, venv, Vite app, health endpoint, GitHub | Brief: How to use | Both apps start. The front end shows "backend: ok" |
| 1 (B1) | SQLModel tables for every entity in the Data model, plus `tags.json` (37 tags) loaded on startup | Spec: Data model, Questionnaire data | Tables exist. `GET /api/tags` returns tags grouped by category and subgroup |
| 2 (B2) | Register and login (bcrypt + JWT, @ucl.ac.uk only), `GET /api/me`, `PUT /api/me/preferences`, `profiles.json` with about 30 fake users (a tight finance and chess cluster, a mix of campuses and alcohol preferences, some LinkedIn opt-ins), a `reset_db` command, 2 demo accounts | Spec: API, Seed data | A user can register. Seed profiles load in one command |
| 3 (B3) | `matching.py`: tag similarity, I/G/C/E/V parts, campus bonus, reason templates. Tests from the spec go in `tests/test_matching.py` | Spec: Matching engine | pytest passes, including the symmetry, cross-campus and grading tests |
| 4 (B4) | Match cache (top 20), `GET /api/matches`, greedy group builder (0.35 threshold, 3 to 6 members), `POST /api/pair/auto`, `GET /api/group` | Spec: Matching engine | A new user gets a ranked list and a group |
| 5 (B5) | Event and venue scoring with the alcohol rule, interleaving for "both", `GET /api/events`, `GET /api/venues`. Starts with a small events file so it can be tested | Spec: Event recommendation | Different users get different, sensible lists. The non-drinker test passes |
| 6 (B6) | SU scraper (check feeds and robots.txt first), normalisation, keyword tagging, Haiku 5.5 tagging with a cache, upsert, fallback to curated, `POST /api/admin/refresh-events`. Venues gathered by AI search into `venues.json` | Spec: Event pipeline, Targets | Refresh adds real events. A forced failure falls back cleanly |
| 7 | Front end: landing page with three cards (Network, Connect, Learn and get help), call to action, login link | Brief: Product flow | Page matches the description, mobile first |
| 8 | Questionnaire screens, one category per screen with "Step X of 7". Answers are held in `sessionStorage` until registration. Tags come from `/api/tags` | Brief: Questionnaire | Answers reach `/api/register` |
| 9 | Registration, pairing choice, My group, Browse, Events feed (career, social and venues tabs, area filter), Profile and settings | Brief: Product flow | The full journey works on real back-end data |
| 10 (B7) | `GET /api/linkedin-max` and screen, privacy audit (no emails or hashes, LinkedIn only if opted in), `DEMO_MODE`, run the demo twice offline, backup video | Brief: Demo plan, Spec: Risks | Demo runs end to end twice without errors |

Suggested timing: Wed covers steps 1 to 4. Thu covers steps 5 to 9 and the backup video. Fri morning covers step 10 polish.

## Shared choices (each step's plan can change them)
- **Auth:** PyJWT bearer token kept in `localStorage`, and `bcrypt` for password hashes. Every route needs the token except health, tags, register and login.
- **Front end:** React Router, Tailwind v4 (`@tailwindcss/vite`), and a small `api.js` wrapper. The Vite dev proxy sends `/api` to `localhost:8000`.
- **Config:** `.env` holds `JWT_SECRET`, `ADMIN_KEY`, `ANTHROPIC_API_KEY` and `DEMO_MODE`.
- **Data:** events are scraped from the UCL SU (with a curated fallback file), venues come from AI search, and there are about 30 fake students. Details get settled when Steps 2 and 6 start.

## Prompt for each step
```
Read CLAUDE.md. Then read docs/ROADMAP.md and only the sections named for Step N.
Enter plan mode and propose a plan for Step N only. Wait for my approval.
After approval: implement, run it, write tests where the step says so,
and tell me in plain words how I can check it myself. Do not start the next step.
```
