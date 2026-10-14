# Student Platform: Build Brief for Claude Code

Oct 13, 2026 · @Ahmed

## How to use this brief

This brief is the main input for Claude Code planning. It works alongside two other documents, and only the first two go to Claude Code.

| Document | Purpose | Give to Claude Code? |
| --- | --- | --- |
| Build Brief (this one) | Hackathon rules, idea, business case, front end, build steps, demo plan | Yes |
| Backend Spec | Data model, matching, event pipeline, API, back-end build steps. Written to be sent to the team on its own | Yes |
| Backend Knowledge Guide | Plain-English explanations and likely judge questions | No, for human reading only |

The owner is a first-time coder building the whole product (back end and front end) with Claude Code, partly for learning. The back-end material is kept separate so it can be sent to the team.

Working method, kept small to save tokens:

1. Export both documents as Markdown into a `docs` folder in the project and add a short `CLAUDE.md` that tells Claude Code to read them.
2. Build one step at a time (see Build steps). Start each step in a fresh session so old context is not re-read.
3. For every step, ask for a plan first, approve it, then build, run and test.
4. Tell Claude Code to read only the section a step names, not the whole document.
5. Commit to git after every working step so a bad step can be undone.

Suggested starting `CLAUDE.md`:

```markdown
# Project rules
- Read docs/BRIEF.md and docs/BACKEND_SPEC.md only for the section the current step names.
- Work on one step at a time. Plan first, then build, then run it and test it.
- Keep code simple and commented. The owner is a first-time coder and wants to understand it.
- Stack: FastAPI + SQLite (back end), React + Vite + Tailwind (front end).
- Never auto-send LinkedIn requests. Never store passwords in plain text.
```

## Hackathon details

The event gives only about 1.5 hours of building on the day, so most of the build has to happen before Friday.

| Item | Detail |
| --- | --- |
| Event | Claude Campus Hackathon + Showcase, run by UCL Entrepreneurs and Claude Builder Club UCL |
| When | Friday 16 October 2026, 5pm to 8pm |
| Where | UCL IOE, Room W3.08 |
| Our track | Better Student Life: make student life easier, more enjoyable or more connected (ideas listed: budgeting, deadlines, study partners, discovering events) |
| Team size | Solo or up to four people |
| Building time | Start before the event. About 1.5 hours of building, support and final improvements on the day, then showcase demos for judging |
| Submission | Demo and a pitch or short walkthrough video, due 7:20pm on the day |
| Provided | Free pizza, $25 API credits, a live Claude demo, networking, project showcases |
| Eligibility | Current UCL students only. One ticket per person. Places are limited and subject to approval |
| Bring | Laptop and charger |

Judging criteria are not published. Working assumption: a real student problem, a demo that works, good use of Claude, and a clear pitch.

Before the event, confirm that every team member is a current UCL student with an approved ticket.

| Date | Focus |
| --- | --- |
| Tue 13 Oct | Planning documents finished, Claude Code project set up |
| Wed 14 Oct | Back end core: database, questionnaire, matching |
| Thu 15 Oct | Events data, front end, record a backup demo video |
| Fri 16 Oct | Morning polish. Arrive for 5pm. Final improvements, then submit by 7:20pm |

## Idea brief

A platform that takes a UCL student from "I don't know anyone" to "I'm meeting my group on Thursday". It starts with UCL and links students with similar interests into groups for social events, networking and services. The product name is still to be decided.

**Three pillars** (these become the three cards on the landing page):

- **Network:** CV and career improvement, professional connections, career events. The card shows a professional-looking photo.
- **Connect:** the social side, with small interest-based groups and social events.
- **Learn and get help:** tutoring, miscellaneous tasks, and hiring students for projects and small jobs (for example actors for a student film, a software developer, business help).

**How it works**

1. A student takes a 3-minute questionnaire.
2. They register.
3. They choose to be auto-paired, to browse close matches, or both.
4. They receive events matched to their interests, goals and campus.

