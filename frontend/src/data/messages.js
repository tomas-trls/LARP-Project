// Made-up conversations for the Messages screen (15). The first six come from the design.
//
// Following the design decisions, there are only two kinds of chat:
//   - group chats (an Event Group, a society channel, UCL Careers updates)
//   - one-to-one chats with a mutual connection
//
//   kind     'direct' | 'group' | 'society' | 'event'  (the filter chips on screen)
//   avatar   'person' (striped photo) | 'friend' (lilac stripes) | 'date' (purple tile with a day number)
//            | 'flag' (society) | 'plain' (an organisation)
//   locked   true for a members-only channel the student has not joined
//   thread   the messages, oldest first. from: 'me' or a first name.
const conversations = [
  {
    id: 'priya-raman',
    name: 'Priya Raman',
    kind: 'direct',
    avatar: 'person',
    time: '2m',
    unread: true,
    thread: [
      { from: 'me', text: 'Hi Priya! I saw you joined Deloitte through the UCL East evening. Would you have 20 minutes for a coffee?' },
      { from: 'Priya', text: 'Of course, happy to help a fellow Business Analytics student.' },
      { from: 'Priya', text: 'Happy to grab a coffee Thursday after 3 — Canary Wharf?' },
    ],
  },
  {
    id: 'deloitte-ucl-east',
    name: 'Deloitte @ UCL East · going',
    kind: 'event',
    avatar: 'date',
    dateNum: '14',
    time: '18m',
    thread: [
      { from: 'Hannah', text: 'Group chat is open! 4 of us going tonight.' },
      { from: 'Omar', text: "I went last year. Bring a question about their grad PM track, they love that." },
      { from: 'Sam', text: 'Anyone walking over from Bloomsbury at 5?' },
    ],
  },
  {
    id: 'dss-general',
    name: 'Data Science Society · General',
    kind: 'society',
    avatar: 'flag',
    time: '1h',
    thread: [
      { from: 'Committee', text: 'Reminder: Kaggle 101 is this Thursday, 6pm.' },
      { from: 'Committee', text: 'Kaggle 101 moved to Roberts 106 — same time.' },
    ],
  },
  {
    id: 'marco-bellini',
    name: 'Marco Bellini · quiz pair',
    kind: 'direct',
    avatar: 'friend',
    time: '3h',
    thread: [
      { from: 'Marco', text: 'Hey! LARP paired us for the Welcome Quiz Night on Thursday.' },
      { from: 'me', text: "Great, I'm in. I'm decent at geography, terrible at sport questions." },
      { from: 'Marco', text: "Team name ideas? I'm bad at this." },
    ],
  },
  {
    id: 'fintech-members',
    name: 'FinTech Society · Members only',
    kind: 'society',
    avatar: 'flag',
    time: 'Yesterday',
    locked: true,
    preview: 'Join to see this channel',
    thread: [],
  },
  {
    id: 'ucl-careers',
    name: 'UCL Careers',
    kind: 'group',
    avatar: 'plain',
    time: 'Mon',
    thread: [
      { from: 'UCL Careers', text: 'Applications Advice appointments are 20-minute reviews of a CV, cover letter or application form.' },
      { from: 'UCL Careers', text: 'Reminder: Applications Advice slots release at 9am.' },
    ],
  },
  {
    id: 'haslemere-hike',
    name: 'Haslemere hike · group of 4',
    kind: 'event',
    avatar: 'date',
    dateNum: '18',
    time: 'Sun',
    thread: [
      { from: 'Freya', text: 'Meeting under the departures board at Euston, 8:15.' },
      { from: 'Leila', text: 'Bring proper shoes, it was muddy last week!' },
    ],
  },
  {
    id: 'msc-ba-cohort',
    name: 'MSc Business Analytics · cohort',
    kind: 'group',
    avatar: 'plain',
    time: 'Sat',
    thread: [
      { from: 'Hannah', text: 'Does anyone have the slides from the forecasting lecture?' },
      { from: 'James', text: 'Uploaded to the Moodle forum.' },
    ],
  },
]

// The "New match · conversation starter" card at the top of Messages.
export const starter = {
  conversationId: 'priya-raman',
  text: 'You and Priya both listed bouldering — ask which wall she uses before pitching the coffee.',
  message: 'By the way, I saw you boulder too. Which wall do you go to?',
}

export default conversations
