// 12 · People › Career
// The swipe deck of alumni and students on your routes, then "Go to careers events together"
// (group posts for careers events), then everyone on your routes in a list.
// Matched on your route, programme and employers only, never on your social answers.
import { useState } from 'react'
import { CAREER_SUGGESTIONS as SAMPLE_PEOPLE, SAVED_BEFORE, SOCIAL_PEOPLE } from '../../data/people.js'
import { adaptPeople, requestConnection, useLive } from '../../live.js'
import { useProfile } from '../../profileStore.jsx'
import CommentsSheet from '../feed/CommentsSheet.jsx'
import GroupPostCard from '../feed/GroupPostCard.jsx'
import { FilterChips } from '../feed/parts.jsx'
import useFeed from '../feed/useFeed.js'
import CoffeeSheet from './CoffeeSheet.jsx'
import SavedPeopleSheet from './SavedPeopleSheet.jsx'
import SwipeDeck from './SwipeDeck.jsx'

// Filters for the careers posts. Tapping the selected one again shows everything.
const FILTERS = [
  ['week', 'This week'],
  ['routes', 'On your routes'],
  ['employer', 'Employer events'],
  ['workshops', 'Workshops'],
  ['g3', 'Group of 3'],
  ['g6', 'Group of 6'],
]

// 'YYYY-MM-DD' -> true when it is within the next 7 days.
function isThisWeek(iso) {
  const days = (new Date(`${iso}T12:00:00`) - new Date()) / 86400000
  return days < 7
}

function passes(filter, g) {
  if (!filter) return true
  if (filter === 'week') return isThisWeek(g.ev.date)
  if (filter === 'routes') return g.ev.routes
  if (filter === 'employer') return g.ev.employer
  if (filter === 'workshops') return g.ev.cat === 'Workshop'
  if (filter === 'g3') return g.size === 3
  if (filter === 'g6') return g.size === 6
  return true
}

export default function CareerTab({ savedOpen, onCloseSaved }) {
  const { profile, update } = useProfile()
  const feed = useFeed()
  // Real people on the student's route from the back end (the sample people if it cannot be reached).
  const { data: CAREER_SUGGESTIONS } = useLive('/people/career', adaptPeople, SAMPLE_PEOPLE)
  const [coffeeWith, setCoffeeWith] = useState(null) // the person whose coffee sheet is open
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState(null)
  const [commentsFor, setCommentsFor] = useState(null) // group id

  const passed = profile.passedPeople ?? []
  const saved = profile.savedPeople ?? []
  const invited = profile.requested ?? []
  // Everyone you haven't passed, saved or invited yet, best match first.
  const deck = CAREER_SUGGESTIONS.filter((p) => !passed.includes(p.id) && !saved.includes(p.id) && !invited.includes(p.id))

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const sendInvite = (details) => {
    requestConnection(coffeeWith, details?.note) // also saves a real request in the back end
    // Saved inside LARP only. The other person sees it when they open the app.
    update('requested', [...invited, coffeeWith.id])
    showToast(`Invite sent to ${coffeeWith.first} ☕`)
    setCoffeeWith(null)
  }

  // Saved people: the ones saved before (from the design) plus anyone you saved from the deck.
  const savedPeople = [
    ...SAVED_BEFORE.map((k) => {
      const p = SOCIAL_PEOPLE[k]
      const person = { id: k, first: p.name.split(' ')[0], name: p.name, color: p.color, role: p.bio, hook: 'a UCL student on LARP' }
      return { id: k, name: p.name, color: p.color, bio: p.bio, coffee: () => setCoffeeWith(person) }
    }),
    ...saved
      .map((id) => CAREER_SUGGESTIONS.find((x) => x.id === id))
      .filter(Boolean) // ignore ids saved from the sample list when the real list is showing
      .map((p) => ({ id: p.id, name: p.name, color: p.color, bio: p.role, coffee: () => setCoffeeWith(p) })),
  ]

  const posts = feed.groups.filter((g) => g.ev.careers && passes(filter, g))
  const openGroup = commentsFor ? feed.groups.find((g) => g.id === commentsFor) : null

  return (
    <>
      <SwipeDeck
        deck={deck}
        onPass={(p) => update('passedPeople', [...passed, p.id])}
        onSave={(p) => {
          update('savedPeople', [...saved, p.id])
          showToast(`${p.first} saved to your bookmark`)
        }}
        onCoffee={(p) => setCoffeeWith(p)}
      />

      {/* Go to careers events together */}
      <div className="mt-[26px] flex flex-none items-baseline justify-between px-1">
        <h2 className="font-display text-[22px] font-normal">
          Go to careers events <em>together</em>
        </h2>
        <div className="text-[13px] text-mute">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </div>
      </div>
      <FilterChips className="mt-3" options={FILTERS} value={filter} onChange={setFilter} />
      <div className="mt-3 flex flex-none flex-col gap-2.5">
        {posts.map((g) => (
          <GroupPostCard key={g.id} group={g} onJoin={feed.join} onComments={() => setCommentsFor(g.id)} />
        ))}
        {posts.length === 0 && <div className="py-[30px] text-center text-[14px] text-mute">No careers groups match this filter yet.</div>}
      </div>

      {/* People on your routes */}
      <div className="mt-[26px] flex flex-none items-baseline justify-between px-1">
        <h2 className="font-display text-[22px] font-normal">
          People on your <em>routes</em>
        </h2>
        <div className="text-[13px] text-mute">Product · Analytics · Consulting</div>
      </div>
      <div className="mt-3 flex flex-none flex-col gap-2">
        {CAREER_SUGGESTIONS.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-[18px] bg-sf px-3.5 py-2.5 shadow-ring">
            <div className="relative flex-none">
              <div className="h-10 w-10 rounded-full" style={{ background: p.color }} />
              {p.alumni && <div className="absolute -right-px -bottom-px box-border h-3 w-3 rounded-full border-2 border-sf bg-blue" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold">{p.name}</span>
                <span className="text-[11px] font-semibold text-acc">{p.match}%</span>
              </div>
              <div className="text-[12px] leading-[1.35] text-mute">{p.role}</div>
            </div>
            {invited.includes(p.id) ? (
              <span className="flex h-[34px] flex-none items-center rounded-full bg-sf2 px-3 text-[13px] font-semibold">Invited ✓</span>
            ) : (
              <button
                type="button"
                onClick={() => setCoffeeWith(p)}
                className="h-[34px] flex-none rounded-full border-[1.5px] border-acc px-3 text-[13px] font-semibold text-acc"
              >
                Coffee chat?
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-1.5 px-1 text-[11px] text-mute">
        <span className="h-2 w-2 flex-none rounded-full bg-blue" />
        Alumni · matched on route, programme and employers, not on your social answers.
      </div>

      {/* Little message at the top after sending or saving */}
      {toast && (
        <div
          role="status"
          className="fixed top-[max(72px,env(safe-area-inset-top))] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-cta px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-cta-ink shadow-[0_10px_30px_rgba(20,8,40,.35)]"
          style={{ animation: 'larpIn .3s both' }}
        >
          {toast}
        </div>
      )}

      {coffeeWith && <CoffeeSheet person={coffeeWith} onClose={() => setCoffeeWith(null)} onSend={sendInvite} />}
      {savedOpen && <SavedPeopleSheet people={savedPeople} onClose={onCloseSaved} />}
      {openGroup && <CommentsSheet group={openGroup} feed={feed} onClose={() => setCommentsFor(null)} />}
    </>
  )
}

