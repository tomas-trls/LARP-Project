// Made-up people for the People, Connections and Profile screens.
// The names and lines come from the design (UI Design/LARP App Screens.dc.html, screens 12, 13 and 13b).
// A few extra career suggestions were added so "Not now" has someone to move on to.
//
// Two sides, kept apart on purpose (docs/DESIGN_DECISIONS.md, section 8):
//   career = matched on the Future Me route, CV and programme
//   social = matched on hobbies and personality only, never the CV

// People › Career: one suggestion at a time. "match" is the fit score shown as "88% match".
export const CAREER_SUGGESTIONS = [
  {
    id: 'priya-raman',
    name: 'Priya Raman',
    kind: 'Alumni',
    match: 88,
    headline: "Data Analyst at Deloitte · MSc Business Analytics '24",
    tags: ['Same programme', 'Product route', 'Bouldering', 'Open to coffee'],
    why: "two years ahead of you on the same route, and she joined Deloitte through the event you're going to tonight.",
  },
  {
    id: 'daniel-hughes',
    name: 'Daniel Hughes',
    kind: 'Alumni',
    match: 84,
    headline: "Product Manager at Monzo · BSc Computer Science '22",
    tags: ['Monzo', 'Product route', 'Computer Science', 'Open to calls'],
    why: 'he moved from Monzo analytics into product, the exact step your gap summary points to.',
  },
  {
    id: 'chloe-bennett',
    name: 'Chloe Bennett',
    kind: 'Alumni',
    match: 81,
    headline: "Associate Product Manager at Expedia · MSc Management '23",
    tags: ['APM programme', 'Product route', 'Marketplaces'],
    why: 'she runs the Expedia insight day on 15 Oct and reviews APM applications from UCL.',
  },
  {
    id: 'hannah-clarke',
    name: 'Hannah Clarke',
    kind: 'Student',
    match: 79,
    headline: 'MSc Business Analytics · your course mate',
    tags: ['Same programme', 'Case prep', 'Analytics route'],
    why: 'same programme and also applying to product roles; she runs a case prep group on Mondays.',
  },
  {
    id: 'james-okoro',
    name: 'James Okoro',
    kind: 'Alumni',
    match: 77,
    headline: "Product Analyst at Wise · MSc Business Analytics '24",
    tags: ['Fintech', 'SQL + Tableau', 'Analytics route'],
    why: 'analyst-to-product at a fintech, and his team uses the same SQL and Tableau stack as you.',
  },
  {
    id: 'omar-farouk',
    name: 'Omar Farouk',
    kind: 'Alumni',
    match: 74,
    headline: "Graduate PM at Deloitte · MSc Management '25",
    tags: ['Deloitte', 'Graduate scheme', 'Product route'],
    why: 'he joined the Deloitte graduate product scheme last year, the role closing on 20 Oct.',
  },
]

// People › Social: who you could go to an event with.
// "likes" are hobbies (compared with yours), "eventWords" pick a real upcoming SU event for the pair.
export const SOCIAL_PAIRS = [
  {
    id: 'marco-bellini',
    name: 'Marco Bellini',
    line: 'BSc Physics · 2nd year · also likes quiz nights',
    tags: ['Board games', 'Bouldering', 'Ambivert'],
    likes: ['board games', 'bouldering', 'quiz'],
    eventWords: ['quiz'],
  },
  {
    id: 'aisha-khan',
    name: 'Aisha Khan',
    line: 'MSc Data Science · 1st year · climbs twice a week',
    tags: ['Bouldering', 'Film', 'Introvert'],
    likes: ['bouldering', 'film'],
    eventWords: ['climb', 'boulder', 'film', 'screening'],
  },
  {
    id: 'leila-haddad',
    name: 'Leila Haddad',
    line: 'MA Education · Mahjong Society regular',
    tags: ['Mahjong', 'Bouldering', 'Ambivert'],
    likes: ['mahjong', 'bouldering', 'board games'],
    eventWords: ['mahjong'],
  },
  {
    id: 'tom-reynolds',
    name: 'Tom Reynolds',
    line: 'MEng Civil Eng · 3rd year · goes to every gig',
    tags: ['Live music', 'Techno', 'Extrovert'],
    likes: ['live music', 'techno', 'clubbing'],
    eventWords: ['dj', 'jazz', 'live', 'music'],
  },
  {
    id: 'sophie-marsh',
    name: 'Sophie Marsh',
    line: 'BA History · 2nd year · Hiking Club',
    tags: ['Hiking', 'Running', 'Ambivert'],
    likes: ['hiking', 'running'],
    eventWords: ['hike', 'walk'],
  },
]

// "People who share your hobbies" list on People › Social.
export const HOBBY_MATCHES = [
  { id: 'aisha-khan', name: 'Aisha K.', line: 'Bouldering · Film · MSc Data Science' },
  { id: 'priya-n', name: 'Priya N.', line: 'Hiking · Catan · BSc Economics' },
  { id: 'tom-reynolds', name: 'Tom R.', line: 'Live music · Film · MEng Civil Eng' },
  { id: 'leila-haddad', name: 'Leila H.', line: 'Bouldering · Mahjong · MA Education' },
  { id: 'sam-o', name: 'Sam O.', line: 'Board games · Running · BSc Computer Science' },
  { id: 'yuki-tanaka', name: 'Yuki T.', line: 'Film · Galleries · MSc Urban Planning' },
  { id: 'dan-m', name: 'Dan M.', line: 'Karaoke · Hiking · LLB Law' },
]