**Pairing: both modes.** Auto-pairing puts the student in a small group of 4 to 6 tied to a first event. Browsing shows ranked close matches for one-to-one needs such as tutoring, project help and networking. Both use the same scoring function, so it is built once.

**LinkedIn Max.** A feature that pairs a user with other opted-in people on the platform so they can add each other on LinkedIn quickly and reach the 500-connection mark. The app shows matched people with their LinkedIn links and the user clicks through. It never sends requests automatically, because LinkedIn prohibits automation. Sharing a profile is opt-in.

**Phase 1 scope.** Recommend UCL events and career events near the UCL main campus and Canary Wharf, plus social events in the same areas. More students are on the main campus, so it gets more events and venues.

**Development challenges**

- Event procurement: scraping the UCL Students' Union plus nearby events, tailored to Canary Wharf.
- The linking questionnaire and the matching logic.
- A simple, enjoyable user experience.

## Business perspective

The product is worth building only if it gets students to real meetups, not if it lists events. Every point below tests that.

**The problem.** UCL is large and commuter-heavy. The Students' Union offers breadth but not curation, and it works best in freshers' week. Postgraduates, international students, commuters and late joiners miss the early bonding. Students who need small paid help, such as tutoring or project work, have no trusted place to find it. Career-minded students also lack warm connections.

**Value beyond the SU hub**

- The SU tells you what is on. We tell you who to go with.
- Success is "you met 3 people", not "you browsed 40 events".
- Verified UCL students give trust for tutoring and hiring.
- Reach beyond the SU: nearby events and Canary Wharf.
- A career layer (CV, networking, LinkedIn Max) that the SU hub does not offer.

**Cold start.** A matching platform is useless below critical mass. Launch in one tight niche first, for example UCL postgraduates or one faculty, and seed through societies and course reps. Avoid a broad launch.

**Who pays**

| Revenue line | Who pays | Note |
| --- | --- | --- |
| Recruiter access to opted-in students | Employers, graduate recruiters | Likely the strongest line. Test willingness to pay before building |
| Sponsored events | Venues, employers, brands | Fits both the social and career sides |
| Commission on services | Students and student hirers | Tutoring and small jobs. Needs payments and clear rules |
| Premium tier | Students | Later. Students have little money |

**Risks**

- Safety and trust: meeting strangers and paid services need verification, reporting and moderation.
- Data protection: questionnaire and CV data fall under UK GDPR.
- Scraping: SU data may breach their terms, so a real launch needs a partnership or public feeds.
- Services: payments, liability and the tax status of gig work.
- Competition: Bumble BFF, Meetup, society WhatsApp groups and Instagram.

**Metrics that matter.** Sign-up to first-meetup conversion, week-4 retention, and groups still active after 30 days. Acquisition cost should be near zero through societies and word of mouth.

**Scaling.** UCL first, then other London universities, then other cities. Dense clusters matter more than breadth.

**One-line pitch.** "We take students from 'I don't know anyone' to 'I'm meeting my group on Thursday.'"

## Product flow and front end

Students answer the questionnaire before they register, then choose how to be paired.

&#91;embedded content: product flow · 8 steps, 1 branch\]

The highlighted step is the core of the product: a small group with a first event to attend. Browsing uses the same scores for one-to-one needs.

**Landing page.** The site assumes a new visitor. It shows three cards: Network (a professional-looking photo, for CV and career improvement), Connect (the social side) and Learn and get help (tutoring and hiring students). Under the cards: "Take a 3-minute questionnaire to be paired with similar people and relevant events". Further down: "Or log in if you're already a user".

**Screens**

1. Landing page.
2. Questionnaire: one category per screen with a progress bar.
3. Registration.
4. Pairing choice: auto-pair, browse, or both.
5. My group: members, what they share, suggested first event.
6. Browse matches: ranked cards, each with the reason for the match.
7. Events feed: career, social and venues tabs, with a campus-area filter.
8. LinkedIn Max: opted-in matches with links out to LinkedIn.
9. Profile and settings: edit answers, campus, alcohol preference, opt-ins.

