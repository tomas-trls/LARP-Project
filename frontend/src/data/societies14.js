// Data for screen 14 · Societies (design v4).
//
// The design shows a small, hand-picked set of societies with full pages (events, committee,
// gallery, elections) and a list of committee roles. Those are written out here.
// The search box on the screen uses the real list of 472 UCL groups instead (src/data/societies.json).
//
// People are referred to by short keys ('noor', 'priya'...) that match SOCIAL_PEOPLE in people.js,
// so the same person has the same name and colour on every screen.
import { GAPS } from './careerData.js'
import { SOCIAL_PEOPLE } from './people.js'

// The societies with a full page. "member: true" means the student is already in it.
// events: [title, when, isPast]   committee: [personKey, role]   openRole: an id from ROLES below
export const SOCIETIES = [
  {
    id: 'dss', name: 'Data Science Society', short: 'Data Science', cat: 'Technology & science', icon: '📊', cover: '#3DD6C1',
    members: 312, fit: 94, price: '£5/year', pitch: 'Where future tech leaders are made.',
    why: 'Your route + Python · 2 connections are members', member: true, role: 'Member', next: 'Kaggle 101 · Wed', unread: true,
    conns: ['leila', 'noor'], taster: false, election: true,
    gain: 'Hands-on ML workshops, Kaggle team, intern referrals',
    route: 'Analytics & insight roles ask for a portfolio — the Kaggle team gives you one.',
    ig: '@ucldss',
    events: [['Kaggle 101', 'Wed 15 Oct · 18:00 · Roberts 106', false], ['Intro to ML workshop', 'Tue 21 Oct · 18:00 · Roberts 106', false], ['Welcome social', 'Thu 25 Sep', true]],
    committee: [['noor', 'President'], ['tom', 'Vice-president'], ['leila', 'Head of Events']],
    openRole: 'r1', gallery: ['/photos/sample-2.png', '/photos/sample-4.png', '/photos/sample-6.png'],
  },
  {
    id: 'fintech', name: 'FinTech Society', short: 'FinTech', cat: 'Finance & enterprise', icon: '💳', cover: '#FFC46B',
    members: 540, fit: 88, price: '£5/year', pitch: 'Europe’s largest FinTech society.',
    why: 'Monzo & Expedia roles on your route recruit here', member: false, next: 'Grad scheme panel · Thu',
    conns: ['jonas', 'arjun'], taster: false,
    gain: 'Grad scheme panels, hackathon team, markets chat',
    route: 'Product roles at Monzo and Revolut hire from the committee and hackathon team.',
    ig: '@uclfintech',
    events: [['Grad scheme panel', 'Thu 23 Oct · 18:30 · Cruciform LT1', false], ['FinTech hackathon', 'Sat 8 Nov · all day', false]],
    committee: [['jonas', 'President'], ['dan', 'Treasurer (outgoing)']],
    openRole: 'r3', gallery: ['/photos/sample-3.png', '/photos/sample-5.png'],
  },
  {
    id: 'ent', name: 'Entrepreneurs Society', short: 'Entrepreneurs', cat: 'Skills & training', icon: '🚀', cover: '#BA82FF',
    members: 290, fit: 85, price: 'Free', pitch: 'Runs the Claude Campus Hackathon.',
    why: 'Pitch night counts towards your Product gap', member: true, role: 'Committee', next: 'Pitch night · Wed 29', unread: false,
    conns: ['jonas'], taster: false,
    gain: 'Pitch nights, founder talks, hackathon',
    route: 'Product & strategy asks for “something you shipped” — the hackathon is exactly that.',
    ig: '@uclentrepreneurs',
    events: [['The Big Idea Challenge', 'Wed 29 Oct · 18:00', false], ['Launch night', 'Tue 23 Sep', true]],
    committee: [['maya', 'Partnerships Officer'], ['jonas', 'President']],
    openRole: 'r4', gallery: ['/photos/sample-1.png'],
  },
  {
    id: 'cons', name: 'Consulting Society', short: 'Consulting', cat: 'Business', icon: '💼', cover: '#FF8A7A',
    members: 410, fit: 82, price: '£8/year', pitch: 'Case practice every week, MBB speakers each term.',
    why: 'Case interviews are your biggest Consulting gap', member: false, next: 'Case clinic · Mon',
    conns: ['hana', 'leo'], taster: true,
    gain: 'Weekly case clinics, buddy pairing, firm presentations',
    route: 'Case practice is gap #1 on your Consulting route.',
    ig: '@uclconsulting',
    events: [['Case clinic (taster)', 'Mon 20 Oct · 18:00', false]],
    committee: [['hana', 'Head of Case Club']],
    openRole: null, gallery: [],
  },
  {
    id: 'climb', name: 'UCL Climbing', short: 'Climbing', cat: 'Sport', icon: '🧗', cover: '#C4F3E4',
    members: 220, fit: 78, price: '£25/year', pitch: 'Bouldering every week, trips every term.',
    why: 'You listed bouldering · Priya climbs here', member: false, next: 'Taster · Sun 19',
    conns: ['priya', 'aisha'], taster: true,
    gain: 'Weekly sessions at The Castle, kit library, trips',
    route: 'Not a career society — but 3 of your matches climb here.',
    ig: '@uclclimbing',
    events: [['Bouldering Taster', 'Sun 19 Oct · 11:00 · The Castle', false]],
    committee: [['priya', 'Social Secretary']],
    openRole: null, gallery: ['/photos/sample-5.png'],
  },
]

