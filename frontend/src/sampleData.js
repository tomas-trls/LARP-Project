// The one place screens get their data from.
//
// There is no back end for the v2 screens yet, so this file reads:
//   - the real UCL sample data, converted to JSON by scripts/build_sample_data.py
//     (events.json, careerEvents.json, careerServices.json, societies.json)
//   - made-up but realistic data written by hand in src/data/*.js (jobs, people, messages)
//
// When an API endpoint exists, change the matching function here to call it (see api.js and useApi.js)
// and the screens do not need to change.
import careerEvents from './data/careerEvents.json'
import careerServices from './data/careerServices.json'
import suEvents from './data/events.json'
import societies from './data/societies.json'

export { careerEvents, careerServices, societies, suEvents }

// "Today" for the app, as 'YYYY-MM-DD'. Events before today are hidden.
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Events (Students' Union or UCL Careers) from today onwards, soonest first.
export function upcoming(list, fromDate = todayISO()) {
  return list.filter((e) => e.date >= fromDate)
}

// '2026-10-16' -> 'Thu 16 Oct'
export function shortDate(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// '2026-10-16' -> { day: 'THU', num: '16' } for the little date tiles on event rows.
export function dateTile(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(), num: String(d.getDate()) }
}

// 'Tuesday 14 October' for the Home greeting.
export function longDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Morning / Afternoon / Evening for the Home greeting.
export function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
}
