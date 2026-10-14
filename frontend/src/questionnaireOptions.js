// The fixed lists of choices used by the questionnaire, all in one place.
// To add or rename a choice, change it here and every screen updates.
//
// "value" is what we send to the back end. "label" is what the student reads.

export const CAMPUS_CHOICES = [
  { value: 'main', label: 'Main campus', hint: 'Bloomsbury and around' },
  { value: 'canary', label: 'Canary Wharf', hint: 'The east London campus' },
  { value: 'both', label: 'Both', hint: 'I move between the two' },
]

// The course names contain the keywords the matching engine uses to work out
// "same field" (see COURSE_FIELDS in backend/app/matching.py).
export const COURSES = [
  'Computer Science',
  'Data Science',
  'Information Management',
  'Economics',
  'Finance',
  'Management',
  'Business Analytics',
  'Statistics',
  'Mathematics',
  'Accounting',
  'Law',
  'Politics and International Relations',
  'History',
  'Philosophy',
  'English',
  'Geography',
  'Sociology',
  'Sustainability',
  'Psychology',
  'Biomedical Sciences',
  'Medicine',
  'Chemistry',
  'Physics',
  'Biology',
  'Engineering',
  'Other',
]

// The back end stores the year as a number from 1 to 5 (5 = postgraduate).
export const YEARS = [
  { value: 1, label: 'Year 1' },
  { value: 2, label: 'Year 2' },
  { value: 3, label: 'Year 3' },
  { value: 4, label: 'Year 4' },
  { value: 5, label: 'Masters' },
  { value: 5, label: 'PhD' },
]

export const INDUSTRIES = [
  'Finance and banking',
  'Consulting',
  'Tech and software',
  'Data and analytics',
  'Law',
  'Healthcare',
  'Media and creative',
  'Retail and hospitality',
  'Charity and public sector',
  'Other',
]

export const ALCOHOL_CHOICES = [
  { value: 'drinks', label: 'I drink and enjoy bar and club nights' },
  { value: 'bars_no_drink', label: "I'm happy at bars and pubs but I don't drink" },
  { value: 'avoid', label: "I'd rather avoid alcohol-focused events" },
]

export const GOAL_CHOICES = [
  { value: 'career', label: 'Career events' },
  { value: 'social', label: 'Social events' },
  { value: 'both', label: 'Both' },
]

// Needs and offers list from the Backend Spec (questions 8 and 9).
export const SKILLS = [
  'Tutoring',
  'Software development',
  'Business and consulting help',
  'Design and creative',
  'Video and photography',
  'Acting and performance',
  'Music',
  'Project teammates',
  'Mentoring or CV review',
  'Other',
]

export const FREE_TIMES = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weeknights', label: 'Weeknights' },
  { value: 'weekends', label: 'Weekends' },
]

// The most interests a student can pick (the back end enforces the same limit).
export const MAX_TAGS = 8
