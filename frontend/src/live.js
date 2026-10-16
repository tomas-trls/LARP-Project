// The bridge between the screens and the real back end.
//
// Every screen used to read made-up sample data. Now it asks the back end first and only falls back
// to the sample data if the back end cannot be reached or the student is not signed in. That way a
// network problem never leaves a blank screen during the demo.
//
//   const { data, live } = useLive('/opportunities/jobs', adaptJobs, sampleJobs)
//   data  -> what the screen should draw (real if live, sample otherwise)
//   live  -> true when `data` really came from the back end
import { useEffect, useState } from 'react'
import { api } from './api.js'
import { isLoggedIn } from './auth.js'

// Loads `path` once when the screen opens. `adapt` reshapes the answer into what the screen draws.
// `reloadKey` can be changed to ask again (for example after the student saves something).
export function useLive(path, adapt, fallback, reloadKey = 0) {
  const [state, setState] = useState({ data: fallback, live: false, loading: isLoggedIn() })

  useEffect(() => {
    if (!isLoggedIn()) return undefined
    let cancelled = false
    api
      .get(path)
      .then((answer) => !cancelled && setState({ data: adapt(answer), live: true, loading: false }))
      .catch(() => !cancelled && setState({ data: fallback, live: false, loading: false }))
    return () => {
      cancelled = true
    }
    // adapt and fallback are fixed for the life of a screen, so only the path and reloadKey matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey])

  return state
}

// Runs a save/update call and ignores a failure, so a tap never breaks the screen.
// The screen has already updated itself; this just tells the back end.
export function tell(call) {
  if (!isLoggedIn()) return Promise.resolve(null)
  return call().catch(() => null)
}

// ---------------------------------------------------------------------------
// Adapters: back end shape -> the shape the screens already draw
// ---------------------------------------------------------------------------

// Opportunities: one job. The screens expect { id, title, company, location, source, description,
// why, closes, salary, fit, level, visa }.
export function adaptJob(j) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location || 'London',
    source: j.is_demo ? 'LARP demo' : j.source || 'the employer',
    description: j.summary || '',
    why: (j.why || 'Matches your route').replace(/^Why:\s*/i, ''), // the screen adds its own "Why:"
    closes: j.closes_on ? j.closes_on.slice(0, 10) : '2099-12-31',
    salary: j.salary_text || '',
    fit: j.match_pct ?? 0,
    level: j.level,
    visa: j.visa_flag ? 'unknown' : 'yes',
    saved: Boolean(j.saved_status),
  }
}

export const adaptJobs = (answer) => answer.jobs.map(adaptJob)

// ---------------------------------------------------------------------------
// Career flow: saving what the student picks
// ---------------------------------------------------------------------------

// Save the roles picked on "Career path" as routes, and make the first one the active route.
// Roles already saved are skipped (the back end refuses duplicates). Failures are ignored.
export async function saveRoutes(titles) {
  if (!isLoggedIn() || titles.length === 0) return
  try {
    const existing = (await api.get('/routes')).routes
    const idByTitle = Object.fromEntries(existing.map((r) => [r.title.toLowerCase(), r.id]))
    for (const title of titles) {
      if (idByTitle[title.toLowerCase()]) continue
      const saved = await api.post('/routes', { title }).catch(() => null)
      if (saved) idByTitle[title.toLowerCase()] = saved.id
    }
    const first = idByTitle[titles[0].toLowerCase()]
    if (first) await api.put(`/routes/${first}/activate`)
  } catch {
    // The screen carries on with its local copy.
  }
}

// Save the student's rated work values. The design's list uses the same titles as the back end's,
// so we match by title. `ranked` is the list of titles, most important first (3 to 5 of them).
export async function saveWorkValues(ranked) {
  if (!isLoggedIn()) return
  try {
    const all = (await api.get('/work-values')).values
    const idByTitle = Object.fromEntries(all.map((v) => [v.title.toLowerCase(), v.id]))
    const ids = ranked.map((t) => idByTitle[t.toLowerCase()]).filter(Boolean).slice(0, 5)
    if (ids.length >= 3) await api.put('/work-values', { value_ids: ids })
  } catch {
    // Ignored: the local copy is still used.
  }
}

