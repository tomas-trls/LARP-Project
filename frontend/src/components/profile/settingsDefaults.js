// Settings (screen 17): what every setting starts as, copied from the design.
// The student's changes are saved in profile.settings and merged over these.
export const DEFAULT_SETTINGS = {
  notif: { matches: true, messages: true, events: true, roles: false },
  filt: { from: false, rel: false, drink: true, ints: true },
  balance: 50,
  lookFor: ['Friends', 'Study buddies', 'Mentors'],
  years: ['1st', '2nd', '3rd'],
  people: ['Students', 'Alumni', 'Same programme'],
  sizes: ['3', '6'],
  match: { Hobbies: true, Routes: true, Societies: true, Location: false, 'Year of study': false, 'Career goals': true, 'Industries of interest': true, Languages: false, 'Same faculty': false },
  avail: ['Weekday evenings', 'Weekends'],
  events: 'Balanced',
  vis: 'Everyone at UCL',
  priv: { incognito: false, active: true, receipts: true, hideCourse: false, verified: false },
  showGT: true,
}
