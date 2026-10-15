<h1 align="center">🤝 LARP 🎓</h1>

<p align="center"><strong>Become who you want to be at UCL.</strong></p>

<p align="center">
  <a href="https://wakatime.com/badge/github/tomas-trls/LARP-Project?style=for-the-badge"><img src="https://wakatime.com/badge/github/tomas-trls/LARP-Project.svg?style=for-the-badge" alt="wakatime"/></a>
</p>

<!-- TODO: what LARP stands for -->

## 👋 Welcome to LARP

LARP is a web platform for UCL students. It gives each student a **Future Me** profile: the profile of the role they want to reach. LARP compares the student's profile with their Future Me and recommends the jobs, events, societies and people that help them gain what is still missing. **Every recommendation explains why.** Students can also meet fellow students and alumni with similar interests or career paths, in **small groups rather than one-to-one**.

We are four MSc Business Analytics students at the UCL School of Management, and we are building LARP for the **Claude Campus Hackathon + Showcase**. We want every UCL student to see, in one place, which events, societies and people will actually move them towards the career they want, and to make meeting new people feel easy. <!-- TODO: add your own story of why you built LARP -->

For me, LARP is the biggest project I have built so far: my first full-stack app, with a Python back end, a React front end, and Claude working *inside* the product rather than only helping me write it.

---

## 🗂️ Contents

