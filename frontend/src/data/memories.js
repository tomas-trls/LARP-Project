// Made-up events, plans and memories for the Profile (16) and Messages (15) screens.
// All of it is copied from the v2 design file so the demo matches the screens.

// Colour of each event category: [background, text]. Used for the coloured strip on event cards.
export const CAT = {
  Networking: ['#993BFF', '#FFFFFF'],
  Careers: ['#BA82FF', '#361A54'],
  Workshop: ['#DDBDFF', '#361A54'],
  Social: ['#F1F3B8', '#361A54'],
  Outdoors: ['#C4F3E4', '#361A54'],
  Arts: ['#FFD6E8', '#361A54'],
  Culture: ['#FFE0B8', '#361A54'],
}

// The events that chats and plans talk about. key -> details.
export const EVENTS = {
  deloitte: { title: 'Meet the Deloitte Team at UCL East', date: 'Tue 14 Oct', time: '18:00–21:00', place: 'Marshgate, Room 118', cat: 'Networking' },
  quiz: { title: 'Welcome Quiz Night', date: 'Thu 16 Oct', time: '19:00', place: 'Phineas Bar', cat: 'Social' },
  bending: { title: 'Bending Spoons Networking Event', date: 'Fri 17 Oct', time: '16:00', place: 'Chandler House B01', cat: 'Networking' },
  hike: { title: 'Taster Hike: Haslemere, Temple of the Winds (14km)', date: 'Sat 18 Oct', time: '08:30', place: 'Meet at Euston', cat: 'Outdoors' },
  popup: { title: 'Deloitte On-Campus Pop-Up', date: 'Mon 20 Oct', time: '10:30–16:00', place: 'Wilkins Main Quad', cat: 'Careers' },
  techfair: { title: 'Tech, Data & AI Careers Fair', date: 'Tue 21 Oct', time: '16:00–19:00', place: 'IOE, Jeffery Hall', cat: 'Careers' },
  intro_ml: { title: 'Intro to ML workshop', date: 'Tue 21 Oct', time: '18:00', place: 'Roberts 106', cat: 'Workshop' },
  kaggle: { title: 'Kaggle 101', date: 'Wed 15 Oct', time: '18:00', place: 'Roberts 106', cat: 'Workshop' },
  boulder: { title: 'Bouldering Taster · UCL Climbing', date: 'Sun 19 Oct', time: '11:00', place: 'The Castle, Stoke Newington', cat: 'Outdoors' },
  pwc: { title: 'Discover PwC: Your Future in a Changing World', date: 'Wed 22 Oct', time: '12:30', place: 'UCL Careers, 4th Floor', cat: 'Careers' },
  livemusic: { title: 'Live Music @ Institute Bar', date: 'Wed 22 Oct', time: '19:00', place: 'The Institute Bar, 25 Gordon St', cat: 'Arts' },
  caselab: { title: 'Career Lab: Consulting Case Skills Practice', date: 'Mon 27 Oct', time: '09:30', place: 'Canary Wharf, Level 49', cat: 'Workshop' },
  pitch: { title: 'The Big Idea Challenge: Pitching Competition', date: 'Wed 29 Oct', time: '18:00', place: 'Roberts Building G08', cat: 'Careers' },
}

// Who is going with you (or how many are going) for each event, for the little avatar rows.
// "chat" = the id of the group chat in src/data/messages.js, if there is one.
export const EVENT_GROUPS = {
  deloitte: { joined: ['leila', 'marco', 'priya', 'tom', 'maya'], chat: 'deloitte' },
  quiz: { joined: ['marco', 'aisha', 'sam', 'leila', 'maya'], chat: 'quiz' },
  bending: { joined: ['sam', 'maya'], chat: 'bending' },
  hike: { joined: ['priya', 'dan', 'tom', 'noor', 'chen', 'jonas'] },
  caselab: { joined: ['tom', 'sam', 'noor', 'maya'] },
  pwc: { joined: ['hana'] },
}

// Upcoming events the student has booked (Profile › Plans).
// daysAway is fixed so the demo always reads the same ("Today", "In 6 days"...).
export const PLANS = [
  { key: 'deloitte', daysAway: 0 },
  { key: 'popup', daysAway: 6 },
  { key: 'techfair', daysAway: 7 },
  { key: 'caselab', daysAway: 13 },
]

