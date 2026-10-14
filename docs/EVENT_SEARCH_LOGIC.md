# How LARP finds events: the search logic in plain English

This explains, step by step, how the app looks for student events around UCL and Canary Wharf, why each
step exists, and how to swap in a different strategy. The code that does this lives in
`backend/app/pipeline/`. The wording here matches the code; if you change one, change the other.

---

## The big picture

Events come from **sources**. Every source does the same job: hand back a list of events for a date window.

| Source | What it does | Needs internet? | Needs the API key? |
|---|---|---|---|
| `su_whats_on` | Reads the Students' Union UCL event listings | yes | no |
| `category_sweep` | **The search** (this document): searches the web by category and place, then checks every page | yes | yes |
| `curated_file` | Reads `backend/app/seed/events_curated.json`, the events a person has checked by hand | no | no |

Whatever a source finds goes through the same clean-up: tidy times (London time), work out the area,
decide career or social, decide how much alcohol is involved, pick up to 3 interest tags, then save. A source
that breaks is logged and skipped. **It never deletes events we already have**, and the hand-checked file is
always merged in last, so the app always has something to show.

---

## The search strategy `category_sweep`, step by step

**1. Decide the window.** From today to 30 days ahead (change with `EVENT_WINDOW_DAYS` in `.env`).
Anything dated outside the window is thrown away.

**2. Decide the places, in this order.**
1. **UCL, Bloomsbury**: search words "UCL Bloomsbury London WC1".
2. **Then Canary Wharf**: search words "Canary Wharf London E14".

UCL is searched first, Canary Wharf after it. (The lists are in `search_plan.py`.)

**3. Decide the categories.** One search per category in each place. The 12 categories are exactly the 12
interest subgroups from `tags.json`, so everything found already fits our tag list:

| Category | Searched with | Words used for this category |
|---|---|---|
| Business and quant | career wording | finance banking consulting entrepreneurship data analytics |
| Tech | career wording | software AI machine learning product design tech |
| Law and society | career wording | law politics policy sustainability |
| Health and science | career wording | healthcare biomedical science engineering psychology |
| Racquet sports | social wording | padel tennis |
| Team sports | social wording | football basketball |
| Fitness | social wording | gym running boxing fitness |
| Games and strategy | social wording | chess board games video games esports |
| Creative | social wording | photography music film theatre writing |
| Food and drink | social wording | food cafes street food supper club pub |
| Nightlife and music | social wording | club night live music gig |
| Activities | social wording | bowling arcade parks outdoors museum comedy |

That is 12 categories x 2 places = **24 searches**.

**4. Write each search sentence.** It is: *category words* + *wording for career or social* + "for students" +
*place words* + *the months of the window*. The wording is:
- career: `talk networking fair workshop panel employer event`
- social: `social meetup night tournament class`

Example (first search of a run):
> finance banking consulting entrepreneurship data analytics talk networking fair workshop panel employer event for students UCL Bloomsbury London WC1 October November 2026

**5. Run the search and keep the top 5 results as candidates.** A candidate is only a *link*. Links are not facts.
The search engine is told to prefer an event's own page (Eventbrite, Meetup, a university or student union page, an
employer's student-events page, a venue's own site) over list pages and articles.

