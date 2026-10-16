// The search view that opens when you tap the magnifying glass on Home (design v3, screen 10).
//
// Before you type: "Recent searches" (tap to search again, × to remove) and "Suggested for you".
// As you type: results in up to five sections, with the matching letters in purple:
//   Events            real upcoming UCL Careers + Students' Union events (src/sampleData.js)
//   People            career suggestions, social matches and connections (src/data/people.js)
//   Societies         the real list of 472 student groups
//   Careers services  the real UCL Careers appointment types
//   Messages          messages in your chats (src/data/messages.js)
// Each section shows 3 results, and "See all N ›" shows the rest.
//
// The design also draws an on-screen keyboard. We leave it out: a real phone shows its own.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import conversations from '../../data/messages.js'
import { CAREER_SUGGESTIONS, CONNECTIONS, SOCIAL_PEOPLE } from '../../data/people.js'
import { useProfile } from '../../profileStore.jsx'
import { careerEvents, careerServices, dateTile, shortDate, societies, suEvents, todayISO, upcoming } from '../../sampleData.js'
import BottomSheet from '../BottomSheet.jsx'
import Icon from '../Icon.jsx'

// The chips under "Suggested for you": [what the chip says, what it searches for].
const SUGGESTIONS = [
  ['Product events this week', 'product'],
  ['Consulting case prep', 'case'],
  ['Padel', 'padel'],
  ['Data Science Soc', 'data science'],
]
const SHOWN = 3 // results per section before "See all"

// Splits "Meet the Deloitte Team" around the search word, so the match can be drawn in purple.
function Highlight({ text, q, color = 'var(--acc)' }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <b style={{ color }}>{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  )
}

// Finds everything that matches the search, grouped into sections. q is already lower case.
function searchEverything(q) {
  const has = (...texts) => texts.some((t) => t && t.toLowerCase().includes(q))

  // Events: real upcoming events, soonest first.
  const events = upcoming([...careerEvents, ...suEvents], todayISO())
    .filter((e) => has(e.title, e.category, e.series, e.organiser, e.organisation))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((e) => ({ type: 'event', key: e.id, title: e.title, sub: `${e.start}${e.end ? `–${e.end}` : ''} · ${e.location}`, event: e }))

  // People: career suggestions first (with their match %), then social matches, then connections.
  const seen = new Set()
  const people = []
  const addPerson = (p) => {
    if (seen.has(p.title)) return
    seen.add(p.title)
    people.push(p)
  }
  CAREER_SUGGESTIONS.filter((p) => has(p.name, p.role)).forEach((p) =>
    addPerson({ type: 'person', key: p.id, title: p.name, sub: p.role, match: `${p.match}%`, color: p.color, to: '/people' }),
  )
  Object.entries(SOCIAL_PEOPLE)
    .filter(([, p]) => has(p.name, p.bio))
    .forEach(([key, p]) => addPerson({ type: 'person', key, title: p.name, sub: p.bio, match: '', color: p.color, to: '/people?tab=social' }))
  CONNECTIONS.filter((p) => has(p.name, p.line)).forEach((p) =>
    addPerson({ type: 'person', key: p.id, title: p.name, sub: p.line, match: '', color: 'var(--sf2)', to: '/connections' }),
  )

  // Societies: by name or category.
  const socs = societies
    .filter((s) => has(s.name, ...s.categories))
    .map((s) => ({ type: 'society', key: s.name, title: s.name, sub: s.categories.slice(0, 2).join(' · ') || s.description }))

  // Careers services: the real appointment types.
  const services = careerServices
    .filter((s) => has(s.name, s.button, s.description))
    .map((s) => ({ type: 'service', key: s.id, title: s.name.replace(/ Appointment/, ''), sub: s.button, service: s }))

  // Messages: any message in any chat (at most 6).
  const messages = []
  conversations.forEach((c) =>
    [...(c.msgs ?? []), ...(c.ann ?? []), ...(c.general ?? [])].forEach((m) => {
      if (m.text && has(m.text) && messages.length < 6) {
        messages.push({ type: 'message', key: `${c.id}-${messages.length}`, title: c.name, text: m.text, chat: c.id })
      }
    }),
  )

  return [
    ['Events', events],
    ['People', people],
    ['Societies', socs],
    ['Careers services', services],
    ['Messages', messages],
  ].filter(([, items]) => items.length)
}

