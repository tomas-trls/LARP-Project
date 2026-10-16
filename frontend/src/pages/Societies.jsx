// Screen 14 · Societies: the real list of 472 UCL student groups (Sample data/Student groups.xlsx),
// ranked by how well each one fits your profile.
//
// How the fit score works (simple on purpose, so the "why" line is the real reason):
//   - words linked to your career route   (e.g. Product Manager -> product, tech, entrepreneur...)  4 points each, up to 3
//   - words linked to your CV skills       (e.g. Python -> data, coding, computing)                 2 points each, up to 2 skills
//   - words linked to your hobbies         (e.g. Snowboarding -> snowboard, skiing)                 4 points
//   - a career-friendly category           (Technology & science, Finance & enterprise...)          1 point
// The points are turned into a percentage between 50% and 97%.
// Words are only looked for in the society's name and tagline.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { ChipRow } from '../components/ui.jsx'
import { joinedList, plainHobby } from '../data/people.js'
import { syncSociety } from '../live.js'
import { useProfile } from '../profileStore.jsx'
import { societies } from '../sampleData.js'

// Words that go with each kind of career route. A route matches a row if its name contains the key.
const ROUTE_WORDS = {
  product: ['product', 'technology', 'tech ', 'entrepreneur', 'startup', 'fintech', 'business', 'innovation'],
  manager: ['leadership', 'management', 'business'],
  analyst: ['data', 'analytics', 'statistics', 'economics', 'finance'],
  data: ['data', 'analytics', 'statistics', 'machine learning', 'ai'],
  consult: ['consulting', 'strategy', 'business', 'management'],
  bank: ['finance', 'investment', 'hedge', 'trading', 'economics'],
  invest: ['finance', 'investment', 'hedge', 'trading', 'economics'],
  engineer: ['tech', 'computing', 'coding', 'hack', 'software', 'robotics'],
  developer: ['tech', 'computing', 'coding', 'hack', 'software'],
  market: ['marketing', 'media', 'brand', 'advertising'],
  design: ['design', 'art', 'creative'],
}
const SKILL_WORDS = {
  python: ['data', 'coding', 'computing', 'programming'],
  sql: ['data', 'analytics'],
  tableau: ['data', 'analytics'],
  'data visualisation': ['data', 'analytics'],
  java: ['coding', 'computing', 'software', 'programming'],
  'c++': ['coding', 'computing', 'software', 'programming'],
}
const HOBBY_WORDS = {
  bouldering: ['climb', 'boulder', 'mountaineer'],
  football: ['football', 'futsal'],
  clubbing: ['dj', 'dance', 'electronic'],
  gaming: ['gaming', 'esports', 'game'],
  cooking: ['cooking', 'baking', 'food'],
  snowboarding: ['snowboard', 'snowsport', 'skiing'],
  running: ['running', 'athletic', 'marathon'],
  techno: ['techno', 'electronic', 'dj'],
  gym: ['fitness', 'weightlifting', 'powerlifting', 'gym'],
  padel: ['padel', 'tennis'],
  chess: ['chess'],
  hiking: ['hiking', 'walking', 'outdoor', 'mountaineer'],
}
const CAREER_CATEGORIES = ['Technology & science', 'Finance & enterprise', 'Skills & training']

// Score one society against the student's profile. Returns { fit, why }.
function scoreSociety(group, profile) {
  // Only the name and tagline are searched (the category names are too general), and a word
  // must start a word in the text: "climb" finds "climbing", but "ski" does not find "skills".
  const text = `${group.name} ${group.description}`.toLowerCase()
  const has = (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)
  let points = 0
  const reasons = []

  // Career route(s): the active route counts most, other saved routes help too.
  const routes = [profile.activeRoute, ...profile.roles.sel].filter(Boolean).join(' ').toLowerCase()
  const routeHits = new Set()
  Object.entries(ROUTE_WORDS).forEach(([key, words]) => {
    if (routes.includes(key)) words.filter(has).forEach((w) => routeHits.add(w))
  })
  if (routeHits.size) {
    points += 4 * Math.min(routeHits.size, 3)
    reasons.push('Your route')
  }

  // CV skills
  const skillHit = profile.cv.skills.find((s) => (SKILL_WORDS[s.toLowerCase()] ?? [s.toLowerCase()]).some(has))
  if (skillHit) {
    const skillCount = profile.cv.skills.filter((s) => (SKILL_WORDS[s.toLowerCase()] ?? [s.toLowerCase()]).some(has)).length
    points += 2 * Math.min(skillCount, 2) // at most 2 skills count, so skills never outweigh your route
    reasons.push(skillHit)
  }

  // Hobbies
  const hobbyHit = profile.interests.on.find((h) => (HOBBY_WORDS[plainHobby(h)] ?? [plainHobby(h)]).some(has))
  if (hobbyHit) {
    points += 4
    reasons.push(plainHobby(hobbyHit).replace(/^./, (c) => c.toUpperCase()))
  }

  if (group.categories.some((c) => CAREER_CATEGORIES.includes(c))) points += 1

  const fit = Math.min(97, 50 + Math.round(points * 3.5))
  return { fit, why: reasons.length ? reasons.join(' + ') : '' }
}