// ---------------------------------------------------------------------------
// Gap summary: one entry per saved route, shaped like the picked areas the Gaps screen already draws
// ---------------------------------------------------------------------------

const GAP_COLORS = ['#FFC46B', '#3DD6C1', '#FF8A7A', '#6FB8FF', '#F58BD8']
const CATEGORY_ORDER = ['academics', 'skills', 'teamwork', 'experience', 'leadership'] // same order as CATEGORIES

function routeToPicked(route, gap, index) {
  const by = Object.fromEntries(gap.categories.map((c) => [c.category, c]))
  const al = CATEGORY_ORDER.map((c) => by[c]?.benchmark_score ?? 0) // what people in the role score
  const mine = CATEGORY_ORDER.map((c) => by[c]?.user_score ?? 0) // what this student scores for this role
  const gaps = al.map((score, i) => score - mine[i])
  const worst = gaps.indexOf(Math.max(...gaps))
  const missing = gap.missing_skills.slice(0, 3).map((m) => m.skill)
  return {
    area: { id: String(route.id), title: route.title },
    gap: {
      al,
      fit: gap.fit_pct ?? 0,
      color: GAP_COLORS[index % GAP_COLORS.length],
      gap: gap.biggest_gap ? `Build: ${gap.biggest_gap.next_skill}` : 'No big gaps found',
      next: missing.length ? `Also missing: ${missing.join(', ')}` : 'Keep going',
    },
    worst,
    mine,
  }
}

// The real gap for every saved route, or null until it has loaded (or if there is nothing to show).
export function useRouteGaps() {
  const [items, setItems] = useState(null)
  useEffect(() => {
    if (!isLoggedIn()) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const { routes } = await api.get('/routes')
        const picked = await Promise.all(routes.map(async (r, i) => routeToPicked(r, await api.get(`/routes/${r.id}/gap`), i)))
        if (!cancelled && picked.length) setItems(picked)
      } catch {
        // Leave it null: the screen shows the sample areas instead.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return items
}

// ---------------------------------------------------------------------------
// Home: the events feed, recommended actions and featured events
// ---------------------------------------------------------------------------

const LONDON = 'Europe/London'

// '2026-10-20T17:00:00+00:00' -> { date: '2026-10-20', time: '17:00' } in London time.
function londonParts(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: LONDON }), // en-CA prints YYYY-MM-DD
    time: d.toLocaleTimeString('en-GB', { timeZone: LONDON, hour: '2-digit', minute: '2-digit' }),
    label: d.toLocaleDateString('en-GB', { timeZone: LONDON, weekday: 'short', day: 'numeric', month: 'short' }),
  }
}

const KIND = { opportunity: 'Careers', society: 'Societies', social: 'Social' }