// Past events (Profile › Memories). met / conn are people ids from src/data/messages.js (PEOPLE).
export const MEMORIES = [
  { id: 'm1', title: 'Welcome Quiz Night', date: 'Thu 2 Oct', month: 'October', cat: 'Social', met: ['marco', 'aisha', 'sam'], badge: 'Quiz regular', xp: 20, photo: '/photos/sample-4.png', note: 'Came 3rd. Marco knows every capital city.', status: 'Attended', conn: ['marco'] },
  { id: 'm2', title: 'Careers Fair: Consulting & Finance', date: 'Wed 8 Oct', month: 'October', cat: 'Careers', met: ['priya', 'hana'], badge: '', xp: 30, photo: '', note: 'Asked about the Tech Consulting scheme. Follow up in Nov.', status: 'Attended', conn: ['priya', 'hana'] },
  { id: 'm3', title: 'Data Science Society Welcome', date: 'Thu 25 Sep', month: 'September', cat: 'Workshop', met: ['leila', 'noor', 'tom'], badge: 'Data Science Soc', xp: 15, photo: '/photos/sample-2.png', note: '', status: 'Attended', conn: ['leila'] },
  { id: 'm4', title: 'Entrepreneurs Society Launch', date: 'Tue 23 Sep', month: 'September', cat: 'Workshop', met: ['jonas'], badge: 'Entrepreneurs', xp: 15, photo: '', note: '', status: 'Attended', conn: [] },
  { id: 'm5', title: 'Career Lab: CVs that get read', date: 'Mon 22 Sep', month: 'September', cat: 'Workshop', met: [], badge: '', xp: 10, photo: '', note: 'Rewrite the Monzo bullet with numbers.', status: 'Attended', conn: [] },
  { id: 'm6', title: 'SoM Welcome Social', date: 'Fri 19 Sep', month: 'September', cat: 'Social', met: ['hana', 'chen'], badge: '', xp: 10, photo: '/photos/sample-6.png', note: '', status: 'Attended', conn: ['hana'] },
  { id: 'm7', title: 'Board Games Night', date: 'Thu 18 Sep', month: 'September', cat: 'Social', met: ['priya', 'jonas'], badge: '', xp: 10, photo: '/photos/sample-3.png', note: 'Lost at Catan. Twice.', status: 'Attended', conn: [] },
  { id: 'm8', title: 'Bending Spoons Tech Talk', date: 'Wed 17 Sep', month: 'September', cat: 'Networking', met: [], badge: '', xp: 0, photo: '', note: '', status: 'Missed', conn: [] },
  { id: 'm9', title: 'Freshers’ Fair', date: 'Sat 13 Sep', month: 'September', cat: 'Social', met: ['aisha'], badge: '', xp: 10, photo: '/photos/sample-5.png', note: 'Signed up to 11 societies. Oops.', status: 'Attended', conn: ['aisha'] },
]

// The memory the "How was it?" prompt asks about (the Deloitte evening, which is the Careers Fair note).
export const PROMPT_MEMORY = { id: 'm2', eventTitle: 'Meet the Deloitte Team' }

// The 6 sample photos that stand in for the phone's photo library.
export const PHOTO_LIBRARY = [1, 2, 3, 4, 5, 6].map((i) => `/photos/sample-${i}.png`)

// Your progress (Profile › Your progress). Scores per category, in the order of CATEGORIES in careerData.js:
// Academics, Skills, Teamwork, Experience, Leadership.
export const SCORES_AT_START = [80, 62, 60, 48, 36]
export const SCORES_NOW = [85, 70, 65, 55, 40]
export const FIT_AT_START = 54 // your fit % when you first made your gap summary

// "What moved the scores": done steps, then the next ones.
export const MILESTONES = [
  { done: true, t: 'Meet the Deloitte Team', d: 'Tue 14 Oct', ch: 'Experience +4' },
  { done: true, t: 'Data Science Society Welcome', d: 'Thu 25 Sep', ch: 'Teamwork +5' },
  { done: true, t: 'Career Lab: CVs that get read', d: 'Mon 22 Sep', ch: 'Skills +3' },
  { done: true, t: 'Gap summary created', d: 'Fri 19 Sep', ch: 'Baseline 54%' },
  { done: false, next: true, t: 'Request a SoM practice interview', d: 'Next', ch: 'would move Experience +6', cta: 'Request' },
  { done: false, t: 'A portfolio project in SQL + Tableau', d: 'Data Viz Clinic · Thu 23 Oct', ch: 'would move Skills +5' },
]

// Badges shown on Profile. done = earned.
export const BADGES = [
  { name: 'Data Science Soc', icon: 'flag', done: true },
  { name: 'Entrepreneurs', icon: 'flag', done: true },
  { name: 'Quiz regular', icon: 'person', done: true, social: true },
  { name: 'Employer insider', how: 'Attend 3 employer events', prog: '2/3' },
  { name: 'Coffee first', how: 'Have 5 coffee chats', prog: '3/5' },
  { name: 'Group starter', how: 'Post 3 groups others join', prog: '1/3' },
  { name: 'Gap closer', how: 'Finish 3 gap actions', prog: '1/3' },
  { name: 'Case ready', how: 'Complete a practice interview', prog: '0/1' },
  { name: 'Alumni link', how: 'Connect with 10 alumni', prog: '6/10' },
]
