// Made-up people for the People, Connections and Profile screens.
// The names and lines come from the design (UI Design/Project LARP screen v2/LARP App Screens.dc.html,
// screens 12, 13 and 13b).
//
// Two sides, kept apart on purpose (docs/DESIGN_DECISIONS.md, section 8):
//   career = matched on the Future Me route, CV and programme
//   social = matched on hobbies and personality only, never the CV

// People › Career: the swipe deck, one person at a time (design screen 12).
// match = the fit score shown as "88% match". hook = how your note introduces you to them.
// color = the round avatar colour until real photos exist.
export const CAREER_SUGGESTIONS = [
  { id: 'priya-raman', name: 'Priya Raman', first: 'Priya', role: "Data Analyst at Deloitte · MSc Business Analytics '24", match: 88, alumni: true, color: '#BA82FF', tags: ['Same programme', 'Product route', 'Bouldering', 'Open to coffee'], why: "Two years ahead of you on the same route, and she joined Deloitte through the employer pop-up you're booked on.", hook: 'on the same MSc and looking at Product routes' },
  { id: 'omar-haddad', name: 'Omar Haddad', first: 'Omar', role: "Associate PM at Monzo · MSc Business Analytics '23", match: 84, alumni: true, color: '#993BFF', tags: ['Monzo', 'Product route', 'Open to coffee'], why: 'Did the same Monzo internship two years before you, and converted it into an APM offer.', hook: 'about to finish the Monzo internship you did and aiming for APM roles' },
  { id: 'hana-sato', name: 'Hana Sato', first: 'Hana', role: 'MSc Business Analytics · 2nd year · runs SoM Case Club', match: 81, alumni: false, color: '#A66BFF', tags: ['Same programme', 'Analytics route', 'Case club'], why: 'Runs the case club that covers the interview gap flagged on your route.', hook: 'on your programme and working on case interviews' },
  { id: 'felix-brandt', name: 'Felix Brandt', first: 'Felix', role: "Strategy Analyst at BCG · BSc Economics '22", match: 79, alumni: true, color: '#8D5BD9', tags: ['Consulting route', 'Open to coffee'], why: 'Went from a UCL analytics MSc into strategy consulting, the route you shortlisted.', hook: 'exploring the Consulting route from an analytics background' },
  { id: 'grace-obi', name: 'Grace Obi', first: 'Grace', role: "Product Analyst at Deliveroo · MSc Business Analytics '24", match: 77, alumni: true, color: '#DDBDFF', tags: ['Deliveroo', 'Analytics route'], why: 'Turned a marketplace placement into a product analyst role.', hook: 'looking at product analyst roles at marketplaces' },
  { id: 'leo-marchetti', name: 'Leo Marchetti', first: 'Leo', role: 'MSc Management · 1st year · Consulting Society', match: 73, alumni: false, color: '#56338A', tags: ['Consulting route', 'Case practice'], why: 'Looking for a case-practice partner on the same route.', hook: 'looking for a case-practice partner' },
  { id: 'mei-lin', name: 'Mei Lin', first: 'Mei', role: "Business Analyst at Accenture · MSc Business Analytics '23", match: 71, alumni: true, color: '#C4A3F0', tags: ['Analytics route', 'Open to coffee'], why: 'Analytics MSc into consulting-flavoured business analyst work.', hook: 'weighing analyst roles in consulting' },
  { id: 'arjun-mehta', name: 'Arjun Mehta', first: 'Arjun', role: "Growth Analyst at Monzo · BSc Computer Science '23", match: 69, alumni: true, color: '#7A4FB5', tags: ['Monzo', 'Analytics route'], why: 'Same BSc subject, and the same employer as on your CV.', hook: 'also ex-Monzo and interested in growth analytics' },
]

// Coffee chat times offered in the sheet ("free in both calendars").
export const COFFEE_SLOTS = ['Thu 22 Oct · 13:00–13:20', 'Fri 23 Oct · 10:30–10:50', 'Mon 26 Oct · 16:00–16:20']

// Students who post groups and comment on People › Social (design screen 13).
// key: { name, color, tag, bio, followId }. tag = why they show up for you.
// followId links to the same person in profile.following, where one exists.
export const SOCIAL_PEOPLE = {
  marco: { name: 'Marco B.', color: '#DDBDFF', tag: 'Connection', bio: 'Board games · Bouldering · BSc Physics', followId: 'marco-bellini' },
  priya: { name: 'Priya N.', color: '#BA82FF', tag: 'Connection', bio: 'Hiking · Catan · BSc Economics', followId: 'priya-n' },
  aisha: { name: 'Aisha K.', color: '#993BFF', tag: 'Connection', bio: 'Bouldering · Film · MSc Data Science', followId: 'aisha-khan' },
  leila: { name: 'Leila H.', color: '#56338A', tag: 'Connection', bio: 'Bouldering · Mahjong · MA Education', followId: 'leila-haddad' },
  sam: { name: 'Sam O.', color: '#C4A3F0', tag: 'Shares 2 hobbies', bio: 'Board games · Running · BSc Computer Science', followId: 'sam-o' },
  tom: { name: 'Tom R.', color: '#7A4FB5', tag: 'Shares 2 hobbies', bio: 'Live music · Film · MEng Civil Eng', followId: 'tom-reynolds' },
  yuki: { name: 'Yuki T.', color: '#E3C8FF', tag: 'Shares 2 hobbies', bio: 'Film · Galleries · MSc Urban Planning', followId: 'yuki-tanaka' },
  dan: { name: 'Dan M.', color: '#9C6BD6', tag: 'Shares 1 hobby', bio: 'Karaoke · Hiking · LLB Law', followId: 'dan-m' },
  noor: { name: 'Noor A.', color: '#B48BE8', tag: 'Shares 2 hobbies', bio: 'Running · Board games · MSc Management', followId: 'noor-a' },
  jonas: { name: 'Jonas W.', color: '#6E3FA8', tag: 'Shares 1 hobby', bio: 'Catan · Chess · BSc Maths', followId: 'jonas-w' },
  chen: { name: 'Chen L.', color: '#D1B3FF', tag: 'Shares 2 hobbies', bio: 'Galleries · Dance · MA Fine Art', followId: 'chen-l' },
  hana: { name: 'Hana S.', color: '#A66BFF', tag: 'Same route', bio: 'MSc Business Analytics · Case club', followId: 'hana-sato', alumni: false },
  felix: { name: 'Felix B.', color: '#8D5BD9', tag: 'Alumni', bio: 'Strategy Analyst at BCG', followId: 'felix-brandt', alumni: true },
}

// "People who share your hobbies" row on People › Social, in the design's order.
export const HOBBY_MATCHES = ['aisha', 'priya', 'tom', 'leila', 'sam', 'yuki', 'dan']

// People already in the "Saved people" bookmark before you save anyone from the deck.
export const SAVED_BEFORE = ['aisha', 'tom', 'marco', 'leila', 'noor', 'chen']

// How many people are in the bookmark (the badge on People's header).
export function savedCount(profile) {
  return SAVED_BEFORE.length + (profile.savedPeople ?? []).length
}

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