// One event from the back end -> the shape the Home rows draw.
function adaptEvent(e) {
  const start = londonParts(e.start_time)
  const end = e.end_time ? londonParts(e.end_time) : start
  const place = (e.location_name || '').split(',')[0].replace(/^Students' Union UCL listing.*/i, "Students' Union UCL")
  return {
    id: e.event_id,
    date: start.date,
    start: start.time,
    end: end.time,
    title: e.title,
    place,
    host: e.society || e.employer || "Students' Union",
    kind: KIND[e.category] || 'Social',
    tag: KIND[e.category] || 'Social',
    score: e.category === 'opportunity' ? 4 : 2,
    why: e.why,
    action: e.cta === 'Book' ? 'Book' : 'Join',
    going: Boolean(e.saved_status),
    label: start.label,
    connectionsGoing: e.connections_going || 0,
    category: e.category,
  }
}

export function adaptHome(h) {
  const events = h.feed.map(adaptEvent)
  // Recommended actions: the carousel wants { id, label, prep, why, cta, pop }.
  const actions = h.actions.map((a) => ({
    id: `${a.kind}-${a.ref.id}`,
    label: a.title,
    prep: a.kind === 'review_job' ? 'Open Opportunities to read the full advert and save it.' : 'Have a look and book your place.',
    why: a.detail.replace(/Why:\s*/g, ''),
    cta: a.cta,
    pop: true,
  }))
  // Featured: the back end's top pick plus the next best career events.
  const top = h.featured ? [adaptEvent(h.featured)] : []
  const more = events.filter((e) => e.category === 'opportunity' && !top.some((t) => t.id === e.id)).slice(0, 2)
  const featured = [...top, ...more].map((e) => ({
    ev: { key: `live-${e.id}`, id: e.id, title: e.title, cat: e.kind, blockBg: '#993BFF', blockInk: '#FFFFFF', dateLabel: e.label, time: e.start, place: e.place },
    why: e.why,
    tags: '',
    pop: true,
    going: e.connectionsGoing,
  }))
  return { events, actions, featured, going: events.filter((e) => e.going).map((e) => e.id) }
}

// ---------------------------------------------------------------------------
// Societies: tell the back end when the student joins or leaves one
// ---------------------------------------------------------------------------

let societyIds = null // lower-case society name -> back end id, loaded once

// The Societies screen lists all 472 UCL groups; the back end knows the ones LARP tracks events for.
// If the group the student taps is one of those, save the membership. Others stay local.
export async function syncSociety(name, join) {
  if (!isLoggedIn()) return
  try {
    if (!societyIds) {
      const { societies } = await api.get('/societies')
      societyIds = Object.fromEntries(societies.map((s) => [s.name.toLowerCase(), s.id]))
    }
    const id = societyIds[name.toLowerCase()]
    if (!id) return
    if (join) await api.put(`/societies/${id}/membership`, {})
    else await api.delete(`/societies/${id}/membership`)
  } catch {
    // Ignored: the local list is still correct on screen.
  }
}

// ---------------------------------------------------------------------------
// People › Career: alumni and students further along the student's route
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ['#BA82FF', '#993BFF', '#A66BFF', '#8D5BD9', '#DDBDFF', '#56338A', '#C4A3F0', '#7A4FB5']

// One person from /people/career -> the card the swipe deck draws.
export function adaptPeople(answer) {
  return answer.people.map((p, i) => ({
    id: `u${p.user_id}`,
    userId: p.user_id,
    name: p.name,
    first: p.name.split(' ')[0],
    role: p.headline || [p.course, p.year ? `year ${p.year}` : null].filter(Boolean).join(' · '),
    match: Math.max(60, 92 - i * 4), // the back end already sorts best first; this just shows that order
    alumni: p.is_alumni,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    tags: [p.is_alumni ? 'Alumni' : 'Student', ...(p.skills_to_learn || []).slice(0, 2), p.accepting_requests ? 'Open to coffee' : null].filter(Boolean),
    why: p.reason,
    hook: `following the ${answer.active_route || 'same'} route`,
    connection: p.connection,
  }))
}

// Send a connection request to a real person (people from the sample deck have no user id and are skipped).
export function requestConnection(person, note) {
  if (!person.userId) return Promise.resolve(null)
  return tell(() => api.post('/connections', { user_id: person.userId, kind: 'career', note: note || null }))
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

const ago = (iso) => {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso)) / 86400000))
  return days === 0 ? 'today' : `${days}d`
}

// /connections -> { connections, pending } in the shapes the Connections screen draws.
export function adaptConnections(answer) {
  const line = (c) => c.headline || (c.is_alumni ? 'UCL alumni' : 'UCL student')
  const connections = answer.connections.map((c) => ({
    id: `u${c.user_id}`,
    userId: c.user_id,
    name: c.name,
    kind: c.kind,
    line: line(c),
    note: c.note || 'Connected on LARP',
    linkedin: c.kind === 'career',
    link: c.kind === 'social',
  }))
  const pending = [
    ...answer.incoming.map((c) => ({
      id: `u${c.user_id}`, connectionId: c.connection_id, name: c.name, kind: c.kind,
      line: `${line(c)} · sent you a request · ${ago(c.created_at)}`, linkedin: c.kind === 'career', link: c.kind === 'social',
    })),
    ...answer.outgoing.map((c) => ({
      id: `u${c.user_id}`, connectionId: c.connection_id, name: c.name, kind: c.kind,
      line: `${line(c)} · you sent a request · ${ago(c.created_at)}`, linkedin: c.kind === 'career', link: c.kind === 'social', sentByMe: true,
    })),
  ]
  return { connections, pending }
}

