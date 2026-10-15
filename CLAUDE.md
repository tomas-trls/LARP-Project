# LARP: project rules
- Product name: LARP (a UCL student platform: questionnaire -> groups, matches, events).
- Read docs/BRIEF.md and docs/BACKEND_SPEC.md only for the section the current step names.
- docs/ROADMAP.md lists the build steps in order. Work on one step at a time. Plan first, then build, then run it and test it.
- Keep code simple and commented. The owner is a first-time coder and wants to understand it.
- Stack: FastAPI + SQLite (back end, in `backend/`), React + Vite + Tailwind (front end, in `frontend/`).
- The back end uses the venv at `backend/.venv`. On Mac, run Python as `backend/.venv/bin/python` (e.g. `.venv/bin/python -m pytest` from `backend/`). On Windows, use the `py` launcher.
- Never auto-send LinkedIn requests. Never store passwords in plain text.
- Secrets live in `.env` (never committed). `.env.example` shows the keys.
