// Group posts ("Going together"), their comments, and the events they point to.
// Home, People › Career and People › Social all read from here, so a group you join on one
// screen shows as joined on the others (as in the design, screens 10, 12 and 13).
//
// Events: each design event is matched to a REAL upcoming event in the UCL sample data
// (events.json or careerEvents.json) by a few words of its title. Only when no real event
// matches do we fall back to the design's own example (marked sample: true).
// The posts and comments themselves are made up.
import { careerEvents, suEvents } from '../sampleData.js'

// Colour of the little event block for each kind of event: [background, text].
export const CATEGORY_COLORS = {
  Networking: ['#993BFF', '#FFFFFF'],
  Careers: ['#BA82FF', '#361A54'],
  Workshop: ['#DDBDFF', '#361A54'],
  Social: ['#F1F3B8', '#361A54'],
  Outdoors: ['#C4F3E4', '#361A54'],
  Arts: ['#FFD6E8', '#361A54'],
  Culture: ['#FFE0B8', '#361A54'],
}

// The events that group posts are about.
//   find     = words that pick the real event (searched in 'su' = Students' Union or 'ce' = UCL Careers)
//   label    = a shorter title for long real titles (same event, just tidier)
//   fallback = the design's example, used only if no real event matches
//   routes   = on your career routes · employer = an employer is there · featured = picked for you
const EVENT_SPECS = [
  { key: 'deloitte', in: 'ce', find: /pop-up with\s*:\s*deloitte/i, label: 'Deloitte On-Campus Pop-Up', cat: 'Networking', featured: true, routes: true, employer: true },
  { key: 'quiz', in: 'su', find: /quiz/i, cat: 'Social' },
  { key: 'bending', in: 'ce', find: /data science meets product/i, label: 'Data Science Meets Product Innovation', cat: 'Networking', routes: true, employer: true },
  { key: 'mahjong', in: 'su', find: /mahjong regular social/i, cat: 'Social' },
  { key: 'hike', in: 'su', find: /taster hike/i, cat: 'Outdoors', featured: true },
  { key: 'gallery', in: 'su', find: /british museum trip/i, cat: 'Arts' },
  { key: 'linkedin', in: 'ce', find: /using linkedin for a purpose/i, label: 'Career Lab: Using LinkedIn for a Purpose', cat: 'Workshop' },
  { key: 'techfair', in: 'ce', find: /tech, data & ai fair/i, cat: 'Careers', routes: true, employer: true },
  { key: 'kahoot', in: 'su', find: /^games night$/i, cat: 'Social' },
  { key: 'pwc', in: 'ce', find: /discover pwc/i, label: 'Discover PwC: Your Future in a Changing World', cat: 'Careers', routes: true, employer: true },
  { key: 'livemusic', in: 'su', find: /live music @ institute bar/i, cat: 'Arts' },
  { key: 'roundtable', in: 'ce', find: /roundtable chats/i, cat: 'Careers', routes: true },
  { key: 'karaoke', in: 'su', find: /karaoke @ phineas/i, cat: 'Social' },
  { key: 'caselab', in: 'ce', find: /consulting case skills/i, label: 'Career Lab: Consulting Case Skills Practice', cat: 'Workshop', featured: true, routes: true },
  { key: 'aws', in: 'ce', find: /amazon web services/i, label: 'Powered by AI: An Evening with AWS', cat: 'Careers', routes: true, employer: true },
  { key: 'aiedu', in: 'su', find: /ai in education panel/i, cat: 'Workshop' },
  { key: 'pitch', in: 'ce', find: /big idea challenge/i, label: 'The Big Idea Challenge: Pitching Competition', cat: 'Careers' },
  {
    key: 'boardgames', in: 'su', find: /board games night/i, cat: 'Social',
    fallback: { title: 'Board Games Night', date: '2026-10-30', start: '18:00', end: '', place: 'Chadwick G08', org: 'Sci-Fi and Fantasy Society' },
  },
  { key: 'chro', in: 'ce', find: /ask-a-chro/i, label: 'Ask-a-CHRO: Early Careers & the Modern Workplace', cat: 'Careers' },
  { key: 'garba', in: 'su', find: /garba/i, cat: 'Culture' },
]

// "On Campus: Canary Wharf Level 49, 49.02E Seminar Room" -> "Canary Wharf Level 49"
function shortPlace(location, mode = '') {
  if (/virtual|online/i.test(mode) || /virtual|online/i.test(location)) return 'Online'
  return location.replace(/^on campus:\s*/i, '').split(',')[0].trim()
}