**Design principles**

- Simple and enjoyable: mobile first, one question per screen, big tap targets, friendly plain language.
- Always show why: every match and event carries a one-line reason.
- Groups first, not swipe first, so the product does not feel like a dating app and quiet users are not stranded.
- Phase 1 content: UCL events and career events near the main campus and Canary Wharf, plus social events in the same areas.

**Front-end stack.** React with Vite and Tailwind, calling the back end's API (see Backend Spec, API endpoints). Build against mock data from the seed profiles first, so the front end can run before the back end is finished.

## Questionnaire (version 2)

The questionnaire has about 10 questions across 6 or 7 screens, takes 3 minutes, and is mostly taps. Campus and alcohol preferences are now soft signals rather than hard filters.

| # | Question | Answer type | Used for |
| --- | --- | --- | --- |
| 1 | Where are you mostly based? Main campus, Canary Wharf, or both. Plus a toggle: happy to travel to the other campus (default on) | Single choice + toggle | Event and people proximity (soft) |
| 2 | What course? | Dropdown | Course similarity |
| 3 | What year? | Dropdown (year 1 to 4, Masters, PhD) | Stage similarity |
| 4 | Prior work experience? None, or an industry plus an optional one-line description (company and what you did) | Dropdown + optional text | Networking match. The text is display only |
| 5 | Interests, up to about 8 across four categories (below) | Tap chips from fixed lists | Core matching |
| 6 | Alcohol and events (three options, below) | Single choice | Event ranking, group event choice |
| 7 | Are you here for career events, social events, or both? | Single choice | Goal match, event type |
| 8 | I'm looking for: tutoring, hiring (actors for a student film, software developer, business help and so on), project teammates, mentor or CV review | Dropdown, skippable | Needs and offers matching |
| 9 | I can offer: same list | Dropdown, skippable | Needs and offers matching |
| 10 | When are you usually free? Weekdays, weeknights, weekends | Multi-select, optional | Meetup timing (soft) |
| 11 | Registration: name, UCL email, LinkedIn link (optional, needed for LinkedIn Max), password | Form | Account |

**Interest categories (question 5).**

- Academic and professional: finance, tech, data, law, consulting, healthcare, entrepreneurship and similar.
- Sport: padel, football, gym, running and similar.
- Hobbies: chess, board games, photography, music, film and similar.
- Just here for fun: parks, bowling, live music, bars, clubs, food nearby.

The full tag list (about 30 to 40 tags) and the tag groups are in the Backend Spec.

**Alcohol and events (question 6).** Many non-drinkers like going to bars and pubs for socials, so this is a preference, not a ban:

- I drink and enjoy bar and club nights.
- I'm happy at bars and pubs but I don't drink.
- I'd rather avoid alcohol-focused events.

Only the third answer hides events, and only events where alcohol is the main point (club nights, pub crawls, tastings). The first two answers hide nothing. Rules are in the Backend Spec.

**Campus (question 1).** Cross-campus meetups are a feature, because people may actually want to meet across campuses. Same-campus gets a small bonus in scoring. Different-campus is never excluded. Users who tick "happy to travel" get no campus bonus at all.

**Screen layout.** One category per screen with a progress bar ("Step 3 of 7"). It works better on mobile and feels shorter. Answers are held in the browser until registration, so a user who drops out leaves no account behind.

**CV upload.** Not in the questionnaire. It adds friction and UK GDPR duties. Offer it later, inside the Network pillar.

## Matching and recommendation logic (summary)

People are scored by graded similarity, and the same function ranks events. The full formulas, weights and group-building steps are in the Backend Spec, section "Matching engine".