// The square or round picture on the left of a result.
function ResultPicture({ item }) {
  if (item.type === 'event') {
    const tile = dateTile(item.event.date)
    return (
      <div className="flex h-[42px] w-[42px] flex-none flex-col items-center justify-center rounded-xl bg-sf2 leading-none">
        <span className="text-[9px] text-mute">{tile.day}</span>
        <span className="mt-0.5 text-[15px] font-semibold">{tile.num}</span>
      </div>
    )
  }
  if (item.type === 'person') return <div className="h-[42px] w-[42px] flex-none rounded-full" style={{ background: item.color }} />
  const box = 'flex h-[42px] w-[42px] flex-none items-center justify-center'
  if (item.type === 'society')
    return (
      <div className={`${box} rounded-xl bg-sf2 text-acc`}>
        <Icon name="flag" size={18} />
      </div>
    )
  if (item.type === 'service')
    return (
      <div className={`${box} rounded-xl bg-acc text-acc-ink`}>
        <Icon name="briefcase" size={18} />
      </div>
    )
  return (
    <div className={`${box} rounded-full bg-sf2 text-ink`}>
      <Icon name="chat" size={18} />
    </div>
  )
}

// The panel that opens when you tap an event or a careers service in the results.
function DetailSheet({ item, onClose }) {
  const { profile, update } = useProfile()
  if (!item) return null

  if (item.type === 'event') {
    const e = item.event
    const going = profile.going.includes(e.id)
    return (
      <BottomSheet
        open
        title={e.title}
        subtitle={`${shortDate(e.date)} · ${e.start}${e.end ? `–${e.end}` : ''}`}
        onClose={onClose}
        footer={
          <button
            type="button"
            onClick={() => update('going', going ? profile.going.filter((x) => x !== e.id) : [...profile.going, e.id])}
            className={`h-12 w-full rounded-full text-[15px] font-semibold ${going ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
          >
            {going ? 'Going ✓' : 'I’m going'}
          </button>
        }
      >
        <div className="flex flex-col gap-2 text-[14px] leading-[1.45]">
          <div>📍 {e.location}</div>
          <div className="text-mute">{e.organiser || e.organisation || e.series || 'UCL Careers'}</div>
          {e.description && <div className="text-mute">{e.description}</div>}
          {e.booking && e.booking !== 'Open / not stated' && <div className="text-mute">🎟 {e.booking}</div>}
        </div>
      </BottomSheet>
    )
  }

  // A careers service: "Request" saves it the same way the Recommended actions cards do.
  const s = item.service
  const requested = (profile.actionsRequested ?? []).includes(s.id)
  const list = profile.actionsRequested ?? []
  return (
    <BottomSheet
      open
      title={item.title}
      subtitle={s.offeredBy}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => update('actionsRequested', requested ? list.filter((x) => x !== s.id) : [...list, s.id])}
          className={`h-12 w-full rounded-full text-[15px] font-semibold ${requested ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
        >
          {requested ? 'Requested ✓' : s.button || 'Request'}
        </button>
      }
    >
      <div className="flex flex-col gap-2 text-[14px] leading-[1.45] text-mute">
        {s.need && <div>{s.need}.</div>}
        {s.mode && <div>{s.mode}</div>}
        {s.prep && <div>Before you book: {s.prep}</div>}
      </div>
    </BottomSheet>
  )
}

// query / setQuery: the text in the search bar (Home owns it, because the bar is in Home's header).
// recent / setRecent: the recent searches list (saved in the profile by Home).
export default function SearchView({ query, setQuery, recent, setRecent, onDone }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState([]) // sections opened with "See all"
  const [detail, setDetail] = useState(null) // the event or service shown in the panel
  const q = query.trim().toLowerCase()
  const sections = q ? searchEverything(q) : []

  // Remember the search, newest first, at most 4.
  const remember = () => {
    const text = query.trim()
    if (text) setRecent([text, ...recent.filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 4))
  }

  const open = (item) => {
    remember()
    if (item.type === 'event' || item.type === 'service') {
      setDetail(item)
      return
    }
    onDone() // close search, then go
    if (item.type === 'person') navigate(item.to)
    else if (item.type === 'society') navigate('/societies')
    else if (item.type === 'message') navigate(`/messages?chat=${item.chat}`)
  }

  return (
    <div className="flex flex-col pt-1.5" style={{ animation: 'larpIn .3s both' }}>
      {/* Nothing typed yet: recent searches and suggestions */}
      {!q && (
        <>
          {recent.length > 0 && (
            <>
              <div className="py-2 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Recent searches</div>
              {recent.map((r) => (
                <div key={r} className="flex h-[46px] items-center gap-3 border-b border-line" style={{ animation: 'larpIn .3s both' }}>
                  <button type="button" onClick={() => setQuery(r)} className="flex h-full flex-1 items-center gap-3 text-left text-[14px]">
                    {/* a small clock */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-mute" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {r}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecent(recent.filter((x) => x !== r))}
                    aria-label={`Remove ${r}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-mute"
                  >
                    <Icon name="close" size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </>
          )}
          <div className="pt-[18px] pb-2.5 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Suggested for you</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(([label, search]) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuery(search)}
                className="flex h-9 items-center rounded-full bg-sf px-3.5 text-[13px] font-medium shadow-ring"
                style={{ animation: 'larpIn .3s both' }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {sections.map(([title, items], si) => {
        const all = expanded.includes(title)
        return (
          <div key={title} className="pt-3.5">
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] font-semibold tracking-[.06em] text-mute uppercase">{title}</div>
              {items.length > SHOWN && (
                <button
                  type="button"
                  onClick={() => setExpanded(all ? expanded.filter((x) => x !== title) : [...expanded, title])}
                  className="text-[12px] font-semibold text-acc"
                >
                  {all ? 'Show less' : `See all ${items.length} ›`}
                </button>
              )}
            </div>
            {(all ? items : items.slice(0, SHOWN)).map((item, k) => (
              <button
                key={item.key}
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-center gap-3 border-b border-line px-1 py-2.5 text-left"
                style={{ animation: 'larpIn .35s both', animationDelay: `${si * 60 + Math.min(k, 6) * 40}ms` }}
              >
                <ResultPicture item={item} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] leading-[1.3]">
                    <Highlight text={item.title} q={item.type === 'message' ? '' : q} />
                  </div>
                  {item.type === 'message' ? (
                    <div className="truncate text-[12px] text-mute">
                      <Highlight text={item.text} q={q} color="var(--ink)" />
                    </div>
                  ) : (
                    <div className="truncate text-[12px] text-mute">{item.sub}</div>
                  )}
                </div>
                {item.match && <span className="flex-none text-[12px] font-semibold text-acc">{item.match}</span>}
              </button>
            ))}
          </div>
        )
      })}

      {/* Nothing found */}
      {q && sections.length === 0 && (
        <div className="flex flex-col items-center gap-3.5 px-2.5 py-10 text-center" style={{ animation: 'larpIn .3s both' }}>
          <div className="relative h-[72px] w-16">
            <div className="absolute top-0 left-1 h-[52px] w-14 bg-lilac" style={{ clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)' }}>
              <div className="absolute top-5 left-[19px] h-1.5 w-1.5 rounded-full bg-plum" />
              <div className="absolute top-[19px] left-[35px] h-1.5 w-1.5 rounded-full bg-plum" />
              <div className="absolute top-9 left-[26px] h-[2.5px] w-2 rounded-sm bg-plum" />
            </div>
            <div className="absolute bottom-[5px] left-[22px] h-4 w-[2.5px] rounded-sm bg-plum" />
            <div className="absolute bottom-[5px] left-[39px] h-4 w-[2.5px] rounded-sm bg-plum" />
          </div>
          <div className="max-w-[240px] text-[14px] leading-normal text-mute">
            Nothing for ‘{query.trim()}’. Try a society or an event type
          </div>
        </div>
      )}

      <DetailSheet item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
