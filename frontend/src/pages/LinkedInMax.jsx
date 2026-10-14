import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../components/cards.jsx'
import StateMessage from '../components/StateMessage.jsx'
import { AREA_NAMES, yearName } from '../labels.js'
import { useApi } from '../useApi.js'

// LinkedIn Max: one student at a time. You open (or copy) their LinkedIn link, connect on LinkedIn
// yourself, then press Next. There is no LinkedIn API here and we never send a request for you.

const OPENED_KEY = 'linkedin_opened' // ids of the people you've opened or copied, kept on this device only

function loadOpened() {
  try {
    return JSON.parse(localStorage.getItem(OPENED_KEY)) ?? []
  } catch {
    return []
  }
}

// Only ever make a clickable link out of a real LinkedIn profile address.
function isLinkedInProfile(url) {
  return /^https:\/\/((www|uk)\.)?linkedin\.com\/in\//i.test(url)
}

function LinkedInMax() {
  const { data: people, error, loading } = useApi('/linkedin-max?limit=100')
  const { data: me } = useApi('/me')

  const [index, setIndex] = useState(0)
  const [opened, setOpened] = useState(loadOpened)
  const [copied, setCopied] = useState(false)

  // Remember that you've dealt with this person (the counter on screen counts these).
  function markOpened(id) {
    if (opened.includes(id)) return
    const next = [...opened, id]
    setOpened(next)
    localStorage.setItem(OPENED_KEY, JSON.stringify(next))
  }

  function go(newIndex) {
    setIndex(newIndex)
    setCopied(false)
  }

  async function copyLink(person) {
    try {
      await navigator.clipboard.writeText(person.linkedin_url)
      setCopied(true)
      markOpened(person.user_id)
    } catch {
      // Some browsers block the clipboard (for example on plain http). Show the link so it can be copied by hand.
      setCopied(false)
      window.prompt('Copy this link:', person.linkedin_url)
      markOpened(person.user_id)
    }
  }

  const person = people?.[index]

  return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-normal">LinkedIn Max</h1>
      <p className="mt-2 text-lg text-muted dark:text-white/75">
        Open a profile, connect on LinkedIn yourself, then tap Next. We never send requests for you.
      </p>

      {me && !me.linkedin_max_optin && (
        <p className="mt-4 rounded-2xl bg-brand-pale p-4 text-ink">
          Others can't see you here yet.{' '}
          <Link to="/profile" className="font-semibold underline">
            Add your LinkedIn link and opt in on your profile.
          </Link>
        </p>
      )}

      {loading && <StateMessage>Loading…</StateMessage>}
      {error && <StateMessage kind="error">{error.message}</StateMessage>}
      {people?.length === 0 && <StateMessage>Nobody has shared a LinkedIn link yet. Check back soon.</StateMessage>}

      {/* Out of people */}
      {people?.length > 0 && !person && (
        <div className="mt-6 rounded-3xl bg-brand p-8 text-center text-white">
          <p className="font-display text-3xl">That's everyone for now</p>
          <p className="mt-2">You've been through all {people.length} people.</p>
          <button
            type="button"
            onClick={() => go(0)}
            className="mt-6 min-h-14 rounded-full bg-white px-8 text-lg font-semibold text-ink"
          >
            Start again
          </button>
        </div>
      )}

      {/* One person */}
      {person && (
        <div className="mt-6 rounded-3xl border border-brand-pale bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-muted dark:text-white/75">
            {index + 1} of {people.length}
          </p>
          <h2 className="mt-1 font-display text-3xl">{person.name}</h2>
          <p className="text-muted dark:text-white/75">
            {[person.course, yearName(person.year), AREA_NAMES[person.campus] ?? person.campus].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-4">{person.reason}</p>
          {person.shared_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.shared_tags.map((tag) => (
                <Pill key={tag}>{tag}</Pill>
              ))}
            </div>
          )}

          {isLinkedInProfile(person.linkedin_url) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markOpened(person.user_id)}
                className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-brand px-6 text-lg font-semibold text-white"
              >
                Open LinkedIn ↗
              </a>
              <button
                type="button"
                onClick={() => copyLink(person)}
                className="min-h-14 flex-1 rounded-full border-2 border-ink/15 px-6 text-lg font-semibold dark:border-white/25"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          )}

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="min-h-14 rounded-full border-2 border-ink/15 px-6 text-lg font-semibold disabled:opacity-40 dark:border-white/25"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="min-h-14 flex-1 rounded-full bg-ink px-6 text-lg font-semibold text-white dark:bg-white dark:text-ink"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {people?.length > 0 && (
        <p className="mt-4 text-center text-muted dark:text-white/75" aria-live="polite">
          Profiles you've opened or copied on this device: {opened.length}
        </p>
      )}
    </section>
  )
}

export default LinkedInMax