1. [The Problem](#-the-problem-)
2. [The Core Idea](#-the-core-idea-)
3. [Context](#-context-)
4. [What Is Built and What Is Planned](#-what-is-built-and-what-is-planned-)
5. [User Journey](#-user-journey-)
6. [Modules](#-modules-)
7. [Data Sources](#-data-sources-)
8. [How Claude Powers LARP](#-how-claude-powers-larp-)
9. [Privacy and Safety](#-privacy-and-safety-)
10. [Technologies Used](#-technologies-used-)
11. [Getting Started](#-getting-started-)
12. [What's Next](#-whats-next-)
13. [Business Model](#-business-model-)
14. [Team](#-team-)
15. [Credits](#-credits-)
16. [Licence](#-licence-)

---

## 🧩 The Problem 🧩

Students have to fight to become who they want to be.

- 📱 **Scattered.** Opportunities, events and people are spread across WhatsApp, society pages, UCL Careers, Instagram and job portals.
- ❓ **No context.** Listings say what exists, not why it matters for a student's goals.
- 🚪 **Hard to approach.** Knowing whom to talk to, and how to start, is hard.

<!-- TODO: add source — any survey data or student feedback on these problems -->

---

## 🎯 The Core Idea 🎯

```mermaid
flowchart LR
    CV[CV or manual entry] --> UP[User Profile]
    ADS[Real job adverts<br/>for a role type] --> FM[Future Me profile]
    VAL[UCL Careers<br/>values activity] --> FM
    UP --> CMP{Compare}
    FM --> CMP
    CMP --> MISS[Ideal missing<br/>characteristics]
    MISS --> REC[Recommended jobs, events,<br/>societies and people,<br/>each with a reason]
```

1. 🪪 **User Profile.** Built from a CV (Claude extracts education, experience, skills and languages) or entered manually. The student reviews and edits it. Personality and hobbies are self-reported, never inferred.
2. 🔭 **Future Me profile.** Built from real job adverts for a role type. Claude extracts the skills and experience each advert asks for, and LARP aggregates them (for example "communication: 82% of adverts"). Each role is also tagged with the work values it offers, using the UCL Careers values activity.
3. 📏 **Ideal missing characteristics.** LARP compares the User Profile with the Future Me profile. The result covers both experience and skills **and** work values.
4. 📌 **Recommendations.** Jobs, events, societies and people are ranked by how well they help the student gain those characteristics. Each one says why it was suggested.
5. ☕ **Social side.** Separately, students can meet fellow students and alumni with similar interests or life paths.

---

## 🏛️ Context 🏛️

### 🏆 The Hackathon

LARP is being built for the **Claude Campus Hackathon + Showcase**, run by **UCL Entrepreneurs × Claude Builder Club UCL**.

| Detail | Information |
| --- | --- |
| 📅 Date | Friday 16 October 2026, 4pm to 7pm |
| 📍 Venue | Jeffery Hall, UCL IOE, 20 Bedford Way |
| 🛤️ Track | Better Student Life |
| 👥 Team size | Up to four UCL students |
| ⏱️ Format | Building starts before the event, with about 1.5 hours of building on the day before demos are judged |
| 📮 Submission deadline | 6:20pm UK time on the day, via the organisers' form |
| 📦 Submission contents | Demo video, slides, PDF or walkthrough and an optional GitHub link |

**Track fit.** The track asks for something built with Claude that makes student life easier, more enjoyable or more connected. LARP turns scattered listings into a ranked, explained path towards a student's goal, and introduces students to people in low-pressure groups.

### University College London

University College London (UCL) was founded in 1826 in Bloomsbury, London. It was the first university in England to admit students regardless of their religion and among the first to admit women on equal terms with men. Today it is a multidisciplinary research university spanning the arts, sciences, engineering, medicine and social sciences. <!-- TODO: verify -->

### UCL School of Management

The UCL School of Management is UCL's business school. It sits within the Faculty of Engineering Sciences and is based at One Canada Square in Canary Wharf. Its teaching and research focus on analytics, technology, innovation and entrepreneurship. <!-- TODO: verify -->

### MSc Business Analytics

The MSc Business Analytics programme at the UCL School of Management combines data science and technology with management, preparing students to use data to analyse problems and inform business decisions. <!-- TODO: verify programme description against the official course page -->

---

## 🏗️ What Is Built and What Is Planned 🏗️

The front end now has every screen of the new design. They run on **real UCL sample data** (Students' Union events, UCL Careers events and services, societies) plus hand-written sample jobs, people and messages, all read through `frontend/src/sampleData.js`. The back end has sign-up, events and group matching, and the new career tables with their seed data. **Connecting the screens to the back end is the next step.**

| Area | Screen | Back end |
| --- | --- | --- |
| ✍️ Sign up and log in | ✅ Built | ✅ Built: bcrypt-hashed passwords, login tokens, `REQUIRE_UCL_EMAIL=true` limits sign-up to `@ucl.ac.uk` |
| 🪪 User Profile (CV or manual) and review | ✅ Built, sample data | 🟡 Tables built. CV extraction Planned |
| 🧠 Personality and interests | ✅ Built | 🟡 Interest tags built. Personality seed data added |
| 🔭 Career Path and work values | ✅ Built, sample data | 🟡 Roles, skills and work values tables with seed data. Career engine Planned |
| 📏 Future Me areas and gaps | ✅ Built, sample data | ⏳ Planned |
| 🏠 Home | ✅ Built, sample data | ⏳ Planned |
| 💼 Opportunities (career events and jobs) | ✅ Built, sample data | 🟡 Events built. Jobs Planned |
| 🤝 People and connections | ✅ Built, sample data | 🟡 Matching on interests, goals, course and campus built |
| 🎭 Societies | ✅ Built, sample data | ⏳ Planned |
| 🍻 Event Groups | ⏳ Planned | 🟡 Groups and suggested events built. Book-first flow Planned |
| 💬 Messages | ✅ Built, sample data | 🟡 Tables built. Sending Planned |
| 🪞 Profile | ✅ Built | 🟡 Partly built |

---

## 🧭 User Journey 🧭

```mermaid
flowchart TD
    A[Intro] --> B[Sign up with UCL email]
    B --> C{Build the User Profile}
    C -->|Upload CV| D[Claude extracts education,<br/>experience, skills and languages]
    C -->|Create manually| E[Manual profile form]
    D --> F[Review and edit]
    E --> F
    F --> G[Personality<br/>self-report]
    G --> H[Hobbies and interests outside work<br/>social matching only, never jobs]
    H --> I{Career Path}
    I -->|Name a target role| J[Claude suggests 3–5<br/>Future Me profiles]
    I -->|Rate work values| J
    J --> K[Ideal missing characteristics]
    K --> L[Home]
    L --> M[Opportunities<br/>jobs ranked by fit]
    L --> N[Societies and<br/>society events]
    L --> O[People<br/>career and social]
    L --> P[Event Groups]
    L --> Q[Messages]
    L --> R[Profile]
```

---

## 📲 Modules 📲

| Module | Purpose |
| --- | --- |
| 🪪 User Profile | CV extraction or manual entry, reviewed and edited by the student |
| 🔭 Future Me | Role profiles aggregated from real job adverts and tagged with work values |
| 🧭 Career Path | Name a target role or rate work values, then choose from 3–5 Future Me profiles |
| 💼 Opportunities | Career events and jobs, ranked by how well they build the ideal missing characteristics |
| 🎭 Societies | The society directory and all society events, ranked the same way |
| 🤝 People | Students and alumni to meet, split into Career and Social |
| 🍻 Event Groups | Small groups going to the same event |
| 💬 Messages | Group chats and chats with mutual connections |
| 🪞 Profile | The student's own page and settings |

### 🍻 Event Groups

There is **no one-to-one matching for events**. The student books an event themselves, then opts in on LARP to go with others. LARP puts them in a **group of 3–5 people** with matching profiles who are going to the same event. The student only accepts or declines a **group**, never an individual, so nobody can be personally rejected. The group chat opens once a group reaches 3, and matching closes 24 hours before the event.

### 🪞 Profile

An Instagram-style page:

- avatar, bio and stats (events, connections, societies)
- Future Me routes with progress
- badges
- a grid of attended, booked and saved events
- settings behind a gear icon

---

## 📡 Data Sources 📡

| Source | How LARP gets it | Status |
| --- | --- | --- |
| Job adverts | Official jobs APIs (Adzuna or Reed). No LinkedIn scraping, which breaches LinkedIn's terms | Planned |
| LinkedIn | Only an opt-in link students add to their own profile | Built |
| Students' Union and society events | A polite scraper of the SU's public listing pages. It checks robots.txt, waits between requests and names a contact in its User-Agent | Built (runs only on request, with `DEMO_MODE=false`) |
| Hand-curated events | A checked list of real public events (`backend/app/seed/events_curated.json`), currently from the SU, ISE and DesignMyNight | Built |
| UCL sample data | UCL "What's Happening" events, UCL Careers events and services, and student groups, converted for the screens by `frontend/scripts/build_sample_data.py` | Built |
| UCL Careers events | These sit behind UCL login, so the demo uses the public sample data above | Partly built |
| UCL SSO and an official careers feed | Partnership milestones that need UCL approval. LARP cannot build these alone | Planned |

LARP never asks for UCL passwords.

---

## 🤖 How Claude Powers LARP 🤖

LARP calls Claude through the Anthropic API.

| Task | Input | Output | Status |
| --- | --- | --- | --- |
| CV extraction | CV text | User Profile: education, experience, skills and languages | Planned |
| Future Me aggregation | Job adverts for a role type | Skills and experience with how often adverts ask for them | Planned |
| Work values to roles | A student's work value ratings | Suggested roles | Planned |
| Explanations | User Profile, Future Me profile and a recommendation | Ideal missing characteristics and why each recommendation helps | Planned |
| Event search | A search plan by category | Candidate events found with Claude's web search | Built |
| Event tagging | Event title and description | Tags from LARP's fixed list (unknown tags are thrown away) | Built |

**Every Claude call has a cached demo-mode fallback.** With `DEMO_MODE=true` LARP makes no live Claude calls and uses saved results. Tagging answers are cached per event, so the same event is never sent twice, and if Claude fails the pipeline keeps the keyword result.

---

## 🛡️ Privacy and Safety 🛡️

- Personality and hobbies are self-reported, never inferred.
- Hobbies and personality are used for social matching only, never for jobs.
- Students review and edit their User Profile before it is used, and the CV is deleted once it has been read.
- No one-to-one rejection: students accept or decline groups, not people.
- One-to-one messages only after both people accept a connection.
- Report, block and leave group are part of the first version.
- LARP never sends LinkedIn requests and never scrapes LinkedIn.
- LARP never asks for UCL passwords.
- Passwords are stored as bcrypt hashes, never in plain text.
- UK GDPR applies. A lawful basis, privacy notice and data protection impact assessment are needed before launch. <!-- TODO: confirm requirements with UCL data protection guidance -->

The full reasoning behind these choices is in [`docs/DESIGN_DECISIONS.md`](docs/DESIGN_DECISIONS.md).

---

## 💻 Technologies Used 💻

<p align="center">
  <a href="https://www.python.org/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="70" height="70"/></a>
  <a href="https://fastapi.tiangolo.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/fastapi/fastapi-original.svg" alt="fastapi" width="70" height="70"/></a>
  <a href="https://www.sqlite.org/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sqlite/sqlite-original.svg" alt="sqlite" width="70" height="70"/></a>
  <a href="https://react.dev/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="react" width="70" height="70"/></a>
  <a href="https://vite.dev/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" alt="vite" width="70" height="70"/></a>
  <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" alt="tailwind" width="70" height="70"/></a>
</p>

<p align="center">
  <a href="https://www.anthropic.com/claude" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Claude-Anthropic%20API-D97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude"/></a>
  <a href="https://render.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Hosted%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render"/></a>
</p>

| Part | Technology | Folder |
| --- | --- | --- |
| Back end | Python, FastAPI, SQLModel on SQLite | `backend/` |
| Front end | React 19, React Router, Vite and Tailwind CSS v4 | `frontend/` |
| AI | Anthropic API (Claude) | `backend/app/pipeline/` |
| Tests | pytest | `backend/tests/` |
| Hosting | Render (free tier) | |

### 📁 Repository Structure

```text
LARP-Project/
├── backend/
│   ├── app/            # API routes, matching, groups, events, career tables
│   │   ├── pipeline/   # event search, scraping and Claude tagging
│   │   └── seed/       # tags, roles, skills, work values, curated events and venues
│   └── tests/
├── frontend/
│   ├── src/            # screens, components, sample data and the API client
│   └── UI Design/      # the app screen designs
├── Sample data/        # real UCL events, careers and student group exports
├── docs/               # brief, back-end spec and re-plan, roadmap, design decisions
├── .env.example        # every setting, with no secrets
└── README.md
```

---

## 🚀 Getting Started 🚀

You need **Python 3.11**, **Node 24** and **git**.

**1. Get the code and your settings**

```bash
git clone https://github.com/tomas-trls/LARP-Project.git
cd LARP-Project
cp .env.example .env                # Windows: copy .env.example .env
```

**2. Start the back end** (first terminal)

```bash
cd backend
python3.11 -m venv .venv            # Windows: py -3.11 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.reset_db              # loads tags, career data, practice students, events and venues
uvicorn app.main:app --reload       # http://localhost:8000 (API docs at /docs)
```

**3. Start the front end** (second terminal)

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

Run the tests from `backend/` with `python -m pytest`.

### 🔑 Environment variables

All settings live in `.env`. `.env.example` lists every key with a comment. The main ones:

| Key | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | Lets LARP call Claude. Get one at console.anthropic.com |
| `DEMO_MODE` | `true` means no live scraping and no live Claude calls |
| `JWT_SECRET` | Signs login tokens. Any long random string |
| `ADMIN_KEY` | Needed for the `/api/admin/*` routes |
| `FRONTEND_ORIGINS` | Front end addresses allowed to call the API (needed on Render) |
| `REQUIRE_UCL_EMAIL` | `true` allows only `@ucl.ac.uk` sign-ups |

> **Warning: never commit `.env` files.** They hold your API key and secrets. `.env` is git-ignored; only `.env.example` belongs in the repository.

### ☁️ Hosting on Render

LARP runs on Render's free tier. <!-- TODO: add the live front end and API URLs -->

- The service **sleeps after 15 minutes idle**, so the first visit after a pause takes a while to wake it.
- **SQLite resets on restart**, so accounts made by hand do not survive. The interest tags load on startup. Loading the practice students and events on startup is Planned. <!-- TODO: load seed data on startup for Render -->
- Set `FRONTEND_ORIGINS` to the front end's Render address so the browser may call the API.

<p align="center">
  <strong><!-- TODO: add the live Render URL --> 🌐 Live demo coming soon</strong>
  <br />
  <!-- TODO: add a GIF of the app, like ![LARP](larp-demo.gif) -->
</p>

---

## 🌱 What's Next 🌱

- 🔌 **Connect the screens to the back end**, one endpoint at a time, replacing the sample data in `frontend/src/sampleData.js`.
- 🔭 **Build the career engine:** Future Me profiles from at least 20 real job adverts per role, cached for a week.
- 📄 **CV extraction with Claude**, then delete the CV once the student approves their profile.
- 🍻 **Book-first Event Groups:** book an event, opt in, join a group of 3–5.
- 📬 **A weekly digest** of new jobs, events and groups that build each student's missing characteristics.
- 🎓 **Alumni handover**, so graduates keep their account as verified alumni.
- ☁️ **Load seed data on startup**, so the Render demo survives a restart.

The full build order is in [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/BACKEND_REPLAN.md`](docs/BACKEND_REPLAN.md).

---

## 💼 Business Model 💼

- **Free core network.**
- **Possible later revenue:** optional guided goal programmes, paid hosted experiences and employer or institutional partnerships, only after usage is proven.
- **Launch** as a focused pilot with UCL School of Management students before expanding.

See the business plan for detail. <!-- TODO: link to the business plan -->

---

## 👥 Team 👥

We are four MSc Business Analytics students at the UCL School of Management.

| Name | Role | Contributions |
| --- | --- | --- |
| Tomas Truyols | Product Manager | <!-- TODO: contributions --> |
| <!-- TODO: name --> | Front-end lead | <!-- TODO: contributions --> |
| <!-- TODO: name --> | Back-end lead | <!-- TODO: contributions --> |
| <!-- TODO: name --> | Business lead | <!-- TODO: contributions --> |

We are always open to feedback and ideas. Come and say hi on GitHub: **[@tomas-trls](https://www.github.com/tomas-trls)** <!-- TODO: add a contact email -->

---

## 🙌 Credits 🙌

- <a href="https://www.anthropic.com/">Anthropic</a>, whose Claude API powers LARP's event search and tagging.
- <a href="https://studentsunionucl.org/">Students' Union UCL</a>, <a href="https://ise.org.uk/">ISE</a> and <a href="https://www.designmynight.com/">DesignMyNight</a>, whose public listings make up our events.
- UCL Careers, whose values activity shapes how LARP describes roles.
- UCL Entrepreneurs and the Claude Builder Club UCL for running the hackathon.

---

## 📜 Licence 📜

<!-- TODO: choose a licence (e.g. MIT) and add a LICENSE file -->
