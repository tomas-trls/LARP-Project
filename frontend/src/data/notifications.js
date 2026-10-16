// Made-up notifications for the bell on Home (design v3, screen 10).
//
// Each notification is one row. The bold parts are b1 and b2, so a row reads:
//   pre + **b1** + mid + **b2** + post
//
//   cat    which filter chip it belongs to: 'Groups' | 'Messages' | 'Careers' | 'Badges'
//   when   'Today' or 'Earlier this week' (the two headings in the list)
//   icon   the emoji in the small badge (or the big square when there is no avatar)
//   who    a person from SOCIAL_PEOPLE (src/data/people.js) whose avatar is shown, if any
//   t      how long ago
//   act    the small button on the right, if any. done = what it says after you press it.
//          A button without "done" (like "View") just opens the notification.
//   go     where tapping it takes you:
//            { group: 'g4' }        open that group post's comments (src/data/feed.js)
//            { to: '/messages?chat=priya' }   go to another screen
//
// For groups, b2 is replaced on screen by the real event title of that group post.
export const NOTIFICATIONS = [
  {
    id: 'n1',
    cat: 'Groups',
    when: 'Today',
    icon: '👥',
    who: 'leila',
    b1: 'Leila H.',
    mid: ' and 1 other joined your group for ',
    b2: 'Meet the Deloitte Team',
    post: ' · 4/6',
    t: '12m',
    act: 'View',
    go: { group: 'g4' },
  },
  {
    id: 'n2',
    cat: 'Messages',
    when: 'Today',
    icon: '☕',
    whoColor: '#BA82FF', // Priya Raman, the alumna (not on the social side)
    b1: 'Priya Raman',
    mid: ' accepted your coffee chat · ',
    b2: 'Thu 15:00, Costa Marshgate',
    t: '40m',
    act: 'Add to calendar',
    done: 'Added ✓',
    go: { to: '/messages?chat=priya' },
  },
  {
    id: 'n3',
    cat: 'Careers',
    when: 'Today',
    icon: '⏰',
    b1: 'Applications Advice',
    mid: ' slots release at ',
    b2: '9:00 tomorrow',
    t: '1h',
    act: 'Set reminder',
    done: 'Reminder set ✓',
  },
  {
    id: 'n4',
    cat: 'Badges',
    when: 'Today',
    icon: '🎉',
    pre: 'You earned the ',
    b1: 'Networker',
    mid: ' badge · ',
    b2: '+30 XP',
    t: '2h',
    go: { to: '/profile' },
  },
  {
    id: 'n5',
    cat: 'Groups',
    when: 'Today',
    icon: '💬',
    who: 'marco',
    b1: 'Marco B.',
    mid: ' commented on ',
    b2: 'Welcome Quiz Night',
    post: ': “Table booked for 6…”',
    t: '3h',
    go: { group: 'g1' },
  },
  {
    id: 'n6',
    cat: 'Messages',
    when: 'Earlier this week',
    icon: '📣',
    b1: 'Data Science Society',
    mid: ': Kaggle 101 moved to ',
    b2: 'Roberts 106',
    t: 'Mon',
    go: { to: '/messages?chat=dss' },
  },
  {
    id: 'n7',
    cat: 'Groups',
    when: 'Earlier this week',
    icon: '📅',
    b1: 'Bending Spoons Networking',
    mid: ' starts tomorrow at 16:00 · ',
    b2: 'you’re 1 of 3',
    t: 'Mon',
    go: { to: '/messages?chat=bending' },
  },
  {
    id: 'n8',
    cat: 'Badges',
    when: 'Earlier this week',
    icon: '🔥',
    b1: '3-week streak!',
    mid: ' Go to one careers event this week to keep it',
    t: 'Sun',
    go: { to: '/profile' },
  },
]

export const NOTIFICATION_FILTERS = ['All', 'Groups', 'Messages', 'Careers', 'Badges']
