import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Pill } from '../components/cards.jsx'
import StateMessage from '../components/StateMessage.jsx'
import { AREA_NAMES, yearName } from '../labels.js'
import { useApi } from '../useApi.js'

// "My group": who is in it, what you share, and the suggested first event.
function Group() {
  const { data: group, error, loading } = useApi('/group')
  const [waiting, setWaiting] = useState('') // message if we tried to pair and there was nobody suitable yet
  const [busy, setBusy] = useState(false)
  const [pairError, setPairError] = useState('')
  const [joined, setJoined] = useState(null) // a group we got by pressing the button below

  const shown = group ?? joined

  // For someone with no group yet: ask the back end to pair them.
  async function pairMe() {
    setBusy(true)
    setPairError('')
    try {
      const result = await api.post('/pair/auto', {})
      if (result.status === 'grouped') setJoined(result.group)
      else setWaiting(result.message)
    } catch (err) {
      setPairError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <StateMessage>Loading your group…</StateMessage>
  if (error && error.status !== 404) return <StateMessage kind="error">{error.message}</StateMessage>

  // No group yet (the back end answers 404).
  if (!shown) {
    return (
      <section className="pt-4">
        <h1 className="font-display text-4xl font-normal">You're not in a group yet</h1>
        <p className="mt-2 text-lg text-muted dark:text-white/75">
          {waiting || 'We can put you with a small group of people who like what you like.'}
        </p>
        {!waiting && (
          <button
            type="button"
            onClick={pairMe}
            disabled={busy}
            className="mt-6 min-h-14 rounded-full bg-brand px-8 text-lg font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Finding your group…' : 'Pair me with a group'}
          </button>
        )}
        {pairError && <StateMessage kind="error">{pairError}</StateMessage>}
        <p className="mt-6">
          <Link to="/browse" className="font-semibold text-brand underline dark:text-brand-mid">
            Or browse people instead
          </Link>
        </p>
      </section>
    )
  }

  const event = shown.first_event
  return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-normal">Your group</h1>

      {shown.shared_interests.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-medium">What you have in common</p>
          <div className="flex flex-wrap gap-2">
            {shown.shared_interests.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {shown.members.map((m) => (
          <li key={m.user_id} className="rounded-2xl border border-brand-pale bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-lg font-semibold">{m.name}</p>
            <p className="text-muted dark:text-white/75">
              {[m.course, yearName(m.year), AREA_NAMES[m.campus] ?? m.campus].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-3xl">Suggested first event</h2>
      {event ? (
        <div className="mt-3 rounded-3xl bg-brand p-6 text-white">
          <p className="font-display text-2xl">{event.title}</p>
          <p className="mt-1 text-white/85">
            {[
              event.start_time &&
                new Date(event.start_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              event.location_name,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-3">{event.reason}</p>
        </div>
      ) : (
        <StateMessage>No event suits everyone in the group yet. Check the Events tab.</StateMessage>
      )}
    </section>
  )
}

export default Group