// "Mahjong Society (Students' Union UCL)" -> "Mahjong Society"
function shortHost(organiser) {
  if (/^SU ·|^Students' Union/i.test(organiser)) return "Students' Union"
  return organiser.replace(/\s*\(Students' Union UCL\)/i, '')
}

// Turns one spec into an event: the first real upcoming match, or the design's fallback.
function resolve(spec, today) {
  const source = spec.in === 'ce' ? careerEvents : suEvents
  const real = source.find((e) => e.date >= today && spec.find.test(e.title))
  let ev
  if (real) {
    ev = {
      id: real.id,
      title: spec.label ?? real.title,
      date: real.date,
      start: real.start,
      end: real.end,
      place: shortPlace(real.location, real.mode),
      org: spec.in === 'ce' ? real.organisation || 'UCL Careers' : shortHost(real.organiser),
    }
  } else if (spec.fallback) {
    ev = { id: `sample-${spec.key}`, sample: true, ...spec.fallback }
  } else {
    return null // nothing real and no example: the posts about it are hidden
  }
  const d = new Date(`${ev.date}T12:00:00`)
  const [bg, ink] = CATEGORY_COLORS[spec.cat]
  return {
    ...ev,
    key: spec.key,
    cat: spec.cat,
    featured: !!spec.featured,
    routes: !!spec.routes,
    employer: !!spec.employer,
    careers: ['Networking', 'Careers', 'Workshop'].includes(spec.cat),
    weekend: d.getDay() === 0 || d.getDay() === 6,
    blockBg: bg,
    blockInk: ink,
    weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }), // "Thursday", used in post messages
    dateLabel: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), // "Thu 22 Oct"
    time: ev.end && ev.end !== ev.start ? `${ev.start}–${ev.end}` : ev.start || 'All day',
  }
}

// All feed events by key, e.g. events.quiz. Events that are over are left out.
export function feedEvents(today) {
  const out = {}
  for (const spec of EVENT_SPECS) {
    const ev = resolve(spec, today)
    if (ev && ev.date >= today) out[spec.key] = ev
  }
  return out
}

// The group posts. by = who posted (a key in SOCIAL_PEOPLE), ev = which event, size = group size
// (8 means "8+"), joined = who is in so far. {day} in a message becomes the event's weekday.
export const DEFAULT_GROUPS = [
  { id: 'g1', by: 'marco', ago: '12m ago', ev: 'quiz', size: 6, joined: ['marco', 'aisha', 'sam', 'leila'], msg: 'Quiz night on {day}, we’re 4, need 2 more for a full table 🍻' },
  { id: 'g2', by: 'priya', ago: '38m ago', ev: 'hike', size: 8, joined: ['priya', 'dan', 'tom', 'noor', 'chen', 'jonas'], msg: 'Starting a group of 8 for the hike on {day}, all paces welcome 🥾' },
  { id: 'g3', by: 'sam', ago: '1h ago', ev: 'bending', size: 3, joined: ['sam'], msg: 'Anyone up for this on {day}? Looking for 2 more, I don’t want to walk in alone 😅' },
  { id: 'g4', by: 'leila', ago: '2h ago', ev: 'deloitte', size: 6, joined: ['leila', 'marco', 'priya', 'tom'], msg: 'Deloitte pop-up on {day}: going as a 6 so it’s less awkward to approach the team. 2 spots.' },
  { id: 'g5', by: 'yuki', ago: '3h ago', ev: 'gallery', size: 3, joined: ['yuki', 'chen'], msg: 'Museum trip on {day}, just need 1 more person who likes slow museum days ☕' },
  { id: 'g6', by: 'dan', ago: '5h ago', ev: 'karaoke', size: 8, joined: ['dan', 'tom', 'sam', 'noor', 'jonas', 'chen', 'marco', 'aisha'], msg: 'Karaoke {day}!! Group of 8, booked the big booth 🎤' },
  { id: 'g7', by: 'aisha', ago: '6h ago', ev: 'livemusic', size: 6, joined: ['aisha', 'tom', 'yuki', 'leila', 'priya'], msg: 'Live music at the Institute Bar on {day}, 5 of us so far, one spot left 🎸' },
  { id: 'g8', by: 'tom', ago: '8h ago', ev: 'techfair', size: 3, joined: ['tom'], msg: 'Tech, Data & AI fair on {day}, want to do the rounds with 2 others and compare notes after' },
  { id: 'g9', by: 'noor', ago: '10h ago', ev: 'kahoot', size: 6, joined: ['noor', 'jonas', 'marco'], msg: 'Games night on {day}, grabbing a table of 6, come hungry 🍕' },
  { id: 'g10', by: 'jonas', ago: '14h ago', ev: 'boardgames', size: 3, joined: ['jonas', 'priya'], msg: 'Board games on {day}, need 1 more for Catan. Beginners totally fine.' },
  { id: 'g11', by: 'leila', ago: '1d ago', ev: 'mahjong', size: 3, joined: ['leila', 'yuki'], msg: 'Mahjong on {day}, need one more player, I’ll teach you in 10 minutes' },
  { id: 'g12', by: 'chen', ago: '1d ago', ev: 'garba', size: 8, joined: ['chen', 'noor', 'aisha', 'dan', 'sam'], msg: 'Garba on {day}! Going as 8+, beginners welcome, we’ll teach the steps 💃' },
  { id: 'g13', by: 'hana', ago: '25m ago', ev: 'pwc', size: 3, joined: ['hana'], msg: 'Going to the PwC talk on {day}, anyone want to go as a group of 3? Consulting-curious 🙋' },
  { id: 'g14', by: 'tom', ago: '4h ago', ev: 'caselab', size: 6, joined: ['tom', 'sam', 'noor'], msg: 'Case Skills Career Lab on {day}, forming a 6 so we can pair up and practise after' },
  { id: 'g15', by: 'leila', ago: '9h ago', ev: 'aws', size: 3, joined: ['leila', 'marco'], msg: 'AWS evening on {day}, need 1 more, I’ll bring the questions 🤖' },
  { id: 'g16', by: 'noor', ago: '1d ago', ev: 'linkedin', size: 6, joined: ['noor', 'jonas'], msg: 'LinkedIn Career Lab on {day} morning, group of 6, coffee after at Canary Wharf?' },
]

