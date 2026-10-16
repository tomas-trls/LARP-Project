// Screen 13b · Connections: everyone you're connected to, plus requests waiting for an answer.
// Filters: All, Career, Social, Following, Pending. The search button opens a name search.
// LinkedIn icons only open a LinkedIn search in a new tab. LARP never sends LinkedIn requests.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { FollowButton, KindTag, RoundButton } from '../components/people/parts.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { ChipRow } from '../components/ui.jsx'
import { CONNECTIONS as SAMPLE_CONNECTIONS, CONNECTION_TOTAL, PENDING as SAMPLE_PENDING } from '../data/people.js'
import { adaptConnections, answerConnection, useLive } from '../live.js'
import { useProfile } from '../profileStore.jsx'

const FILTERS = ['All', 'Career', 'Social', 'Following', 'Pending']

export default function Connections() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const [filter, setFilter] = useState('All')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  // People you accepted from Pending move up into your connections (saved in the profile).
  // The real connections and requests from the back end (the sample ones if it cannot be reached).
  const { data: real, live } = useLive('/connections', adaptConnections, null)
  const CONNECTIONS = live ? real.connections : SAMPLE_CONNECTIONS
  const PENDING = live ? real.pending : SAMPLE_PENDING
  const accepted = profile.accepted ?? []
  const people = [...PENDING.filter((p) => accepted.includes(p.id)).map((p) => ({ ...p, note: 'New connection' })), ...CONNECTIONS]
  const pending = PENDING.filter((p) => !accepted.includes(p.id))
  const total = (live ? CONNECTIONS.length : CONNECTION_TOTAL) + accepted.length

  // Apply the filter chip and the search box.
  const q = query.trim().toLowerCase()
  const matchesSearch = (p) => !q || p.name.toLowerCase().includes(q) || p.line.toLowerCase().includes(q)
  const shown = people.filter(matchesSearch).filter((p) => {
    if (filter === 'Career') return p.kind === 'career'
    if (filter === 'Social') return p.kind === 'social'
    if (filter === 'Following') return profile.following.includes(p.id)
    if (filter === 'Pending') return false
    return true
  })
  const shownPending = filter === 'All' || filter === 'Pending' ? pending.filter(matchesSearch) : []

  return (
    <Screen tabs>
      <div className="flex flex-none items-center justify-between pt-1">
        <BackButton onBack={() => navigate('/people')} />
        <h1 className="font-display text-[22px] font-normal">
          Connections <span className="text-[16px] text-mute">· {total}</span>
        </h1>
        <RoundButton label="Search connections" onClick={() => setSearching(!searching)}>
          <Icon name={searching ? 'close' : 'search'} size={20} />
        </RoundButton>
      </div>

      {searching && (
        <div className="mt-3.5 flex h-12 flex-none items-center gap-2.5 rounded-2xl bg-sf px-4 shadow-ring">
          <Icon name="search" size={18} className="text-mute" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, course or company"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
          />
        </div>
      )}

      <ChipRow className="mt-3.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-none rounded-full px-3 py-[7px] text-[12px] whitespace-nowrap ${
              filter === f ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf shadow-ring'
            }`}
          >
            {f === 'Pending' && pending.length ? `Pending · ${pending.length}` : f}
          </button>
        ))}
      </ChipRow>

      <div className="mt-4 flex flex-col gap-2">
        {shown.map((p) => (
          <ConnectionCard key={p.id} person={p} />
        ))}

        {filter !== 'Pending' && (
          <div className="pt-1.5 pb-0.5 text-center text-[12px] text-mute">
            {shown.length ? `Showing ${shown.length} of ${total}` : 'Nobody matches yet'} ·{' '}
            <span className="font-semibold text-acc">See all</span>
          </div>
        )}

        {shownPending.length > 0 && (
          <>
            <div className="px-1 pt-1 text-[11px] font-semibold tracking-[.08em] text-mute uppercase">Pending · {shownPending.length}</div>
            {shownPending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-[20px] bg-sf2 px-3.5 py-3">
                <div className="h-10 w-10 flex-none rounded-full bg-sf" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">
                    {p.name} <span className="ml-1"><KindTag kind={p.kind} onSurface /></span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-mute">{p.line}</div>
                </div>
                {p.sentByMe ? (
                  <span className="flex h-[34px] flex-none items-center rounded-full border-[1.5px] border-line px-3.5 text-[13px] font-semibold text-mute">
                    Sent
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      update('accepted', [...accepted, p.id])
                      if (live && p.connectionId) answerConnection(p.connectionId, 'accept')
                    }}
                    className="flex h-[34px] flex-none items-center rounded-full bg-acc px-3.5 text-[13px] font-semibold text-acc-ink"
                  >
                    Accept
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Screen>
  )
}

// One connection: photo, name and tag, what they do, then icons, last activity, Follow and chat.
function ConnectionCard({ person }) {
  const linkedInSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(person.name)}`
  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-sf p-3.5 shadow-ring">
      <div className="flex items-center gap-3">
        <div className="stripes h-[50px] w-[50px] flex-none rounded-full" style={person.photo ? { background: `url(${person.photo}) center/cover` } : undefined} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">{person.name}</span>
            <KindTag kind={person.kind} />
          </div>
          <div className="mt-0.5 text-[12px] text-mute">{person.line}</div>
        </div>
        <Icon name="chevron-right" size={18} className="text-mute" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {person.linkedin && (
            <a
              href={linkedInSearch}
              target="_blank"
              rel="noreferrer"
              aria-label={`Find ${person.name} on LinkedIn`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf2 text-acc"
            >
              <Icon name="linkedin" size={14} />
            </a>
          )}
          {person.link && (
            <span title="Met through LARP" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf2 text-acc">
              <Icon name="link" size={14} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 truncate text-[12px] text-mute">{person.note}</div>
        <FollowButton id={person.id} />
        <Link
          to="/messages"
          aria-label={`Message ${person.name}`}
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-cta text-cta-ink"
        >
          <Icon name="chat" size={16} />
        </Link>
      </div>
    </div>
  )
}
