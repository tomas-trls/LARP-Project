// The student's own data: what they typed during onboarding and what they tapped later
// (saved jobs, people they follow, societies they joined...).
//
// There is no back end for these screens yet, so everything lives in the browser's localStorage
// under the key "larp_profile". A refresh keeps it. "Reset demo" on the Profile screen clears it.
//
// Any screen can read and change it:
//   const { profile, update } = useProfile()
//   profile.interests.on              -> the hobbies the student picked
//   update('interests', { on: [...] }) -> changes just those fields and saves
import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'larp_profile'

// What a brand-new student starts with. The CV and hobby values are the design's example
// student (Maya), so the demo looks full even if someone skips a step.
// eslint-disable-next-line react/only-export-components
export const DEFAULT_PROFILE = {
  signedIn: false,
  email: '',
  firstName: 'Maya',
  lastName: 'Whitfield',

  // 03-04: the profile read from the CV (or typed in by hand)
  cv: {
    file: 'Maya_CV.pdf',
    edu: [
      { degree: 'MSc Business Analytics', inst: 'UCL School of Management', start: '2025', end: '2026' },
      { degree: 'BSc Computer Science', inst: 'University of Warwick', start: '2020', end: '2024' },
    ],
    exp: [{ role: 'Product Intern', org: 'Monzo', loc: 'London', start: 'Jun 2024', end: 'Sep 2025' }],
    skills: ['SQL', 'Python', 'Tableau', 'Data Visualisation', 'Java', 'C++'],
    langs: [
      { name: 'English', level: 5 },
      { name: 'French', level: 3 },
    ],
  },

  // 05: personality. answers = { statementIndex: 1..5 }, vert = 0 introvert, 1 ambivert, 2 extrovert
  personality: { answers: {}, vert: 1, done: false },

  // 06: hobbies and a few optional facts. from / rel / drink are positions in their option lists.
  interests: {
    all: ['🧗 Bouldering', '⚽ Football', '🕺 Clubbing', '🎮 Gaming', '🍳 Cooking', '🏂 Snowboarding', '🏃 Running', '🎧 Techno', '🏋️‍♂️ Gym', '🎾 Padel', '♟️ Chess', '🥾 Hiking'],
    on: ['🧗 Bouldering', '🕺 Clubbing', '🏂 Snowboarding', '🎾 Padel'],
    from: 0,
    rel: 0,
    drink: 0,
    note: '',
    custom: {}, // hobbies the student added themselves, by category
  },

  // 07a: up to 3 roles the student has in mind. custom = roles they typed themselves.
  roles: { sel: ['Product Manager'], custom: [] },

  // 07b: work values. ratings = { valueKey: 1..5 }. custom = values they added.
  // top = the 5 values the student picked to rate (keys as strings).
  values: { ratings: { 0: 5, 1: 4, 2: 3 }, custom: [], top: ['0', '1', '2'] },

  // 08-09: career areas. on = ids of the picked areas. custom = areas they added.
  areas: { on: ['prod', 'anal'], custom: [] },

  // Main app
  activeRoute: 'Product Manager', // the one Future Me route that drives Home and Opportunities
  savedJobs: ['apm-expedia', 'txb-goldman', 'bcg-x'], // ids from src/data/jobs.js
  following: [
    'priya-raman', 'marco-bellini', 'aisha-khan', 'daniel-hughes', 'leila-haddad',
    'tom-reynolds', 'chloe-bennett', 'hannah-clarke', 'sophie-marsh',
  ], // ids from src/data/people.js
  requested: [], // people the student sent a connection request to (inside LARP only)
  paired: [], // social pairings the student said yes to
  accepted: [], // pending requests the student accepted
  societiesChanged: false, // true once the student has joined or left a society themselves
  societies: [], // names of joined societies, from src/data/societies.json
  going: [], // ids of events the student said they're going to
  connectionStyle: 'Requests',

  // Home and People feeds (group posts, comments, the swipe deck)
  groupsJoined: [], // ids of group posts the student joined
  waitlist: [], // ids of full groups the student is waiting for
  myGroups: [], // group posts the student created
  myComments: {}, // comments the student wrote, by post id
  likedComments: [],
  passedPeople: [], // people swiped away on People › Career
  savedPeople: [], // people saved with the bookmark
  actionsRequested: [], // recommended actions the student pressed
  memPromptDismissed: false,
}

const ProfileContext = createContext(null)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    // Merge with the defaults so a new field added later is never missing.
    return saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(load)

  // Save after every change.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile))
    } catch {
      // Storage can be blocked (private window). The app still works for this visit.
    }
  }, [profile])

  // update('cv', { skills: [...] }) merges into an object field.
  // update('savedJobs', [...]) or update('signedIn', true) replaces a list or a plain value.
  const update = (key, value) =>
    setProfile((p) => {
      const old = p[key]
      const isObject = old && typeof old === 'object' && !Array.isArray(old)
      return { ...p, [key]: isObject ? { ...old, ...value } : value }
    })

  const reset = () => setProfile(DEFAULT_PROFILE)

  return <ProfileContext.Provider value={{ profile, update, reset }}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useProfile() {
  return useContext(ProfileContext)
}

// Turns "maya.whitfield.26@ucl.ac.uk" into { firstName: 'Maya', lastName: 'Whitfield' }.
// eslint-disable-next-line react/only-export-components
export function namesFromEmail(email) {
  const parts = email.split('@')[0].split(/[._-]/).filter((p) => /^[a-z]+$/i.test(p))
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '')
  return { firstName: cap(parts[0]) || 'Maya', lastName: cap(parts[1]) || '' }
}
