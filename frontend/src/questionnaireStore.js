// Keeps the questionnaire answers in the browser until the student registers.
//
// sessionStorage lives only in this browser tab: a refresh keeps it, closing the tab clears it.
// Nothing is sent to the back end (and no account is made) until the final "create account" step.

import { YEARS } from './questionnaireOptions.js'

const KEY = 'larp_answers'

// What the questionnaire looks like before anyone has answered anything.
export const EMPTY_ANSWERS = {
  step: 1, // which screen the student is on
  campus: '',
  travel_ok: true, // "happy to travel" starts switched on
  course: '',
  yearLabel: '', // "Masters" and "PhD" both mean year 5, so we remember the label the student picked
  hasExperience: null, // null = not answered, false = "None", true = "I have some"
  experience_industry: [],
  experience_note: '',
  tag_ids: [],
  alcohol_pref: '',
  goal: '',
  looking_for: '',
  offers: '',
  availability: [],
}

export function loadAnswers() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY))
    return { ...EMPTY_ANSWERS, ...saved }
  } catch {
    return { ...EMPTY_ANSWERS } // nothing saved yet, or it was unreadable
  }
}

export function saveAnswers(answers) {
  sessionStorage.setItem(KEY, JSON.stringify(answers))
}

export function clearAnswers() {
  sessionStorage.removeItem(KEY)
}

// Have they got to the end of the questionnaire? (The register page needs the answers.)
export function hasFinishedQuestionnaire(a) {
  return Boolean(a.campus && a.course && a.yearLabel && a.tag_ids.length && a.alcohol_pref && a.goal)
}

// Turns the saved answers plus the account details into the shape POST /api/register expects
// (see RegisterIn in the back end). `account` = name, ucl_email, password and the LinkedIn fields.
export function buildRegistration(a, account) {
  const year = YEARS.find((y) => y.label === a.yearLabel)?.value
  return {
    ...account,
    campus: a.campus,
    travel_ok: a.travel_ok,
    course: a.course,
    year,
    experience_industry: a.experience_industry,
    experience_note: a.experience_note.trim() || null,
    tag_ids: a.tag_ids,
    alcohol_pref: a.alcohol_pref,
    goal: a.goal,
    looking_for: a.looking_for ? [a.looking_for] : [],
    offers: a.offers ? [a.offers] : [],
    availability: a.availability,
  }
}