// Comments under each post. re = the comment this one replies to.
export const DEFAULT_COMMENTS = {
  g3: [
    { id: 'c1', by: 'leila', ago: '52m', text: 'Is this the one with the coding challenge? Heard it’s quite technical', likes: 2 },
    { id: 'c2', by: 'sam', ago: '48m', text: 'Not sure, I think it’s mostly chatting with the team, then drinks', likes: 1, re: 'c1' },
    { id: 'c3', by: 'tom', ago: '20m', text: 'Went last year, it’s very relaxed. Bring a printed CV just in case', likes: 4 },
  ],
  g4: [
    { id: 'c4', by: 'priya', ago: '1h', text: 'I joined Deloitte through one of these! Ask about the Tech Consulting grad scheme, they love that question', likes: 9 },
    { id: 'c5', by: 'marco', ago: '55m', text: 'Meeting by the main entrance 10 minutes before?', likes: 1 },
    { id: 'c6', by: 'leila', ago: '50m', text: 'Yes 👍 Will be by the main doors', likes: 2, re: 'c5' },
    { id: 'c7', by: 'aisha', ago: '30m', text: 'Do we need to register or just show up?', likes: 0 },
    { id: 'c8', by: 'leila', ago: '25m', text: 'Register on myUCLCareers, link’s in the event', likes: 3, re: 'c7' },
  ],
  g1: [
    { id: 'c9', by: 'aisha', ago: '10m', text: 'Team name ideas? I’m voting “Quizteama Aguilera”', likes: 5 },
    { id: 'c10', by: 'tom', ago: '8m', text: '😂 Approved', likes: 2, re: 'c9' },
    { id: 'c11', by: 'marco', ago: '5m', text: 'Table booked for 6, we just need 2 more', likes: 1 },
  ],
  g2: [
    { id: 'c12', by: 'dan', ago: '30m', text: 'Is this ok for a first hike? Haven’t done one in years', likes: 1 },
    { id: 'c13', by: 'priya', ago: '26m', text: 'Totally fine, it’s a taster hike. We stop for lunch at the top', likes: 3, re: 'c12' },
  ],
  g7: [
    { id: 'c14', by: 'tom', ago: '4h', text: 'Who’s playing? Saw a jazz trio on the poster', likes: 0 },
    { id: 'c15', by: 'aisha', ago: '3h', text: 'I’m in if we meet at the entrance first', likes: 2 },
  ],
  g14: [
    { id: 'c16', by: 'sam', ago: '3h', text: 'Perfect timing, I’ve got a case interview the week after', likes: 2 },
    { id: 'c17', by: 'priya', ago: '2h', text: 'Do the market-sizing warm-up before you go, they move fast', likes: 6 },
  ],
  g13: [{ id: 'c18', by: 'felix', ago: '20m', text: 'Their grad scheme interviews are mostly behavioural, worth asking about the rotations', likes: 3 }],
}

// One-tap replies under the comment box.
export const QUICK_REPLIES = ['I’m in!', 'Where are we meeting?', 'Can I bring a friend?', 'Running 10 min late']

// Featured this week on Home: which events, why they were picked, and their tags.
export const HOME_FEATURED = [
  { ev: 'deloitte', why: 'Your Deloitte application closes soon, ask the team in person', tags: '#networking #consulting #deloitte', pop: true, going: 24 },
  { ev: 'caselab', why: 'Case prep is gap #2 on your Consulting route', tags: '#caseprep #consulting #careerlab', pop: true, going: 18 },
  { ev: 'hike', why: 'You listed hiking · Priya shares 2 hobbies with you', tags: '#hiking #outdoors #weekend', going: 12 },
]
