// Picks the one "Recommended action" shown in the purple card at the top of Home.
//
// It uses the real list of UCL Careers appointment types (careerServices.json). That file says when
// each appointment is worth suggesting (its "trigger"). We follow two of those rules:
//   1. A saved job closes within 3 weeks  -> Applications Advice ("get feedback on your application")
//   2. Otherwise                          -> a Career Conversation about the student's route
import jobs from '../../data/jobs.js'
import { careerServices, todayISO } from '../../sampleData.js'

function daysBetween(fromISO, toISO) {
  return Math.round((new Date(`${toISO}T12:00:00`) - new Date(`${fromISO}T12:00:00`)) / 86400000)
}

export function recommendedAction(profile, today = todayISO()) {
  const byName = (name) => careerServices.find((s) => s.name === name)

  // Saved jobs that are still open, soonest deadline first.
  const closingSoon = jobs
    .filter((j) => profile.savedJobs.includes(j.id) && j.closes >= today)
    .sort((a, b) => a.closes.localeCompare(b.closes))[0]

  if (closingSoon && daysBetween(today, closingSoon.closes) <= 21) {
    const service = byName('Applications Advice Appointment')
    const days = daysBetween(today, closingSoon.closes)
    return {
      service,
      // The italic word in the headline is kept separate so the page can style it.
      before: 'Get ',
      italic: 'feedback',
      after: ` on your ${closingSoon.company} application`,
      detail: `Saved role closes in ${days} day${days === 1 ? '' : 's'} · adviser review of your CV and answers.`,
      button: 'Book Applications Advice',
      prep: service?.prep,
    }
  }

  const service = byName('Career Conversation')
  return {
    service,
    before: 'Talk through your ',
    italic: 'route',
    after: ' with an adviser',
    detail: `A 1:1 Career Conversation about becoming a ${profile.activeRoute} · online or on campus.`,
    button: 'Book a Career Conversation',
    prep: service?.prep,
  }
}
