// Builds the Home event feed from the real UCL sample data.
//
// Two sources are merged into one list:
//   - UCL Careers events (careerEvents.json)          -> shown under "Careers"
//   - Students' Union "What's Happening" (events.json) -> "Social" or "Societies"
//
// Every event gets a score and a "why" line. The rules are simple on purpose, so the reason
// shown on screen is always the real reason the event was picked:
//   Careers:  matches your route (5) > builds one of your skills (4) > a core career skill (3)
//             > an employer presentation or fair (2)
//   SU:       matches a hobby you picked (4) > an easy social: food, games, a night out (2)
// Everything else scores 0 and is left out (for example a pilates class when you didn't pick fitness),
// so the feed stays short and every event on it has a real reason.
import { careerEvents, suEvents, todayISO, upcoming } from '../../sampleData.js'

// Words in an event title that link to each hobby on screen 06.
// A hobby that isn't listed here is matched by its own name.
const HOBBY_WORDS = {
  bouldering: ['boulder', 'climb'],
  football: ['football', 'futsal'],
  clubbing: ['club night', 'clubbing', 'party', 'rave', ' dj'],
  gaming: ['gaming', 'esports', 'video game'],
  cooking: ['cook', 'baking', 'bake', 'food'],
  snowboarding: ['snow', 'ski'],
  running: ['run ', 'running', '5k', 'marathon'],
  techno: ['techno', ' dj', 'rave'],
  gym: ['gym', 'strength', 'hiit'],
  padel: ['padel', 'tennis'],
  chess: ['chess'],
  hiking: ['hike', 'hiking'],
}

// Career events about these topics help on any route. Each maps to a short "why".
const CORE_SKILLS = [
  ['networking', 'Practise networking before the fairs'],
  ['linkedin', 'Sharpen your LinkedIn profile'],
  ['interview', 'Interview practice for your applications'],
  ['assessment', 'Prepares you for assessment centres'],
  ['case', 'Case practice for consulting rounds'],
  ['cv', 'Makes your CV stronger'],
  ['application', 'Help with your applications'],
  ['fair', 'Meet many employers in one go'],
]

// Students' Union categories that count as an easy social.
const SOCIAL_CATEGORIES = ['Socials & Food', 'Games & Hobbies', 'Nightlife & Parties']

// Removes the emoji from a hobby label: '🧗 Bouldering' -> 'Bouldering'
export function hobbyName(label) {
  return label.replace(/^[^A-Za-z]+/, '').trim()
}

function includesAny(text, words) {
  return words.find((w) => text.includes(w))
}

// "On Campus: Canary Wharf Level 49, 49.02E Seminar Room" -> "Canary Wharf Level 49"
function shortPlace(location, mode) {
  if (/virtual|online/i.test(mode) || /virtual|online/i.test(location)) return 'Online'
  return location.replace(/^on campus:\s*/i, '').split(',')[0].trim()
}

// "SU · Phineas bar" -> "Students' Union", "Hiking Club" stays "Hiking Club"
function shortHost(organiser) {
  if (/^SU ·|^Students' Union/i.test(organiser)) return "Students' Union"
  return organiser.replace(/\s*\(Students' Union UCL\)/i, '')
}

function looksLikeSociety(organiser) {
  return /society|club|soc\b|network/i.test(organiser) && !/^SU ·|^Students' Union|Project Active|TeamUCL/i.test(organiser)
}

function scoreCareerEvent(e, profile) {
  const title = ` ${e.title.toLowerCase()} ${e.series.toLowerCase()} `
  const route = profile.activeRoute
  // The route's main word ("product" from "Product Manager") plus closely related topics.
  const routeWords = [route.split(' ')[0].toLowerCase(), ' data', ' ai ', 'digital', 'fintech']
  const routeHit = includesAny(title, routeWords)
  if (routeHit) return [5, `On your ${route} route · ${routeHit.trim() === 'ai' ? 'AI' : routeHit.trim().toLowerCase()} focus`]

  const skill = profile.cv.skills.find((s) => title.includes(s.toLowerCase()))
  if (skill) return [4, `Builds ${skill}, which your route asks for`]

  const core = CORE_SKILLS.find(([word]) => title.includes(word))
  if (core) return [3, core[1]]

  if (/employer presentation|pop-up|careers fair/i.test(e.series)) return [2, 'Meet employers and ask questions in person']
  return [0, '']
}

function scoreSuEvent(e, profile) {
  const title = ` ${e.title.toLowerCase()} `
  for (const label of profile.interests.on) {
    const name = hobbyName(label)
    const words = HOBBY_WORDS[name.toLowerCase()] ?? [name.toLowerCase()]
    // A night out (from 20:00) also counts for clubbing.
    if (includesAny(title, words) || (name === 'Clubbing' && e.category === 'Nightlife & Parties' && e.start >= '20:00')) {
      return [4, `You listed ${name.toLowerCase()}`]
    }
  }
  if (SOCIAL_CATEGORIES.includes(e.category) && e.category !== 'Nightlife & Parties') return [2, 'Easy way to meet people']
  if (e.category === 'Nightlife & Parties' && e.start >= '19:00') return [2, 'A night out with other students']
  return [0, '']
}

// Returns every event worth showing, soonest first, in one shape:
// { id, date, start, end, title, place, host, kind: 'Careers'|'Social'|'Societies', score, why, action: 'Book'|'Join' }
export function buildFeed(profile, fromDate = todayISO()) {
  const careers = upcoming(careerEvents, fromDate).map((e) => {
    const [score, why] = scoreCareerEvent(e, profile)
    return {
      id: e.id,
      date: e.date,
      start: e.start,
      end: e.end,
      title: e.title,
      place: shortPlace(e.location, e.mode),
      host: e.organisation || 'UCL Careers',
      kind: 'Careers',
      tag: /network/i.test(e.title) ? 'Networking' : /fair/i.test(e.title) ? 'Careers fair' : e.series.split(' ')[0] === 'Career' ? 'Skills' : 'Employer',
      score,
      why,
      action: 'Book',
    }
  })

  const su = upcoming(suEvents, fromDate).map((e) => {
    const [score, why] = scoreSuEvent(e, profile)
    return {
      id: e.id,
      date: e.date,
      start: e.start,
      end: e.end,
      title: e.title,
      place: e.location.split(',')[0].trim(),
      host: shortHost(e.organiser),
      kind: looksLikeSociety(e.organiser) || e.category === 'Society event (general)' ? 'Societies' : 'Social',
      tag: e.category.split(',')[0],
      score,
      why,
      action: 'Join',
    }
  })

  return [...careers, ...su]
    .filter((e) => e.score > 0)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}

// 'YYYY-MM-DD' that is n days after the given date.
export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