- **Graded tag similarity.** Same tag scores 1.0. A related tag in the same parent group (finance and data are both Academic) scores 0.5. Unrelated scores 0.
- **Weighted total.** Interests 40%, goals 20%, course or field 20%, experience and year 10%, alcohol and vibe 10%.
- **No broad hard filters.** Campus and alcohol preference both act as weights. The only exclusion is an explicit opt-out the user chose, such as hiding alcohol-focused events.
- **Goal-aware logic.** Social matching favours similar people. Networking can favour complementary people (a finance student with a data student). Tutoring and hiring match "looking for X" to "offers X". The demo uses similarity everywhere and shows the others as roadmap.
- **Two modes, one function.** Auto-pair turns top scores into a group of 4 to 6. Browse returns the same scores as a ranked list.
- **Group event rule.** A group's suggested first event must respect the strictest alcohol preference among its members.
- **Speed.** Compare each new user once against existing users and store their top 20 matches. At hackathon scale this takes milliseconds.

## Events, career events and venues

The demo needs real events, and a large share must be real career and work events, because career is one of the three pillars. Event sources are scraped or hand-curated, then tagged and stored.

**Sources, in order of priority**

1. UCL Students' Union events page: the primary scrape. Check for an iCal, RSS or JSON feed first, and check robots.txt and the terms. A real launch would use a formal agreement.
2. UCL Careers and employer events, where publicly listed.
3. Society events listed through the SU (finance, consulting, tech, law and similar societies).
4. External career and networking events near Bloomsbury and Canary Wharf, found through public listing sites and AI search. Verify each is current.
5. External social events near both areas, found the same way.
6. A hand-curated JSON file of 40 or more real events as the fallback. A demo that depends only on live scraping can fail with the clock running.

**Dated event targets** (upcoming four to six weeks, split by where the user is based):

| Event type | Main campus area | Canary Wharf area |
| --- | --- | --- |
| Career: society career and networking events | 20 | 3 |
| Career: UCL Careers and employer events | 12 | 3 |
| Career: external talks, meetups, fairs | 10 | 10 |
| Social: SU and society events | 25 | 3 |
| Social: external community events | 8 | 5 |

These are targets, not requirements. The minimum viable demo is 40 dated events, at least 40% of them career, and at least 8 in the Canary Wharf area.

**Venues** are always-available suggestions, not dated events. They are stored separately (bowling, food, bars, parks, padel and so on), with more near the main campus and fewer near Canary Wharf. Food gets the most. The full quota table of about 63 venues is in the Backend Spec.

**Linking events to interests.** Each event gets up to 3 interest tags from the same tag list used for people. A keyword dictionary does the first pass (a quant event maps to finance), and Claude classifies the ambiguous ones. The detail is in the Backend Spec.

**Alcohol flag.** Each event is also marked as alcohol central, alcohol optional or no alcohol, so non-drinkers can still see pub quizzes and bar socials.

## Build steps for Claude Code

The build is ten small steps. Each is meant to fit in one short session, with a working result at the end, so a failed step costs little.

| Step | Goal | Read this section | Done when | Size |
| --- | --- | --- | --- | --- |
| 0 | Project setup: repo, folders, `CLAUDE.md`, Python and Node installed, git | Brief: How to use | Both apps start with a hello page | S |
| 1 | Database and models: tables, interest tags, tag groups | Backend Spec: Data model, Questionnaire data | Tables exist and tags are loaded | S |
| 2 | Questionnaire endpoint and 30 to 40 fake student profiles | Backend Spec: API, Seed data | Submitting answers saves them. Seed profiles load | M |
| 3 | Matching engine: scoring function with tests, then match and group endpoints | Backend Spec: Matching engine | Tests pass. A new user gets a ranked list and a group | L |
| 4 | Events from the hand-curated JSON file, plus event recommendation endpoint | Backend Spec: Event recommendation | Recommended events differ by user and campus | M |
| 5 | Scraper for the UCL SU events, Claude tagging, venues loaded | Backend Spec: Event pipeline | Nightly refresh works and falls back to the curated file | L |
| 6 | Front end: landing page with three cards, call to action, login link | Brief: Product flow | Page matches the design description | M |
| 7 | Front end: questionnaire screens with progress bar | Brief: Questionnaire | Answers reach the back end | M |
| 8 | Front end: registration, pairing choice, group, browse list, events feed | Brief: Product flow | Full journey works with real back-end data | L |
| 9 | LinkedIn Max screen, polish, demo data check, backup video | Brief: Demo plan | Demo runs end to end twice without errors | M |

