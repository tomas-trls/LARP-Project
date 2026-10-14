import { useState } from 'react'
import { EventCard, VenueCard } from '../components/cards.jsx'
import { Chip } from '../components/questionnaire/parts.jsx'
import StateMessage from '../components/StateMessage.jsx'
import { useApi } from '../useApi.js'

const TABS = [
  { value: 'career', label: 'Career' },
  { value: 'social', label: 'Social' },
  { value: 'venues', label: 'Venues' },
]
const AREAS = [
  { value: '', label: 'All areas' },
  { value: 'main', label: 'Main campus' },
  { value: 'canary', label: 'Canary Wharf' },
  { value: 'other', label: 'Elsewhere' },
]

// Events feed: career, social and venues tabs, with a campus-area filter.
function Events() {
  const [tab, setTab] = useState('career')
  const [area, setArea] = useState('')

  // Build the address, e.g. /events?type=career&area=main  or  /venues
  const query = area ? `area=${area}` : ''
  const path = tab === 'venues' ? `/venues${query && '?' + query}` : `/events?type=${tab}${query && '&' + query}`
  const { data: items, error, loading } = useApi(path)

  return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-normal">What's on</h1>

      <div role="tablist" aria-label="Type" className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip key={t.value} label={t.label} selected={tab === t.value} onClick={() => setTab(t.value)} />
        ))}
      </div>
      <div aria-label="Area" className="mt-3 flex flex-wrap gap-2">
        {AREAS.map((a) => (
          <Chip key={a.value} label={a.label} selected={area === a.value} onClick={() => setArea(a.value)} />
        ))}
      </div>

      {loading && <StateMessage>Loading…</StateMessage>}
      {error && <StateMessage kind="error">{error.message}</StateMessage>}
      {items?.length === 0 && <StateMessage>Nothing here for that filter yet.</StateMessage>}
      <ul className="mt-6 space-y-3">
        {items?.map((item) =>
          tab === 'venues' ? <VenueCard key={item.venue_id} venue={item} /> : <EventCard key={item.event_id} event={item} />,
        )}
      </ul>
    </section>
  )
}

export default Events
