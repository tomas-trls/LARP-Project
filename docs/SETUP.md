# LARP

A UCL student platform that takes students from "I don't know anyone" to "I'm meeting my group on Thursday".
Built for the Claude Campus Hackathon (16 October 2026).

- `backend/`: Python, FastAPI and SQLite (the API, matching and events)
- `frontend/`: React, Vite and Tailwind (the website)
- `docs/`: the build brief, the back-end spec and the step-by-step roadmap

## First-time setup

You need Python 3.11, Node 24 and git.

```bash
# Back end
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate          # Windows (on Mac or Linux: source .venv/bin/activate)
pip install -r requirements.txt

# Front end
cd ../frontend
npm install

# Settings: copy the example and fill it in
cd ..
copy .env.example .env          # Windows (on Mac or Linux: cp .env.example .env)
```

## Running it (two terminals)

```bash
# Terminal 1: back end on http://localhost:8000 (API docs at /docs)
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2: front end on http://localhost:5173
cd frontend
npm run dev
```

Open http://localhost:5173. The page should say **backend: ok**. If it says "offline", the back end is not running.

## Tests

```bash
cd backend
.venv\Scripts\activate
pytest
```

## Demo day runbook

**Settings in `.env` for the demo** (see `.env.example`):

- `DEMO_MODE=true`: no live scraping and no Claude calls, so the demo works with no internet.
- `REQUIRE_UCL_EMAIL=false`: any email address can register (students can't make `@ucl.ac.uk` addresses).
  Set it back to `true` for a real launch.

**Before going on stage**

1. Stop the back end, then reset the data: `cd backend`, `.venv\Scripts\python -m app.reset_db`.
   This reloads the tags, 32 practice students, real events and venues. It deletes every account made by hand.
2. Start both servers (see "Running it").
3. Turn wifi off and run the whole demo path once. Then reset again (step 1) so the stage run starts clean.
4. Practice accounts: `demo.main@ucl.ac.uk` (main campus, career) and `demo.canary@ucl.ac.uk` (Canary Wharf, social).
   Password for every practice student: `demo1234`.
5. On the questionnaire page, the dashed **Demo: fill in the answers for me** button (only visible in demo mode) fills everything in.

**Demo path** (about 3 minutes): landing page, questionnaire, register, pairing choice (**Both**), My group with the first event,
Browse, Events (Career, Social, Venues), LinkedIn (Open, Next, Next).

**LinkedIn Max** has no LinkedIn connection at all. It shows students who chose to share their link. You open or copy it,
connect on LinkedIn yourself, then press Next. The practice links are placeholders (`.../in/placeholder-NN`), so they open a
"profile not found" page on LinkedIn. Real users' own links work.

**Backup video** (record it on Thursday night, in case the live demo fails): reset the data, turn on a screen recorder
(Windows: `Win + Alt + R`), walk the demo path once at a normal pace, save the file to your phone and a USB stick as well as the laptop.

**Checks that run without a person**: `cd backend` then `.venv\Scripts\pytest`. `test_demo_journey.py` runs the demo path twice offline,
and `test_privacy.py` checks that emails, password hashes and alcohol answers never reach other users.