// The student's other societies (no full page): [id, name, icon, next event, renew-by date or null]
export const OTHER_MEMBERSHIPS = [
  ['padel', 'Padel Tennis', '🎾', 'Social ladder · Sat', '31 Oct'],
  ['snow', 'Snowsports', '🏂', 'Trip info night · Thu', null],
  ['surf', 'Surf', '🏄', 'Pool session · Fri', null],
  ['biz', 'Business', '🏢', 'Speaker night · Tue', '31 Oct'],
  ['tech', 'Technology', '💻', 'Hack night · Wed', null],
  ['econ', 'Economics & Finance', '📈', 'Markets talk · Mon', null],
  ['hedge', 'Hedge Fund', '💰', 'Pitch review · Thu', null],
  ['lead', 'Leadership & Management', '🧭', 'Workshop · Wed', null],
  ['film', 'Film Society', '🎬', 'Screening · Fri', null],
]

// Committee roles that build experience for the student's career route.
// The colour of each area label matches that career area on the gap summary (screen 09).
export const ROLES = [
  { id: 'r1', title: 'Events Officer', soc: 'Data Science Society', blurb: 'Counts towards Leadership +8 on your progress chart', hrs: '~3 hrs/week', due: 'Wed 22 Oct', days: 6, area: 'Leadership', color: GAPS.prod.color, cta: 'Apply', kind: 'apply' },
  { id: 'r2', title: 'Course Rep', soc: 'MSc Business Analytics', blurb: 'Represent your cohort to the School of Management', hrs: '~2 hrs/week', due: 'Fri 24 Oct', days: 8, area: 'Leadership', color: GAPS.prod.color, cta: 'Nominate yourself', kind: 'apply' },
  { id: 'r3', title: 'Treasurer', soc: 'FinTech Society', blurb: 'Budget ownership, which grad schemes ask about', hrs: '~4 hrs/week', due: 'Mon 27 Oct', days: 11, area: 'Experience', color: GAPS.anal.color, cta: 'Apply', kind: 'apply' },
  { id: 'r4', title: 'Volunteer', soc: 'Entrepreneurs Society hackathon', blurb: 'A one-off, 2 days · run the judging room', hrs: '2 days', due: 'Fri 7 Nov', days: 22, area: 'Teamwork', color: GAPS.cons.color, cta: 'Sign up', kind: 'signup' },
]

// Candidates in the Data Science Society election: [personKey, role, statement]
export const CANDIDATES = [
  ['noor', 'President', 'Two more industry nights a term and a paid-internship board.'],
  ['tom', 'President', 'Keep the Kaggle team funded and open to first-years.'],
  ['aisha', 'President', 'More beginner workshops and a mentoring scheme with alumni.'],
]

// "This week across your societies": [title, society, day, date, time and place]
export const THIS_WEEK = [
  ['Kaggle 101', 'Data Science Society', 'WED', '15', '18:00 · Roberts 106'],
  ['Social ladder', 'Padel Tennis', 'SAT', '18', '10:00 · Westway'],
  ['Bouldering Taster', 'UCL Climbing', 'SUN', '19', '11:00 · The Castle'],
  ['Intro to ML workshop', 'Data Science Society', 'TUE', '21', '18:00 · Roberts 106'],
]

// A person's name and colour. 'maya' is the student; people not in SOCIAL_PEOPLE get a plain colour.
export function personName(key, firstName = 'Maya') {
  if (key === 'maya') return `${firstName} (you)`
  return SOCIAL_PEOPLE[key]?.name ?? key[0].toUpperCase() + key.slice(1)
}
export function personColor(key, myPhoto) {
  if (key === 'maya') return `url(${myPhoto}) center/cover`
  return SOCIAL_PEOPLE[key]?.color ?? 'var(--sf2)'
}

// A pretend QR code for the membership card: a 21 × 21 grid of dark and light squares.
// The three corner squares look like a real QR code; the rest is a repeatable pattern from "seed".
export function qrCells(seed) {
  const cells = []
  let x = seed * 9301 + 49297
  for (let i = 0; i < 21 * 21; i++) {
    const r = Math.floor(i / 21)
    const c = i % 21
    const corner = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
    let dark
    if (corner) {
      const rr = r > 13 ? r - 14 : r
      const cc = c > 13 ? c - 14 : c
      dark = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr > 1 && rr < 5 && cc > 1 && cc < 5)
    } else {
      x = (x * 9301 + 49297) % 233280
      dark = x / 233280 > 0.5
    }
    cells.push(dark)
  }
  return cells
}
