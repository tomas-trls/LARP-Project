# LARP

<!-- TODO: what LARP stands for -->

**Find your people, your events and your next role at UCL.**

LARP is a web platform and mobile app for UCL students and alumni that blends professional networking with the matching mechanics of a dating app. Users build a profile from their CV, choose a target role or let LARP suggest career routes, then receive a personalised feed of events, graduate roles and people worth meeting. Claude turns unstructured information (CVs, event listings, job descriptions) into structured profiles, clear recommendations and conversation starters. The aim is simple: fewer tabs, better connections and a clearer path from where a student is to where they want to be.

---

## Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Context](#context)
4. [User Journey](#user-journey)
5. [Product Modules](#product-modules)
6. [How Claude Powers LARP](#how-claude-powers-larp)
7. [System Architecture](#system-architecture)
8. [Business Plan](#business-plan)
9. [Privacy, Ethics and Compliance](#privacy-ethics-and-compliance)
10. [Hackathon MVP vs Roadmap](#hackathon-mvp-vs-roadmap)
11. [Repository Structure](#repository-structure)
12. [Getting Started](#getting-started)
13. [Team and Contributions](#team-and-contributions)
14. [Licence](#licence)

---

## The Problem

UCL students have no shortage of opportunities. The difficulty is finding the right ones for their goals and the right people to help them get there.

- **Fragmented sources.** Students' Union and society events, UCL Careers events and graduate job listings live on separate platforms, newsletters and group chats. Students have to search each one and work out for themselves which are relevant.
- **Weak alumni access.** Alumni who have already taken the path a student wants to follow are hard to identify and harder to approach. There is rarely an obvious, low-pressure way to start the conversation.
- **Generic networking.** Mainstream professional networks are built for everyone, so they are not tuned to a single university community. Connections are driven by job titles rather than shared ambitions, interests or personality.
- **Unclear career routes.** Many students know their background but not which roles it leads to, or which steps would close the gap.

<!-- TODO: add source — any survey data or student feedback that quantifies these problems -->

## The Solution

LARP brings people, events and roles for UCL students into one place and ranks them against each user's goals.

1. **Build a profile** by uploading a CV or entering your background manually. Add your personality type and hobbies if you wish.
2. **Set a direction** by naming the role you want, or let LARP suggest career routes based on your background.
3. **Get a tailored feed** of SU and society events, UCL Careers events and graduate roles that move you towards that goal.
4. **Meet the right people** by connecting with students and alumni who share your ambitions, background or interests. Follow people for their hobbies as well as their careers.

Every recommendation comes with a short, plain-language explanation of why it was suggested.

---

## Context

### The Hackathon

LARP is being built for the **Claude Campus Hackathon + Showcase**, run by **UCL Entrepreneurs × Claude Builder Club UCL**.

| Detail | Information |
| --- | --- |
| Date | Friday 16 October 2026, 4pm to 7pm |
| Venue | Jeffery Hall, UCL IOE, 20 Bedford Way |
| Track | Better Student Life |
| Team size | Up to four UCL students |
| Format | Building starts before the event, with about 1.5 hours of building on the day before demos are judged |
| Submission deadline | 6:20pm UK time on the day, via the organisers' form |
| Submission contents | Demo video, slides, PDF or walkthrough and an optional GitHub link |

**Track fit: Better Student Life.** The track asks teams to build something with Claude that makes student life easier, more enjoyable or more connected. LARP addresses this directly:

- **More connected.** Students meet peers and alumni who share their goals and interests, not just their course.
- **Easier discovery.** Career events, society events and graduate roles are collected in one feed and ranked against each student's chosen direction.
- **Built with Claude.** Claude handles CV parsing, career route suggestions, recommendation explanations, summaries and conversation starters.

### University College London

University College London (UCL) was founded in 1826 in Bloomsbury, London. It was the first university in England to admit students regardless of their religion and among the first to admit women on equal terms with men. Today it is a multidisciplinary research university spanning the arts, sciences, engineering, medicine and social sciences. <!-- TODO: verify -->

### UCL School of Management

The UCL School of Management is UCL's business school. It sits within the Faculty of Engineering Sciences and is based at One Canada Square in Canary Wharf. Its teaching and research focus on analytics, technology, innovation and entrepreneurship. <!-- TODO: verify -->

### MSc Business Analytics

The MSc Business Analytics programme at the UCL School of Management combines data science and technology with management, preparing students to use data to analyse problems and inform business decisions. <!-- TODO: verify programme description against the official course page -->

### The Team

We are four MSc Business Analytics students at the UCL School of Management.

| Name | Role |
| --- | --- |
| Tomas Truyols | Product Manager |
| <!-- TODO: name --> | <!-- TODO: role --> |
| <!-- TODO: name --> | <!-- TODO: role --> |
| <!-- TODO: name --> | <!-- TODO: role --> |

---

## User Journey

```mermaid
flowchart TD
    A[Sign up with UCL account] --> B{How do you want to build your profile?}
    B -->|Upload CV| C[Claude parses CV into a structured profile]
    B -->|Enter manually| D[Manual profile form]
    C --> E[Review and edit profile]
    D --> E
    E --> F[Optional: add personality type and hobbies]
    F --> G{Do you know the role you want?}
    G -->|Yes| H[Select target role]
    G -->|Not sure| I[Claude suggests career routes from your background]
    I --> H
    H --> J[Opportunity Feed: SU and society events, UCL Careers events, graduate roles]
    J --> K[Connect: matched students and alumni]
    K --> L[Swipe or send a connection request]
    L --> M[Messaging with Claude-generated conversation starters]
    K --> N[Follow people by shared hobbies]
```

---

## Product Modules

### Profile Builder

**Purpose:** create a rich, structured profile with as little effort as possible.

- CV upload (PDF or DOCX) with Claude-powered parsing into education, experience, skills and interests
- Manual entry for users without a CV or who prefer to type
- Review and edit step so users stay in control of what is saved
- Optional personality type (for example a self-reported framework of the user's choice)
- Hobbies and non-work interests

### Career Route Engine

**Purpose:** turn a profile into a clear career direction.

- Target role selection from a searchable list
- AI-suggested career routes based on the user's background, each with a short rationale
- Gap summary showing skills or experience that would strengthen an application
- Ability to save several routes and switch between them

### Opportunity Feed

**Purpose:** surface the events and roles that matter for the chosen route.

- Students' Union and society events
- UCL Careers events, fairs and workshops
- Graduate roles and jobs from external job platforms
- Ranking against the user's target role and interests
- Short Claude-generated summaries and a "why this was recommended" explanation for each item

### Connect

**Purpose:** introduce users to students and alumni worth knowing.

- Matching on shared career goals, profile similarity and interests
- Swipe-based or request-based connection, chosen by the user
- Mutual opt-in before messaging is unlocked
- Follow people based on non-work interests such as hobbies
- Explanation of why each match was suggested

### Messaging and Notifications

**Purpose:** keep conversations and opportunities moving.

- One-to-one messaging between connected users
- Claude-generated conversation starters based on shared ground
- Notifications for new matches, messages, upcoming events and new roles on a saved route
- User-controlled notification preferences

---

## How Claude Powers LARP

LARP uses the **Anthropic API** to call Claude for the following tasks.

| Task | Input | Output |
| --- | --- | --- |
| CV parsing | Uploaded CV text | Structured profile (education, experience, skills, interests) as JSON |
| Career route generation | Structured profile | Ranked career routes with rationale and skill gaps |
| Recommendation explanations | Profile plus a match, event or role | A short, plain-language reason for the recommendation |
| Event and job summaries | Event or job listing text | A concise summary highlighting what is relevant to the user |
| Conversation starters | Two connected profiles | Suggested opening messages based on shared ground |

Design principles:

- **Structured outputs.** Claude returns JSON against defined schemas so results can be validated and stored.
- **Human in the loop.** Users review parsed profiles and suggested routes before they are used for matching.
- **Explainability.** Every recommendation shown to a user is accompanied by a reason.
- **Data minimisation.** Only the fields needed for each task are sent to the API.

---

## System Architecture

> No code exists in the repository yet, so the stack below is **proposed** and may change.

```mermaid
flowchart LR
    subgraph Clients
        W[Web app<br/>Next.js]
        M[Mobile app<br/>React Native + Expo]
    end

    subgraph Backend
        API[API<br/>FastAPI or Node.js]
        AUTH[Authentication<br/>UCL SSO]
        BL[Business logic<br/>matching, ranking, feeds]
    end

    subgraph AI[AI Layer]
        CL[Anthropic API<br/>Claude]
        EMB[Embeddings and<br/>matching logic]
    end

    subgraph Data[Data Layer]
        PG[(PostgreSQL)]
        VEC[(pgvector)]
    end

    subgraph Sources[Integrations and Data Sources]
        SU[SU and society events]
        UC[UCL Careers]
        JOBS[Job platforms]
    end

    W --> API
    M --> API
    API --> AUTH
    API --> BL
    BL --> CL
    BL --> EMB
    BL --> PG
    EMB --> VEC
    SU --> BL
    UC --> BL
    JOBS --> BL
```

### Frontend

- **Web app:** Next.js (proposed)
- **Mobile app:** React Native with Expo (proposed)
- **Shared design system** so both clients look and behave consistently

### Backend

- REST API serving both clients (proposed: Python FastAPI or Node.js)
- Authentication and session management
- Business logic for profiles, career routes, feed ranking, matching and messaging

### Data Layer

- **PostgreSQL** for users, profiles, events, roles, connections and messages (proposed)
- **pgvector** to store embeddings of profiles, events and roles for similarity-based matching (proposed)

### AI Layer

- Anthropic API integration for parsing, generation, summarisation and explanations
- Versioned prompt templates with defined output schemas
- Embedding generation for profiles, events and roles
- Matching logic that combines vector similarity with explicit filters (target role, interests, availability)

### Integrations and Data Sources

- Students' Union and society events
- UCL Careers events
- Graduate roles and jobs from external job platforms

All external data must come from **official APIs, feeds or partnerships**. Scraping platforms such as LinkedIn breaches their terms of service and is out of scope. For the hackathon demo, LARP uses seeded sample data.

### Authentication

UCL single sign-on (SSO) is proposed so that the platform stays UCL-only and users are verified as current students or alumni. <!-- TODO: verify SSO access and alumni eligibility with UCL ISD -->

### Infrastructure and Deployment

- **Hosting:** <!-- TODO: choose hosting (e.g. web, API and database providers) -->
- **CI/CD:** automated linting, tests and deployment on merge to `main` <!-- TODO: choose CI/CD tool -->
- **Configuration:** environment variables for all keys and connection strings. No secrets are committed to the repository; `.env` files are git-ignored and a `.env.example` documents the required variables.

---

## Business Plan

### Target Users

| Group | Who they are |
| --- | --- |
| Students | Undergraduate and postgraduate students at UCL |
| Alumni | UCL graduates willing to share experience and advice |
| Societies | Student societies and the Students' Union promoting events |
| UCL Careers | The university's careers service promoting events and resources |
| Employers | Organisations recruiting UCL graduates and interns |

### Value Proposition

| Group | Value |
| --- | --- |
| Students | One place to find relevant events, roles and people, ranked against their own goals |
| Alumni | An easy, low-effort way to give back and stay connected with UCL |
| Societies | Better reach to students who are genuinely interested in their events |
| UCL Careers | Higher engagement with careers events and insight into student ambitions |
| Employers | Access to motivated, well-matched candidates and better-attended employer events |

### Competitive Landscape

| Alternative | Strength | Gap LARP addresses |
| --- | --- | --- |
| LinkedIn | Large professional network | Not tuned to a single university community; connections driven by job titles |
| Handshake | Student-focused jobs and employer events | Limited emphasis on peer and alumni matching or non-work interests |
| Bumble BFF / Bizz-style apps | Engaging, low-pressure matching | Not career-focused and not tied to a university |
| UCL's own careers tools | Official, trusted source of careers events and support | Separate from society events and peer networking; not personalised around a matched network |

**Differentiation:** LARP is UCL-only, combines career and non-career matching, ranks opportunities against a chosen career route and explains every recommendation using Claude.

<!-- TODO: add source — verify competitor features before external use -->

### Revenue Model Options

- **Freemium:** core features free for students, with optional premium features (for example extended route analysis)
- **Employer partnerships:** paid access to promote roles and employer events to well-matched users
- **Sponsored events:** promoted placement for society or employer events, clearly labelled
- **University licence:** institutional licence for careers services and alumni relations teams

### Go-to-Market

1. **Launch at UCL** through societies and the Students' Union, starting with a small group of societies as early partners.
2. **Grow the alumni side** through alumni networks and UCL School of Management contacts.
3. **Partner with UCL Careers** to bring official events into the feed.
4. **Expand to other universities** once engagement and retention are proven at UCL.

### KPIs

| KPI | Definition |
| --- | --- |
| Activation | Share of sign-ups who complete a profile and choose a career route |
| Connections made | Number of mutual connections per active user |
| Event sign-ups | Event registrations originating from the Opportunity Feed |
| Applications started | Job or graduate role applications started from LARP |
| Retention | Share of users active after 7, 30 and 90 days |

<!-- TODO: add targets for each KPI once a baseline exists -->

---

## Privacy, Ethics and Compliance

- **UK GDPR.** LARP processes personal data under UK GDPR. A lawful basis, privacy notice and data protection impact assessment are required before launch. <!-- TODO: confirm requirements with UCL data protection guidance -->
- **Consent for CV and personality data.** Users explicitly consent before a CV is processed or a personality type is stored. Personality data is optional.
- **Transparency about AI.** Users are told when Claude processes their data and can review all outputs before they are saved.
- **Visibility controls.** Users choose which profile fields are visible and to whom. They can also opt out of matching entirely.
- **Safety features.** Blocking, reporting and mutual opt-in before messaging. Reports are reviewed by a moderator.
- **Fairness in matching and route suggestions.** Protected characteristics are not used as matching inputs. Route suggestions are based on skills and experience, and outputs are reviewed for bias against particular backgrounds.
- **Data retention.** Uploaded CVs are deleted after parsing unless the user chooses to keep them. Users can export or delete their account and data at any time. <!-- TODO: define retention periods -->

---

## Hackathon MVP vs Roadmap

| Area | MVP demo (16 October 2026) | Later phases |
| --- | --- | --- |
| Profile Builder | CV upload, Claude-generated structured profile, manual edit | Personality type, hobbies, richer manual entry |
| Career Route Engine | Claude-suggested career routes from the parsed profile | Gap analysis, saved routes, target role search |
| Opportunity Feed | Sample feed of events and roles from seeded data, with explanations | Live SU, society, UCL Careers and job platform integrations |
| Connect | Sample match feed of seeded profiles, with explanations | Swipe and request flows, following by hobbies, embedding-based matching |
| Messaging and Notifications | Claude-generated conversation starter for a sample match | Full messaging and push notifications |
| Platform | Web app only | Mobile app, UCL SSO, production hosting and moderation |

---

## Repository Structure

The repository is currently empty. The proposed structure is:

```text
LARP-Project/
├── frontend-web/     # Next.js web app
├── mobile/           # React Native (Expo) mobile app
├── backend/          # API, authentication and business logic
├── ai/               # Prompt templates, schemas, embeddings and matching logic
├── data/             # Seeded sample data for the demo
├── docs/             # Architecture notes, diagrams and design decisions
├── business/         # Business plan, pitch slides and research
├── .env.example      # Required environment variables (no secrets)
└── README.md
```

---

## Getting Started

> These steps are placeholders until the codebase is in place.

### Prerequisites

<!-- TODO: list required versions (e.g. Node.js, Python, PostgreSQL) -->

### 1. Clone the repository

```bash
git clone <!-- TODO: repository URL -->
cd LARP-Project
```

### 2. Install dependencies

```bash
# TODO: confirm commands once the stack is chosen
cd frontend-web && npm install
cd ../backend && pip install -r requirements.txt
```

### 3. Set environment variables

Copy `.env.example` to `.env` and fill in the values. Never commit `.env`.

```bash
ANTHROPIC_API_KEY=your-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/larp
# TODO: add any further variables
```

### 4. Run locally

```bash
# TODO: confirm commands once the stack is chosen
# Backend
cd backend && uvicorn main:app --reload
# Web app
cd frontend-web && npm run dev
```

---

## Team and Contributions

| Name | Role | Contributions |
| --- | --- | --- |
| Tomas Truyols | Product Manager | <!-- TODO: contributions --> |
| <!-- TODO: name --> | <!-- TODO: role --> | <!-- TODO: contributions --> |
| <!-- TODO: name --> | <!-- TODO: role --> | <!-- TODO: contributions --> |
| <!-- TODO: name --> | <!-- TODO: role --> | <!-- TODO: contributions --> |

---

## Licence

<!-- TODO: choose a licence (e.g. MIT) and add a LICENSE file -->
