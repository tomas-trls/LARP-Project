// The "Recommended actions" cards at the top of Home (a sideways carousel).
//
// Each card is a real UCL Careers appointment type (careerServices.json). That file says when
// each appointment is worth suggesting (its "trigger"); the "why" line on each card follows it:
//   1. A saved job closes within 3 weeks -> Applications Advice ("get feedback on my application")
//      and, on the day, a quick application check
//   2. Case interviews are a gap on the Consulting route -> SoM practice interview
//   3. Always useful for a School of Management student -> a SoM careers chat
// The first card is the "Top for you" one (purple). pop = shown under "Most popular".
import jobs from '../../data/jobs.js'
import { careerServices, todayISO } from '../../sampleData.js'

function daysBetween(fromISO, toISO) {
  return Math.round((new Date(`${toISO}T12:00:00`) - new Date(`${fromISO}T12:00:00`)) / 86400000)
}

const service = (id) => careerServices.find((s) => s.id === String(id))

export function recommendedActions(profile, today = todayISO()) {
  // Saved jobs that are still open, soonest deadline first.
  const closing = jobs
    .filter((j) => profile.savedJobs.includes(j.id) && j.closes >= today)
    .sort((a, b) => a.closes.localeCompare(b.closes))[0]
  const days = closing ? daysBetween(today, closing.closes) : null
  const soon = closing && days <= 21

  const cards = []
  if (soon) {
    cards.push({
      id: '6',
      label: 'Get feedback on my application',
      prep: 'Upload your draft and the job description; note the deadline.',
      why: `${closing.company} closes in ${days} day${days === 1 ? '' : 's'} · on your saved roles`,
      cta: 'Book Applications Advice',
      pop: true,
    })
  } else {
    cards.push({
      id: '4',
      label: 'Talk through your route with an adviser',
      prep: 'What 2–3 questions do you want answered in 30 minutes?',
      why: `A 1:1 Career Conversation about becoming a ${profile.activeRoute}`,
      cta: 'Book a Career Conversation',
      pop: true,
    })
  }
  cards.push({
    id: '3',
    label: 'Request a practice interview',
    prep: 'Upload the job description and note the interview format: competency, case or technical.',
    why: 'Case interviews are the biggest gap on your Consulting route',
    cta: 'Send request',
    pop: true,
  })
  cards.push({
    id: '1',
    label: 'Book a SoM careers chat',
    prep: 'What 2–3 questions do you want answered in 30 minutes?',
    why: `School of Management student · ${profile.savedJobs.length} saved, 0 applied`,
    cta: 'Pick a 30-min slot',
  })
  if (soon) {
    cards.push({
      id: '7',
      label: 'Quick application check today',
      prep: 'Upload your most recent draft now. The adviser reads it in the session.',
      why: 'Your deadline is close and same-day slots open each morning',
      cta: 'See today’s slots',
      pop: true,
    })
  }
  // Keep only appointment types that exist in the real UCL Careers list.
  return cards.filter((c) => service(c.id)).map((c) => ({ ...c, service: service(c.id) }))
}
