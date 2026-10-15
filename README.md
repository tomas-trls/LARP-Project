# 🌟 LARP: Become who you want to be at UCL 🎓

[![wakatime](https://wakatime.com/badge/github/tomas-trls/LARP-Project.svg?style=for-the-badge)](https://wakatime.com/badge/github/tomas-trls/LARP-Project?style=for-the-badge)

<!-- TODO: what LARP stands for -->

LARP is a web platform for UCL students. A student builds a profile (from a CV or by hand), picks the role they want to reach, their **Future Me**, and LARP shows how close they are to it. It then recommends the opportunities, societies and people that help close the gap, and every recommendation says why. Students also meet each other in **small groups of up to 5 people** going to the same event, instead of one-to-one, so nobody gets personally rejected.

We are building it for the **Claude Campus Hackathon + Showcase** (UCL Entrepreneurs × Claude Builder Club UCL, Friday 16 October 2026, track **Better Student Life**). We are a team of four MSc Business Analytics students at the UCL School of Management.

The problem we want to solve: opportunities, events and people are scattered across WhatsApp, society pages, UCL Careers, Instagram and job portals. Listings say what exists, not why it matters to you, and knowing who to talk to is hard.

**Where we are:** the front end has every screen of the new design, running on real UCL sample data plus hand-written sample jobs, people and messages. The back end has sign-up, events and group matching, and now the career tables (roles, skills, work values) with their seed data. Connecting the two is the next step.

This project was a big step for me. It is my first full-stack app, with a Python **FastAPI** back end, a **React** front end and **Claude** working inside the product to find and tag events.

I would like to give credit to:

- <a href="https://www.anthropic.com/">Anthropic</a>, whose Claude API powers LARP's event search and tagging.
- <a href="https://studentsunionucl.org/">Students' Union UCL</a>, <a href="https://ise.org.uk/">ISE</a> and <a href="https://www.designmynight.com/">DesignMyNight</a>, whose public event listings make up our events list.
- UCL Entrepreneurs and the Claude Builder Club UCL for running the hackathon.

If you want to read more about how LARP was planned and built, have a look at the `docs/` folder:

- <a href="docs/ROADMAP.md">Roadmap</a>: the build steps in order
- <a href="docs/BACKEND_REPLAN.md">Back-end re-plan</a> for the new screens
- <a href="docs/DATABASE_DIAGRAM.md">Database diagram</a>
- <a href="docs/DESIGN_DECISIONS.md">Design decisions</a>
- <a href="docs/EVENT_SEARCH_LOGIC.md">Event search logic</a>
- <a href="docs/SETUP.md">Setup notes</a>

I am always open to feedback and suggestions. Thank you for visiting the repository, and I hope you enjoy LARP!

## 💥 Setup / Installation Requirements 💥

You need **Python 3.11**, **Node 24** and **git**. Open the terminal or a similar CLI on your computer.

👾 In your Terminal 👾

```bash
  git clone https://github.com/tomas-trls/LARP-Project.git
  cd LARP-Project
  cp .env.example .env                # Windows: copy .env.example .env
```

Open `.env` and fill in your keys. `.env.example` explains each one. Never commit `.env`: it holds your secrets.

👾 Back end (first terminal) 👾

```bash
  cd backend
  python3.11 -m venv .venv            # Windows: py -3.11 -m venv .venv
  source .venv/bin/activate           # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  python -m app.reset_db              # loads tags, practice students, events and venues
  uvicorn app.main:app --reload       # http://localhost:8000 (API docs at /docs)
```

👾 Front end (second terminal) 👾

```bash
  cd frontend
  npm install
  npm run dev                         # http://localhost:5173
```

Open `http://localhost:5173` in your browser. To run the tests, go into `backend/` and run `python -m pytest`.

## 🌚 Demo 🌝

<br />
<p align="center">
  <strong><!-- TODO: add the live Render URL --> [Live Demo] Coming soon on Render!</strong>
  <br />
  <!-- TODO: add a GIF of the app, like ![LARP](larp-demo.gif) -->
</p>

> LARP runs on Render's free tier. It sleeps after 15 minutes idle, so the first visit can take a little while to wake up.

### 🎮 How to use LARP 🎮

<div align="center">

| **Page** | **What you do there** |
| :---: | :---: |
| Sign up | Create your account |
| Onboarding | Build your profile from a CV or by hand, review it, then add personality, interests, a career path and work values |
| Areas & Gaps | See your Future Me routes and what is still missing to reach them |
| Home | Your feed of recommended events and next steps |
| Opportunities | Career events and jobs, with an Events / Jobs filter |
| People & Connections | Meet students and alumni, split into Career and Social |
| Societies | The society directory and all society events |
| Messages | Chat with your connections and groups |
| Profile | Your page and settings |

</div>

## ⚡️ Technologies used ⚡️

<p align="center">
  <a href="https://www.python.org/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="80" height="80"/></a>
  <a href="https://fastapi.tiangolo.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/fastapi/fastapi-original.svg" alt="fastapi" width="80" height="80"/></a>
  <a href="https://www.sqlite.org/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sqlite/sqlite-original.svg" alt="sqlite" width="80" height="80"/></a>
  <a href="https://react.dev/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="react" width="80" height="80"/></a>
  <a href="https://vite.dev/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" alt="vite" width="80" height="80"/></a>
  <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" alt="tailwind" width="80" height="80"/></a>
</p>

<p align="center">
  <a href="https://www.anthropic.com/claude" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Claude-Anthropic%20API-D97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude"/></a>
</p>

## 🚀 Future Features & Issues 🚀

- I need to **connect the new screens to the back end**. They read sample data from `frontend/src/sampleData.js` for now.
- I'd like to build **Future Me** profiles from real job adverts, with a 20-advert minimum and a weekly cache.
- I'd like Claude to **read a CV** and fill in the profile, then delete the CV once it is read.
- I need to switch Event Groups to **book first**: book an event, then join a group of at most 5.
- I need to load the sample data when the server starts, because **SQLite resets on every Render restart**.
- I'd like to add report and block, and a handover for students who become alumni.

## 🔒 Privacy & Safety 🔒

- Passwords are stored as bcrypt hashes, never in plain text.
- LARP never sends LinkedIn requests, never scrapes LinkedIn and never asks for UCL passwords.
- Students accept or decline groups, never individual people.
- With `DEMO_MODE=true`, LARP makes no live Claude calls and no live scraping.

## 💎 Contact Me 💎

<strong>[@tomas-trls](https://www.github.com/tomas-trls)</strong> <!-- TODO: add your contact email -->

| **Name** | **Role** |
| :---: | :---: |
| Tomas Truyols | Product Manager |
| <!-- TODO: name --> | Front-end lead |
| <!-- TODO: name --> | Back-end lead |
| <!-- TODO: name --> | Business lead |
