// Made-up conversations for the Messages screen (15), copied from the v2 design.
//
// There are three kinds of chat:
//   'direct'   one-to-one, only with a mutual connection
//   'group'    an Event Group (people going to the same event together)
//   'society'  a society space with Announcements, General and a few channels
//
// Each message is one object. "by" is who sent it ('maya' = you). Messages without "by" are
// cards from LARP itself. "kind" says what to draw:
//   (none)   a normal text bubble             'event'  an event card ("ev" = key in EVENTS)
//   'loc'    a shared location card           'ice'    an icebreaker question
//   'meet'   a meeting point with "I'm here"  'poll'   a vote with options
// "d" starts a new day ("Yesterday", "Today"). "re" are emoji reactions. "read" = they have seen it.

// The people in these chats: id -> [display name, avatar colour, short bio].
export const PEOPLE = {
  priya: ['Priya Raman', '#BA82FF', 'Data Analyst at Deloitte · Alumni ’24'],
  marco: ['Marco B.', '#DDBDFF', 'Board games · Bouldering · BSc Physics'],
  aisha: ['Aisha K.', '#993BFF', 'Bouldering · Film · MSc Data Science'],
  leila: ['Leila H.', '#56338A', 'Bouldering · Mahjong · MA Education'],
  sam: ['Sam O.', '#C4A3F0', 'Board games · Running · BSc Computer Science'],
  tom: ['Tom R.', '#7A4FB5', 'Live music · Film · MEng Civil Eng'],
  yuki: ['Yuki T.', '#E3C8FF', 'Film · Galleries · MSc Urban Planning'],
  dan: ['Dan M.', '#9C6BD6', 'Karaoke · Hiking · LLB Law'],
  noor: ['Noor A.', '#B48BE8', 'Running · Board games · MSc Management'],
  jonas: ['Jonas W.', '#6E3FA8', 'Catan · Chess · BSc Maths'],
  chen: ['Chen L.', '#D1B3FF', 'Galleries · Dance · MA Fine Art'],
  hana: ['Hana S.', '#A66BFF', 'MSc Business Analytics · Case club'],
  felix: ['Felix B.', '#8D5BD9', 'Strategy Analyst at BCG'],
}
export const ALUMNI = ['priya', 'felix'] // shown with a small blue dot

