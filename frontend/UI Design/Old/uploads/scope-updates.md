# Overview

A campus-specific networking and careers app for UCL students.

**Problem.** Students have access to a large pool of peers, alumni, societies and careers services, but engagement is fragmented across Instagram, WhatsApp groups, society mailing lists and the UCL Careers portal. Most students under-use these channels because there is no single view of what is relevant to them, and cold outreach to peers or alumni is socially awkward.

**Solution.** A single app, gated to UCL accounts, that builds a structured profile from a CV and a short personality questionnaire, assigns the student a career route with AI-generated suggestions and a skills gap summary, and then uses that profile to rank and recommend across five areas: job opportunities from external platforms, peer and alumni networking, Students’ Union event pairing, society membership, and messaging. Every recommendation carries a short explanation of why it was shown.

**Target users.** UCL undergraduates and postgraduates, with alumni as a secondary group for networking supply.

**Value.** For students, lower effort to find relevant people and events, and a clearer path from degree to first role. For the university and societies, a channel with higher engagement than email and a view of which events and opportunities students actually act on.

---
# Design

## Colors

| Colour        | Hex       | Notes                                       |
| ------------- | --------- | ------------------------------------------- |
| Dark purple   | `#361A54` | Lead colour; text and backgrounds           |
| Off white     | `#FAFAFA` | UCL's white on screens                      |
| Paper white   | `#FFFFFF` | Pure white, used in print                   |
| Bright purple | `#993BFF` | Lead colour; pair with white only           |
| Mid purple    | `#BA82FF` | Use instead of bright purple on dark purple |
| Light purple  | `#DDBDFF` | Supporting/background colour                |
| Pale purple   | `#EEDEFF` | Supporting/background colour                |
| Heritage blue | `#30D6FF` | Accent; only on dark purple backgrounds     |
Have a light/dark switch toggle, where light mode has a off-white/white background and dark mode dark purple background


----

### Intro and sign up
Get people in with as little friction as possible.

* Typeform-style intro animation that plays and vibrates: *"Same campus. Just more connected"*
* Sign up with UCL SSO or university email verification, so every member is on the same campus

### Profile creator
Create a structured profile with as little effort as possible.

* Upload a CV (PDF/DOCX), parsed into education, experience, skills and interests, or manual entry via a short form for users without a CV or who prefer to type
* Review and edit step so users stay in control; profile can be finished later
* Personality questions to understand who the person is: introvert vs extrovert, agree/disagree statements like "I'm funny" or "I'm more logical than emotional", mindset, lifestyle, and optional relationship status and zodiac sign
* Hobbies and non-work interests: sports, gaming, etc.
* Final option to add a specific comment

### Career route engine
Turn a profile into a clear career direction.

* "Do you know your career path?" entry point: enter a target role from a searchable list, or let Claude suggest routes via a custom Claude skill
* Claude-suggested main target and adjacent roles based on the user's background, each with a short rationale
* Gap summary showing skills or experience that would strengthen an application
* Select a final role; save several routes and switch between them from Profile

### Home
Surface the one thing worth doing today.

* Suggested action of the day at the top
* Featured event box
* List feed of all upcoming events from Networking, Social and Societies
* "Why this was recommended" line on every feed item

### Opportunities
Surface the roles that matter for the chosen route.

* Graduate roles and jobs from LinkedIn, Indeed and other external job platforms
* Ranking against the user's target role and interests
* Short Claude-generated summary and a "why this was recommended" explanation for each item
* Notifications for new roles on a saved route

### Networking
Introduce users to students and alumni worth knowing.

* Custom networking (coffee, drinks) with other relevant members
* UCL Careers events, fairs and workshops
* Matching on shared career goals, profile similarity and interests
* Swipe-based or request-based connection, chosen by the user
* Mutual opt-in before messaging is unlocked
* Explanation of why each match was suggested

### Social and Students' Union
Make it easy to go to things with people.

* Get paired with others to attend Students' Union events together
* Pairing based on personality answers and hobbies rather than career data
* Follow people based on non-work interests such as hobbies or gaming

### Societies
One place for every society on campus.

* Societies listed by category, including a new "Academic" category
* Announcements and member-only areas
* Membership info and in-app membership purchase
* Ranked by fit to the user's profile
* Student rep role opportunities

### Messages
Keep conversations and opportunities moving. A better WhatsApp for university.

* One-to-one messaging between connected users
* Group chats for formed groups, specific events, social groups, and society general or custom channels
* Claude-generated conversation starters based on shared ground
* Notifications for new matches, messages, upcoming events and new roles on a saved route
* User-controlled notification preferences

### Profile
Show who you are on campus.

* Profile picture, bio and what you're studying
* Target career, with saved career routes and a switcher
* Gap summary for the active route
* Society badges and social badges
* Stats such as events attended