// 13b Connections. kind = 'career' or 'social'. linkedin / link = which small round icons show.
// "note" is the last thing you did together.
export const CONNECTIONS = [
  { id: 'priya-raman', name: 'Priya Raman', kind: 'career', line: "Data Analyst at Deloitte · Alumni '24", linkedin: true, link: true, note: 'Coffee Thu 16 Oct · Canary Wharf' },
  { id: 'marco-bellini', name: 'Marco Bellini', kind: 'social', line: 'BSc Physics · 2nd year', link: true, note: 'Quiz pair · Phineas Bar' },
  { id: 'sam-osei', name: 'Sam Osei', kind: 'career', line: 'MSc Management · Deloitte @ UCL East group', linkedin: true, note: 'Met at Deloitte evening' },
  { id: 'aisha-khan', name: 'Aisha Khan', kind: 'social', line: 'MSc Data Science · bouldering partner', link: true, note: 'Bouldering Sat · Westway' },
  { id: 'daniel-hughes', name: 'Daniel Hughes', kind: 'career', line: "PM at Monzo · Alumni '22", linkedin: true, note: 'Intro call booked · 23 Oct' },
  { id: 'leila-haddad', name: 'Leila Haddad', kind: 'social', line: 'MA Education · Mahjong Society', link: true, note: 'Mahjong Fri · Chadwick G08' },
  { id: 'tom-reynolds', name: 'Tom Reynolds', kind: 'social', line: 'MEng Civil Eng · Live Music Society', link: true, note: 'Institute Bar · Wed 22' },
  { id: 'chloe-bennett', name: 'Chloe Bennett', kind: 'career', line: "APM at Expedia · Alumni '23", linkedin: true, link: true, note: 'Replied about insight day' },
  { id: 'james-okoro', name: 'James Okoro', kind: 'career', line: "Product Analyst at Wise · Alumni '24", linkedin: true, note: 'Referred you · Business Squad role' },
  { id: 'yuki-tanaka', name: 'Yuki Tanaka', kind: 'social', line: 'MSc Urban Planning · Film Society', link: true, note: 'Screening Thu 30 · One Pool St' },
  { id: 'hannah-clarke', name: 'Hannah Clarke', kind: 'career', line: 'MSc Business Analytics · course mate', linkedin: true, link: true, note: 'Case prep group · Mondays' },
  { id: 'omar-farouk', name: 'Omar Farouk', kind: 'career', line: "Grad PM at Deloitte · Alumni '25", linkedin: true, note: 'Met at Deloitte evening' },
  { id: 'sophie-marsh', name: 'Sophie Marsh', kind: 'social', line: 'BA History · Hiking Club', link: true, note: 'Haslemere hike · Sat 18' },
]

// Requests waiting for an answer. sentByMe = you asked them (shows "Sent" instead of "Accept").
export const PENDING = [
  { id: 'ravi-mehta', name: 'Ravi Mehta', kind: 'career', line: 'Senior PM at Octopus Energy · sent you a request · 1d', linkedin: true },
  { id: 'ella-thornton', name: 'Ella Thornton', kind: 'social', line: 'BA English · Taylor Swift Society · sent you a request · 2d', link: true },
  { id: 'kwame-asante', name: 'Kwame Asante', kind: 'career', line: "Product Lead at Bumble · Alumni '19 · sent you a request · 3d", linkedin: true },
  { id: 'freya-lindqvist', name: 'Freya Lindqvist', kind: 'social', line: 'MSc Architecture · Hiking Club · wants to pair for Haslemere hike', link: true },
  { id: 'ben-carter', name: 'Ben Carter', kind: 'career', line: 'Strategy Analyst at Bain · you sent a request · 4d', linkedin: true, sentByMe: true },
]

// The design shows 127 connections; 13 are listed above and the rest are "See all".
export const CONNECTION_TOTAL = 127

// Turns a hobby chip like "🧗 Bouldering" into plain lowercase words: "bouldering".
export function plainHobby(text) {
  return text.replace(/[^\p{L}\s&-]/gu, '').trim().toLowerCase()
}

// The societies a new student starts in, so the screen matches the design.
// Once you join or leave anything, your own list (profile.societies) is used instead.
export const STARTER_SOCIETIES = [
  'Hedge Fund Society',
  'Business Society',
  'Technology Society',
  'Economics and Finance Society',
  'Surf Club',
  'Snowsports Club',
  'Padel Tennis Club',
  'Leadership and Management Society',
  'Entrepreneurs Society',
  'Data Science Society',
  'FinTech Society',
]

// Your societies: the starter list until you change it.
export function joinedList(profile) {
  return profile.societiesChanged ? profile.societies : STARTER_SOCIETIES
}
