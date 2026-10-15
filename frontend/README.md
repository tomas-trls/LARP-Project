# LARP front end (v2)

React + Vite + Tailwind. Built from the design in `UI Design/LARP App Screens.dc.html`.

## Run it
```
cd frontend
npm install
npm run dev        # then open http://localhost:5173
```
Best viewed at phone width. On a laptop the app shows as a phone-sized column.

## Where things are
| Path | What it is |
|---|---|
| `src/App.jsx` | The list of pages and their addresses (numbers match the design's screens) |
| `src/pages/` | One file per screen: Intro, SignUp, ProfileCreator, Review, Personality, Interests, CareerPath, WorkValues, Areas, Gaps, Home, Opportunities, People, Connections, Societies, Messages, Profile |
| `src/components/` | Shared pieces (Screen, TabBar, StepHeader, Mascot, Icon, BottomSheet, ui.jsx) and per-area folders (onboarding, career, home, people) |
| `src/index.css` | Colours (dark and light), fonts and animations from the design |
| `src/profileStore.jsx` | The student's answers and choices, saved in the browser (localStorage) |
| `src/sampleData.js` | The one place screens get data from |
| `src/data/*.json` | Real UCL sample data, made by `scripts/build_sample_data.py` |
| `src/data/*.js` | Made-up but realistic data: jobs, people, messages, career areas |

## Sample data
The JSON files come from `../Sample data/` (SU events, UCL Careers events and services, student groups).
After changing those files, run from the project root:
```
python3 frontend/scripts/build_sample_data.py
```

## Not connected yet
These screens don't call the back end yet. `src/api.js` and `src/useApi.js` are ready for when the endpoints in `docs/BACKEND_REPLAN.md` exist: change the matching function in `src/sampleData.js` and the screens stay the same.
"Reset demo" on the Profile screen clears the saved answers.