**6. Throw out obvious junk before opening anything.**
- a link we have already seen in an earlier search (the same page found twice is counted once);
- links that look like lists, searches or articles rather than one event (for example `/search`, `/blog`, `/category`,
  an Eventbrite `/d/place/topic/` page, a site's front page).

**7. Open every remaining candidate and check it.** This is the step that stops made-up or out-of-date results.
The page must pass **all** of these, otherwise it is dropped and the reason is written down:
1. the page loads, and the site's `robots.txt` allows us to read it;
2. it carries machine-readable event data (schema.org "Event"), so the date is a *fact* and not a guess;
3. it has a title and a start date;
4. the start date is inside the window (an event later today still counts);
5. it is not online-only (mixed online + in-person is fine);
6. the place is in or near one of our two areas (UCL Bloomsbury or Canary Wharf).

**8. Keep facts only.** Title, date and time, place, link, a short description, and the date we checked it.
No ratings, reviews or long copied text.

**9. Hand over.** The survivors go through the same clean-up and saving as every other source. One failed search or
one dead page never stops the rest. After a run, `backend/last_search_notes.txt` lists every query and, for every
page, whether it was kept or dropped and why.

### Why these choices
- **Categories come from our own tags**, so the events line up with student interests and the matching works.
- **"Check every page"** exists because search results can be old, wrong, or invented. A search result is a lead, not proof.
- **Places in order** because most students are at UCL and the demo needs main-campus events first; Canary Wharf is the second pass.
- **Top 5 per search** keeps cost and time down. The search engine costs money per search, so there is also a cap on searches per query.

---

## How to change the strategy (swapping it for another)

The strategy is chosen by **name**, in `.env`:

```
EVENT_FINDER=category_sweep          # WHAT to search and how to judge results
EVENT_SEARCH_PROVIDER=anthropic_web_search   # WHICH search engine runs each query
```

- Built-in strategies: `category_sweep`, `curated_file`.
- Built-in search engines: `anthropic_web_search` (needs `ANTHROPIC_API_KEY`), `fake` (for tests, no internet).
- A wrong name stops with a clear message listing the valid ones.

**To add your own strategy** (for example "visit every society's page" or "watch a fixed list of listing pages"):
1. Create `backend/app/pipeline/finders/my_strategy.py`.
2. Write a class that extends `EventFinder` and has a `find(window, areas, categories)` method returning a list of `RawEvent`.
3. Put `@register_finder("my_strategy")` above the class.
4. Add one import line to `backend/app/pipeline/finders/__init__.py`.
5. Set `EVENT_FINDER=my_strategy` in `.env`.

Nothing else changes: the clean-up, tagging, saving, safety net and tests all work for any strategy.
The same four steps (with `register_provider` and the `providers` folder) add a different **search engine**.
The places and categories are plain lists in `search_plan.py`; you can edit them without touching any logic.

---

## The Students' Union source `su_whats_on`

- **What we found:** the main "What's on" page is drawn by JavaScript, and the data address behind it answered
  with an error when asked directly. But the site also has plain, server-rendered listing pages by tag, for example
  `https://studentsunionucl.org/tags/careers`: 25 events per page, in date order, each with title, date, time, a short
  description and a link. `robots.txt` does not block them and sets no crawl delay, so no headless browser is needed.
- **What it does:** reads the tag pages in `LISTING_TAGS` (`careers`, `free`, `wellbeing`, `fitness`, `beginner-friendly`),
  one page every 2 seconds, until the dates pass the end of the window. Events found under several tags are counted once.
  The address of an event decides its kind: `/jobs-skills/` = career, `/sport/` = social, `/bars/` = social with alcohol available.
  The listing gives no room, so an event is placed at UCL Bloomsbury unless its text mentions Canary Wharf.
- **Politeness:** names itself in the User-Agent with the contact you put in `SCRAPER_CONTACT`, refuses to run without one,
  checks `robots.txt`, waits between requests, reads only event details.
- **Terms of use:** no website terms page was found on the Students' Union site (the footer links only to an accessibility
  statement and a privacy policy). A real launch should use a formal agreement with the Students' Union.

---

## What happened when this logic was run by hand on 14 October 2026

The 24 searches above were run by hand (the live engine needs your API key), and every result was then checked.
Honest results:

- **Events kept: 58** (26 career, 32 social; 4 around Canary Wharf). The spec's targets were 40+ events (met),
  at least 40% career (met, 44%) and at least 8 around Canary Wharf (**not met: 4**).
- **Why Canary Wharf is thin:** almost every Canary Wharf result was a past event, a different city, a paid or invite-only
  industry event, or had no date I could confirm. I did not pad the list.
- **How each event was checked** is written in its `verification` field in `events_curated.json`:
  Students' Union events were read from the listing pages (the individual event pages redirect to a login page for automated
  readers, so they were not opened); the three UCL Careers fairs were confirmed from a third-party listing (UCL's own site
  refuses automated readers with a 403); the Canary Wharf Friday night was opened on DesignMyNight.
- **Skipped on purpose:** events with no start time shown, women-only or invite-only events, events already past, and any
  page I could not read.
- **Venues: 40 of the 63 targeted.** They come from guide pages and listings (not individually opened); some come from older
  guides, flagged in the file. Opening hours were not checked.
