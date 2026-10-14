// The cards shown in lists: a person (MatchCard), an event (EventCard) and a venue (VenueCard).
// Every card carries a one-line "reason", because the product always shows why.

import { AREA_NAMES, yearName } from '../labels.js'

// "Thu 16 Oct, 18:30" (or "" when the event has no time yet).
function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// The white rounded box every card sits in.
function Card({ children }) {
  return (
    <li className="rounded-3xl border border-brand-pale bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      {children}
    </li>
  )
}

// A small pill for a shared interest, an area, and so on.
export function Pill({ children }) {
  return (
    <span className="inline-block rounded-full bg-brand-pale px-3 py-1 text-sm font-medium text-ink dark:bg-white/10 dark:text-heritage">
      {children}
    </span>
  )
}

export function MatchCard({ match }) {
  const about = [match.course, yearName(match.year), AREA_NAMES[match.campus] ?? match.campus].filter(Boolean).join(' · ')
  return (
    <Card>
      <h2 className="font-display text-2xl">{match.name}</h2>
      <p className="text-muted dark:text-white/75">{about}</p>
      <p className="mt-3">{match.reason}</p>
      {match.shared_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {match.shared_tags.map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      )}
    </Card>
  )
}

export function EventCard({ event }) {
  const when = formatTime(event.start_time)
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Pill>{event.event_type === 'career' ? 'Career' : 'Social'}</Pill>
        <Pill>{AREA_NAMES[event.area] ?? event.area}</Pill>
      </div>
      <h2 className="mt-3 font-display text-2xl">{event.title}</h2>
      <p className="text-muted dark:text-white/75">{[when, event.location_name].filter(Boolean).join(' · ')}</p>
      <p className="mt-3">{event.reason}</p>
      {event.source_url && (
        <a
          href={event.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-12 items-center font-semibold text-brand underline dark:text-brand-mid"
        >
          View event ↗
        </a>
      )}
    </Card>
  )
}

export function VenueCard({ venue }) {
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        {venue.category && <Pill>{venue.category}</Pill>}
        <Pill>{AREA_NAMES[venue.area] ?? venue.area}</Pill>
      </div>
      <h2 className="mt-3 font-display text-2xl">{venue.name}</h2>
      {venue.address && <p className="text-muted dark:text-white/75">{venue.address}</p>}
      <p className="mt-3">{venue.reason}</p>
      {venue.url && (
        <a
          href={venue.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-12 items-center font-semibold text-brand underline dark:text-brand-mid"
        >
          Visit website ↗
        </a>
      )}
    </Card>
  )
}