// "Economics and Finance Society" -> "Economics & Finance" for the small chips.
function shortName(name) {
  return name.replace(/ (Society|Club)$/, '').replace(' and ', ' & ')
}

export default function Societies() {
  const { profile, update } = useProfile()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('For you')
  const [limit, setLimit] = useState(12)
  const [applied, setApplied] = useState(false)

  const joined = joinedList(profile)
  const toggleJoin = (name) => {
    const joining = !joined.includes(name)
    update('societies', joining ? [...joined, name] : joined.filter((n) => n !== name))
    update('societiesChanged', true)
    syncSociety(name, joining) // also save it in the back end (for the societies it tracks)
  }

  // Category chips: "For you", the career-friendly ones, then the rest by how many groups they have.
  const counts = {}
  societies.forEach((g) => g.categories.forEach((c) => (counts[c] = (counts[c] ?? 0) + 1)))
  const otherCats = Object.keys(counts)
    .filter((c) => !CAREER_CATEGORIES.includes(c) && c !== 'Sport')
    .sort((a, b) => counts[b] - counts[a])
  const chips = ['For you', ...CAREER_CATEGORIES, 'Sport', ...otherCats]

  // Score, filter and sort.
  const q = query.trim().toLowerCase()
  const ranked = societies
    .map((g) => ({ ...g, ...scoreSociety(g, profile) }))
    .filter((g) => category === 'For you' || g.categories.includes(category))
    .filter((g) => !q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name))

  return (
    <Screen tabs>
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">Societies</h1>
        <div className="text-[13px] text-mute">
          {joined.length} joined · {societies.length} groups
        </div>
      </div>

      <label className="mt-3.5 flex h-12 flex-none items-center gap-2.5 rounded-2xl bg-sf px-4 shadow-ring">
        <Icon name="search" size={18} className="text-mute" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(12)
          }}
          placeholder="Search societies and clubs"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-mute">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>

      <ChipRow className="mt-3">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCategory(c)
              setLimit(12)
            }}
            className={`flex-none rounded-full px-3 py-[7px] text-[12px] whitespace-nowrap ${
              category === c ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf shadow-ring'
            }`}
          >
            {c}
          </button>
        ))}
      </ChipRow>

      {!q && (
        <>
          <div className="mt-4 flex items-baseline justify-between px-1">
            <h2 className="font-display text-[20px] font-normal">Your societies</h2>
            <div className="text-[13px] text-mute">{joined.length}</div>
          </div>
          <ChipRow className="mt-2">
            {joined.length ? (
              joined.map((n) => (
                <span key={n} className="flex-none rounded-full bg-sf px-[11px] py-1.5 text-[12px] whitespace-nowrap shadow-ring">
                  {shortName(n)}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-mute">Join a society below and it shows up here.</span>
            )}
          </ChipRow>
        </>
      )}

      <h2 className="mt-4 px-1 font-display text-[20px] font-normal">
        {q ? `${ranked.length} result${ranked.length === 1 ? '' : 's'}` : 'Ranked by fit to your profile'}
      </h2>
      <div className="mt-2.5 grid gap-2 lg:grid-cols-2">
        {ranked.slice(0, limit).map((g) => {
          const member = joined.includes(g.name)
          return (
            <div key={g.name} className="flex items-center gap-3 rounded-[20px] bg-sf p-3.5 shadow-ring">
              <div className="stripes h-12 w-12 flex-none rounded-[14px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold">{g.name}</span>
                  <span className="text-[11px] font-semibold text-acc">{g.fit}%</span>
                </div>
                <div className="mt-0.5 text-[12px] text-mute">
                  {g.categories[0]}
                  {g.description && ` · "${g.description}"`}
                </div>
                {g.why && (
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
                    <span className="h-[5px] w-[5px] flex-none rounded-full bg-blue" />
                    {g.why}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleJoin(g.name)}
                className={`flex h-[34px] flex-none items-center rounded-full px-3 text-[12px] font-semibold ${
                  member ? 'bg-sf2' : 'border-[1.5px] border-acc text-acc'
                }`}
              >
                {member ? 'Member' : 'Join'}
              </button>
            </div>
          )
        })}
        {ranked.length === 0 && <div className="py-6 text-center text-[13px] text-mute">No societies match “{query}”.</div>}
        {ranked.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 12)} className="py-2 text-[13px] font-semibold text-acc">
            Show more ({ranked.length - limit})
          </button>
        )}
      </div>

      {/* A leadership role on offer in one of your societies */}
      <div className="mt-[18px] flex flex-none items-center gap-3 rounded-[20px] bg-sf2 px-4 py-3.5">
        <div className="flex-1">
          <div className="text-[11px] font-semibold tracking-[.08em] text-mute uppercase">Student rep role</div>
          <div className="mt-1 text-[14px] font-semibold">Events Officer · Data Science Society</div>
          <div className="mt-0.5 text-[12px] text-mute">Counts as leadership experience on your route</div>
        </div>
        <button
          type="button"
          onClick={() => setApplied(true)}
          disabled={applied}
          className={`flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-semibold ${
            applied ? 'bg-acc text-acc-ink' : 'border-[1.5px] border-acc text-acc'
          }`}
        >
          {applied ? 'Applied ✓' : 'Apply'}
        </button>
      </div>
    </Screen>
  )
}