// Accept an incoming request.
export const answerConnection = (connectionId, action) => tell(() => api.put(`/connections/${connectionId}`, { action }))

// ---------------------------------------------------------------------------
// CV: upload for a draft, then save the reviewed profile
// ---------------------------------------------------------------------------

const LEVEL_TO_NUMBER = { basic: 1, conversational: 2, fluent: 4, native: 5 } // the Review screen uses 1 to 5
const NUMBER_TO_LEVEL = ['basic', 'basic', 'conversational', 'fluent', 'fluent', 'native'] // index = 0..5

// The draft the back end read from the CV -> the shape of profile.cv.
export function draftToCv(draft, fileName) {
  return {
    file: fileName,
    edu: draft.education.map((e) => ({ degree: e.degree, inst: e.institution, start: e.start_year ? String(e.start_year) : '', end: e.end_year ? String(e.end_year) : '' })),
    exp: draft.experience.map((x) => ({ role: x.title, org: x.organisation, loc: x.location || '', start: x.start || '', end: x.end || '' })),
    skills: draft.skills,
    langs: draft.languages.map((l) => ({ name: l.language, level: LEVEL_TO_NUMBER[l.level] || 4 })),
  }
}

// Upload a CV file. Returns the profile.cv shape, or null if the back end could not read it
// (the screen then falls back to the example profile).
export async function uploadCv(file) {
  if (!isLoggedIn()) return null
  try {
    const form = new FormData()
    form.append('file', file)
    return draftToCv(await api.upload('/profile/cv', form), file.name)
  } catch {
    return null
  }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// 'Jun 2024' -> '2024-06', '2025' -> '2025', anything else -> null (the back end wants YYYY or YYYY-MM).
function isoMonth(text) {
  const t = (text || '').trim().toLowerCase()
  const year = t.match(/\d{4}/)?.[0]
  if (!year) return null
  const month = MONTHS.findIndex((m) => t.startsWith(m))
  return month >= 0 ? `${year}-${String(month + 1).padStart(2, '0')}` : year
}

const yearOrNull = (text) => {
  const y = parseInt(text, 10)
  return y >= 1950 && y <= 2100 ? y : null
}

// Save the reviewed CV as the student's real profile. This is what makes their skills count
// towards their fit scores, gaps and job matches. Failures are ignored (the local copy is kept).
export function saveCvProfile(cv) {
  return tell(() =>
    api.put('/profile', {
      education: cv.edu.filter((e) => e.degree && e.inst).map((e) => ({ degree: e.degree, institution: e.inst, start_year: yearOrNull(e.start), end_year: yearOrNull(e.end) })),
      experience: cv.exp
        .filter((x) => x.role && x.org)
        .map((x) => ({ title: x.role, organisation: x.org, location: x.loc || null, start: isoMonth(x.start), end: isoMonth(x.end), kind: /intern/i.test(x.role) ? 'internship' : 'job' })),
      skills: cv.skills,
      languages: cv.langs.map((l) => ({ language: l.name, level: NUMBER_TO_LEVEL[l.level] || 'fluent' })),
    }),
  )
}

// ---------------------------------------------------------------------------
// Signing in: load the real account into the local profile
// ---------------------------------------------------------------------------

// The saved CV, routes and name for the signed-in student, shaped like the local profile.
// Returns null if the back end cannot be reached (the screens then keep their example data).
export async function loadServerProfile() {
  try {
    const [p, r] = await Promise.all([api.get('/profile'), api.get('/routes')])
    const active = r.routes.find((x) => x.is_active)
    return {
      name: p.name,
      cv: {
        file: 'CV saved on LARP',
        edu: p.education.map((e) => ({ degree: e.degree, inst: e.institution, start: e.start_year ? String(e.start_year) : '', end: e.end_year ? String(e.end_year) : '' })),
        exp: p.experience.map((x) => ({ role: x.title, org: x.organisation, loc: x.location || '', start: x.start || '', end: x.end || '' })),
        skills: p.skills.map((s) => s.name),
        langs: p.languages.map((l) => ({ name: l.language, level: LEVEL_TO_NUMBER[l.level] || 4 })),
      },
      activeRoute: active?.title,
      roles: r.routes.map((x) => x.title).slice(0, 3),
    }
  } catch {
    return null
  }
}