// The order of chats on screen is the order of this list. minutesAgo is for the time on the right.
const conversations = [
  {
    id: 'priya',
    type: 'direct',
    name: 'Priya Raman',
    sub: 'Active 2m ago',
    minutesAgo: 2,
    unread: 1,
    msgs: [
      { d: 'Yesterday', by: 'priya', text: 'Hey Maya! Saw you’re on the Product route too 👋', ago: '17:02' },
      { by: 'maya', text: 'Yes! Honestly still figuring out analytics vs product', ago: '17:10', read: true },
      { by: 'priya', kind: 'event', ev: 'techfair', text: 'This one’s worth it for product roles', ago: '17:12' },
      { by: 'maya', text: 'Ooh, going!', ago: '17:15', read: true, re: ['🔥'] },
      { d: 'Today', by: 'priya', text: 'Happy to grab a coffee Thursday after 3. Costa by Marshgate?', ago: '09:41' },
      { by: 'priya', kind: 'loc', text: 'Costa Coffee · Marshgate, UCL East', sub: 'Thu 16 Oct · 15:15', ago: '09:41' },
    ],
  },
  {
    id: 'deloitte',
    type: 'group',
    name: 'Deloitte @ UCL East · going',
    sub: '6 members',
    day: '14',
    ev: 'deloitte',
    countdown: 'Starts in 2h 15m',
    formed: 'Leila started this group · you joined 2h ago',
    minutesAgo: 18,
    unread: 3,
    msgs: [
      { d: 'Today', by: 'sam', text: 'Anyone walking over from Bloomsbury at 5?', ago: '09:12' },
      { by: 'leila', text: 'Me! Meet at the Main Quad?', ago: '09:14', re: ['👍', '👍'] },
      { by: 'priya', text: 'Ask about the Tech Consulting scheme 😉', ago: '09:20' },
      { kind: 'ice', text: 'Get to know each other: what’s one thing you want to ask the Deloitte team?', answer: 'My question for the Deloitte team: ' },
      { kind: 'meet', text: 'Meet outside Marshgate main doors · 17:50', here: ['leila'] },
    ],
  },
  {
    id: 'dss',
    type: 'society',
    name: 'Data Science Society',
    members: 312,
    role: 'Member',
    minutesAgo: 60,
    unread: 2,
    last: 'Announcements',
    lastText: 'Kaggle 101 has moved to Roberts 106, same time',
    ann: [
      { by: 'committee', text: 'Kaggle 101 has moved to Roberts 106, same time', ago: '08:30' },
      { by: 'committee', kind: 'event', ev: 'intro_ml', text: 'New: hands-on workshop, bring a laptop', ago: '08:32' },
    ],
    general: [
      { d: 'Today', by: 'noor', text: 'Anyone done the Kaggle Titanic one? Stuck at 0.78', ago: '10:05' },
      { by: 'tom', text: 'Feature-engineer the cabin letter, got me to 0.81', ago: '10:09' },
      { by: 'leila', text: 'Study group tonight in the Roberts cafe if anyone wants', ago: '10:30' },
    ],
    // [emoji, channel name, last message, unread count]
    channels: [
      ['🧠', 'ML study group', 'Leila: Roberts cafe at 6?', 2],
      ['💼', 'Internships & jobs', 'Monzo data intern just opened', 1],
      ['🏆', 'Kaggle team', 'Tom: submitted v3, 0.81!', 0],
      ['☕', 'Socials', 'Pub quiz Thursday?', 0],
    ],
  },
  {
    id: 'marco',
    type: 'direct',
    name: 'Marco Bellini · quiz pair',
    person: 'marco',
    sub: 'Active 1h ago',
    minutesAgo: 180,
    unread: 0,
    typing: true,
    msgs: [
      { d: 'Yesterday', by: 'marco', kind: 'event', ev: 'quiz', text: 'We need a team name', ago: '20:10' },
      { by: 'marco', text: 'Team name ideas? I’m bad at this.', ago: '20:11' },
      { by: 'maya', text: 'Quizteama Aguilera. Non-negotiable.', ago: '20:30', read: true, re: ['😂'] },
      { by: 'maya', kind: 'event', ev: 'boulder', text: 'Also this Sunday if you’re free?', ago: '20:32', read: true },
    ],
  },
  {
    id: 'quiz',
    type: 'group',
    name: 'Welcome Quiz Night',
    sub: '6 members',
    day: '16',
    ev: 'quiz',
    countdown: 'Starts in 2 days',
    formed: '🎲 You were matched with 5 others who like quiz nights',
    minutesAgo: 200,
    unread: 0,
    msgs: [
      { d: 'Today', by: 'aisha', text: 'Ok team name vote 👇', ago: '08:00' },
      {
        kind: 'poll',
        q: 'Team name?',
        opts: [
          ['Quizteama Aguilera', ['aisha', 'tom', 'maya']],
          ['Les Quizerables', ['marco']],
          ['Universally Challenged', ['sam', 'leila']],
        ],
      },
      { by: 'tom', text: '😂 Approved', ago: '08:05' },
      { kind: 'meet', text: 'Meet at Phineas Bar entrance · 18:50', here: [] },
    ],
  },
  {
    id: 'aisha',
    type: 'direct',
    name: 'Aisha K.',
    sub: 'Active 3h ago',
    minutesAgo: 240,
    unread: 0,
    msgs: [
      { d: 'Yesterday', by: 'aisha', kind: 'event', ev: 'kaggle', text: 'Data Science Soc are doing this — fancy it?', ago: '13:20' },
      { by: 'maya', text: 'Yes please, I need to actually finish a notebook', ago: '13:44', read: true },
      { by: 'aisha', text: 'Deal. I’ll grab seats near the front', ago: '13:45' },
    ],
  },
  {
    id: 'bending',
    type: 'group',
    name: 'Bending Spoons Networking',
    sub: '2 of 3 · 1 spot left',
    day: '17',
    ev: 'bending',
    countdown: 'Starts in 3 days',
    formed: 'Sam started this group · you joined 1h ago',
    spotLeft: true,
    minutesAgo: 300,
    unread: 0,
    msgs: [
      { d: 'Today', by: 'sam', text: 'Thanks for joining! Hoping one more person bites', ago: '09:50' },
      { by: 'maya', text: 'I’ll share it in the SoM group chat', ago: '09:58', read: true },
    ],
  },
  {
    id: 'fintech',
    type: 'society',
    name: 'FinTech Society',
    members: 540,
    role: null,
    locked: true,
    minutesAgo: 1440,
    unread: 0,
    last: 'Members only',
    lastText: 'Join to see this channel',
    ann: [],
    general: [],
    channels: [
      ['📈', 'Markets chat', '', 0],
      ['💼', 'Grad schemes', '', 0],
      ['🛠', 'Hackathon team', '', 0],
    ],
    // What appears once you join.
    onJoin: {
      general: [{ d: 'Today', by: 'jonas', text: 'Welcome to the new members! Hackathon sign-ups open Friday', ago: '10:00' }],
      ann: [{ by: 'committee', text: 'Welcome! Grad scheme deadlines thread is pinned in 💼', ago: '09:00' }],
    },
  },
  {
    id: 'careers',
    type: 'direct',
    name: 'UCL Careers',
    sub: 'Official',
    official: true,
    minutesAgo: 2880,
    unread: 0,
    msgs: [{ d: 'Mon', by: 'careers', text: 'Reminder: Applications Advice slots release at 9am.', ago: '08:00' }],
  },
]

export default conversations

// The "New match · conversation starter" card at the top of the list.
export const starter = {
  chatId: 'priya',
  text: 'You and Priya both listed bouldering — ask which wall she uses before pitching the coffee.',
  draft: 'Which wall do you climb at? I’m usually at The Castle — fancy a session + coffee?',
}

// Group chat members shown in the info sheet (and on the "I'm here" row).
export const GROUP_MEMBERS = ['maya', 'leila', 'sam', 'priya', 'tom', 'marco']

// Turns minutes into the time label on the right of a chat row.
export function agoLabel(minutes) {
  if (minutes === 0) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  if (minutes < 2880) return 'Yesterday'
  return 'Mon'
}
