# LARP: Design Decisions

Agreed on 15 October 2026 in a design review of the product idea. Each decision lists the choice and, where it helps, why.
Where the code or README does not match yet, see [Not yet reflected](#not-yet-reflected) at the end.

---

## 1. Product focus

| Decision | Why |
| --- | --- |
| **Career first.** The social side supports it: networking and meeting people with similar interests, including within societies | Future Me is what makes LARP different. Meeting people alone is something societies already offer |
| **Short onboarding.** Sign up → CV → review → Career Path → first Future Me. Personality and hobbies are asked the first time a student opens People → Social or Event Groups | Career first means the career result comes first. Fewer steps before any value means fewer drop-offs |

---

## 2. Future Me

| Decision | Why |
| --- | --- |
| **Free-text roles.** Students type any role. Claude groups similar titles into one role (e.g. "Data Analyst" and "Data Analyst – Graduate") | Students are not limited to a fixed list |
| **20-advert minimum.** With fewer than 20 adverts, LARP shows "not enough data" and offers the closest common roles | Percentages based on a handful of adverts would mislead |
| **Weekly cache.** Each role's aggregated results are cached for a week | Keeps calls and costs down and gives demo mode a fallback |
| **One pipeline for both entry routes.** "Rate work values" makes Claude name candidate roles. Each goes through the same advert search and 20-advert check, and only roles that pass are offered among the 3–5 suggestions | No suggested role without data behind it |
| **One active route.** One Future Me route drives Home, Opportunities and the digest. Others are saved and can be switched with one tap | Several active routes would blur the recommendations and dilute progress |

---

## 3. Recommendations

| Decision | Why |
| --- | --- |
| **One shared vocabulary.** Jobs, events and societies are all tagged with the same skills and work values list as Future Me. Claude does the tagging | Without it, "builds X" is only true for jobs |
| **Ranking rule.** Each ideal missing characteristic is weighted by the share of adverts asking for it (e.g. SQL in 70% of adverts = 0.7). An item scores the sum of the weights of the characteristics it builds, plus a smaller share for matching work values. The "why" text names the top contributor | Simple, explainable and testable. The reason shown is the real reason it ranked |
| **Job filters.** Filter by level (internship, graduate, entry) and location. A self-reported "I need visa sponsorship" setting flags jobs where sponsorship is unknown or not offered ("check with employer") | Many School of Management MSc students are international. Job APIs do not reliably state sponsorship, so it is flagged rather than filtered |
| **Progress.** After an event the student taps "I went", then gets a prompt to add the result to their User Profile. Progress follows the User Profile | One tap is easy, and progress reflects real change rather than attendance counts |
| **Weekly digest.** A Monday email and Home section: new jobs and events that build the student's ideal missing characteristics, plus groups forming for them | Gives a career-first product a reason to return every week |

---

## 4. People

| Decision | Why |
| --- | --- |
| **People → Career.** Shows alumni who hold or held the student's active Future Me role, and students further along the same route, each with a reason | Connects the career engine to real people |
| **Alumni request limit.** Connections need mutual opt-in, and each alumnus sets how many requests they accept per month | Stops the few pilot alumni being flooded |
| **People → Social.** Recommends societies whose members share the student's interests, and shows members of the student's societies ranked by shared hobbies. Membership is self-reported | LARP cannot see SU membership lists |

---

## 5. Event Groups

There is no one-to-one matching for events. Students accept or decline a group, never an individual.

| Decision | Why |
| --- | --- |
| **Book first, then group.** The student books the event themselves on its own booking platform, then opts in on LARP to go with others | Works for any event that can be joined alone |
| **Trust-based booking.** "I've booked" is a button. Repeated no-shows can be flagged by group members. Linking with booking platforms is a later partnership | Uploading tickets adds friction for little gain |
| **Group size 3–5.** If a group falls below 3, it merges with another group for the same event or its members return to the pool | A group of 2 is one-to-one matching under another name |
| **Timing.** Matching runs as people opt in. The group chat opens once a group reaches 3. Matching closes 24 hours before the event: after that, people can leave but nobody new joins | Gives the group a settled moment to plan where to meet |

---

## 6. Messages

| Decision | Why |
| --- | --- |
| **Group chats and mutual connections only.** Each Event Group has a group chat. One-to-one messages are only possible after both people accept a connection | Matches the no-rejection principle and cuts down on unwanted messages |

---

## 7. Identity and alumni

| Decision | Why |
| --- | --- |
| **UCL email to sign up.** | Keeps LARP UCL-only |
| **LARP-run alumni handover.** From the start of final year, LARP asks students to add a personal email while their UCL email can still confirm who they are. At graduation the account becomes "Verified alumnus". A UCL invite route comes later as a partnership | Works from day one without waiting for UCL, and only accepts alumni whose UCL email was confirmed while it still worked |

---

## 8. Privacy

| Decision | Why |
| --- | --- |
| **Optional short Big Five check** for personality, self-reported and used for social matching only | The research standard and quick. MBTI is widely seen as unreliable. Social matching still works without it |
| **Hobbies and personality never used for jobs.** | Keeps social data out of career decisions |
| **Visibility.** Only signed-in, verified students and alumni can see profiles. Career fields appear in People → Career. Hobbies, personality and societies appear only in People → Social and Event Groups. Students can hide any field | Separates the career and social sides |
| **CV deleted after extraction.** Only the User Profile fields the student approves are kept | Data minimisation under UK GDPR |

---

## 9. Safety

| Decision | Why |
| --- | --- |
| **In the first version:** report, block, leave group and a code of conduct accepted at sign-up | Students meet strangers in person. UCL, societies and judges will ask about it |
| **One named moderator during the pilot** responds within 24 hours, using a warning → suspension → ban ladder | Someone has to own reports |

<!-- TODO: name the pilot moderator -->

---

## 10. Pilot success measures

The pilot runs with UCL School of Management students. Targets are set after the first two weeks, once a baseline exists.

| Measure | Definition | Target |
| --- | --- | --- |
| Activation | Share of sign-ups who reach their first Future Me | <!-- TODO --> |
| Usefulness | Share who save or act on at least one recommendation in their first week | <!-- TODO --> |
| Social | Share of Event Groups that reach 3 or more members and meet | <!-- TODO --> |
| Retention | Share still active after 4 weeks | <!-- TODO --> |

---

## Not yet reflected

These decisions differ from what is written or built today.

**README.md**
- Says groups have 3–6 people (now 3–5).
- Does not mention: the 24-hour cut-off, the alumni handover, the 20-advert minimum, the weekly cache, CV deletion, visa flags, the Big Five check, the weekly digest or the alumni request limit.

**Code**
- Groups are formed first (target 5, maximum 6, minimum 3) and an event is suggested afterwards. The agreed flow is the reverse: book an event, then join a group of at most 5.
- Check whether questionnaire answers used for matching mix career and social data, once the career and social sides are split.