Size is a rough guide to how much work and token use a step needs: S small, M medium, L large.

**Prompt template for every step**

```markdown
Read CLAUDE.md. Then read only the section(s) named for Step N in docs/.
Enter plan mode and propose a plan for Step N only. Wait for my approval.
After approval: implement, run it, write tests where the step says so,
and tell me in plain words how I can check it myself.
Do not start the next step.
```

**Model plan** (Claude Pro, so usage is limited and shared across chats and Claude Code; check your usage in the app as you go):

| Task | Suggested model | Why |
| --- | --- | --- |
| Planning each step, reviewing the matching design, debugging hard problems | Claude Opus 5.5 | Strongest reasoning, used sparingly |
| Building most steps, writing tests, front end work | Claude Sonnet 5.5 | Fast and efficient, saves your allowance |
| Tagging and classifying events inside the app at run time | Claude Haiku 5.5 | Cheapest, and good enough for short classification |

The $25 API credits arrive at the event and are separate from the Pro allowance. They suit the app's own Claude calls (event tagging, a matching explanation). Check how they are issued on the day before relying on them for Claude Code.

## Demo and pitch plan

Show one tight journey in about 3 minutes, then cover business, risks and roadmap in 2 or 3 slides. The demo should never depend on live scraping or a live internet connection.

**Demo path**

1. Landing page with the three cards. One line on each pillar.
2. Start the questionnaire. Use a pre-filled profile so it takes seconds on stage.
3. Register and show the pairing choice.
4. Auto-pair: the group appears with a suggested first event ("your group meets Thursday at X").
5. Browse: the ranked list of close matches, with a reason for each match.
6. Events feed: career tab (Canary Wharf and main campus), social tab, venues.
7. LinkedIn Max: opted-in matches with links.

**Pitch slides**

1. The problem and who feels it.
2. Why not just the SU hub: who to go with, not only what is on.
3. Business model: recruiters and sponsors first, then commission.
4. Risks and how we handle them: cold start, safety, data protection.
5. Roadmap and the one-line pitch.

**Checklist**

- Seed profiles and curated events loaded and tested.
- Backup walkthrough video recorded on Thursday night, in case the live demo fails.
- Submission (demo and pitch or video) ready before 7:20pm.
- Laptop, charger, and every team member's ticket confirmed.
- Judge questions: read the Backend Knowledge Guide.

## Open decisions and roadmap

Several choices are still open. None blocks the build, and each has a default so Claude Code can proceed.

| Decision | Default for the hackathon |
| --- | --- |
| Product name | Working title until chosen |
| Stack | FastAPI + SQLite back end, React + Vite + Tailwind front end |
| Same-campus bonus size | Small bonus (see Backend Spec). Cross-campus never excluded |
| Groups mix campuses by default? | Yes, if members ticked "happy to travel" |
| UCL email verification | Check the @ucl.ac.uk domain only. No email sending in the demo |
| UCL East (Stratford) and other sites | Out of scope in phase 1 |
| Recruiter dashboard in the pitch | Slide only, not built |
| SU scraping permission | Assumed fine for a hackathon. Real use needs an agreement |
| Who builds the front end | The owner builds it with Claude Code. The team can take over later |

**Roadmap beyond the hackathon**

1. **Pilot:** one UCL niche (for example postgraduates) via societies. Measure sign-up to first-meetup conversion.
2. **Partnerships:** an agreement with the Students' Union for event data, and a paid test with one recruiter or sponsor.
3. **Smarter matching:** complementary matching for networking, text embeddings for the free-text answers, and learning from which matches actually meet.
4. **Services:** payments, ratings and moderation for tutoring and small jobs.
5. **Expansion:** other London universities, then other cities.
