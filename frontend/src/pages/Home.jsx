// 10 · Home
// The first screen after onboarding: one recommended action, the featured event this week,
// and every upcoming event that has a reason to be shown, with Careers / Social / Societies filters.
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EventRow from '../components/home/EventRow.jsx'
import { addDays, buildFeed } from '../components/home/eventFeed.js'
import { recommendedAction } from '../components/home/recommendedAction.js'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import Screen from '../components/Screen.jsx'
import { WhyLine } from '../components/ui.jsx'
import { useProfile } from '../profileStore.jsx'
import { greeting, longDate, shortDate, todayISO } from '../sampleData.js'

const FILTERS = ['All', 'Careers', 'Social', 'Societies']
const PAGE_SIZE = 20 // how many events to show before "Show more"

export default function Home() {
  const { profile, update } = useProfile()
  const [filter, setFilter] = useState('All')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [requested, setRequested] = useState(false)
  const upcomingRef = useRef(null)

  const today = todayISO()
  // useMemo: only rebuild the feed when the profile changes (it reads ~1,000 events).
  const feed = useMemo(() => buildFeed(profile, today), [profile, today])
  const action = recommendedAction(profile, today)

  // This week = today and the next 6 days.
  const weekEnd = addDays(today, 6)
  const thisWeek = feed.filter((e) => e.date <= weekEnd)
  // Featured: the best-scoring careers event this week (the earliest one if several tie).
  const featured = [...thisWeek].filter((e) => e.kind === 'Careers').sort((a, b) => b.score - a.score)[0]

  const list = feed.filter((e) => (filter === 'All' || e.kind === filter) && e.id !== featured?.id)
  const visible = list.slice(0, shown)

  const toggleGoing = (id) =>
    update('going', profile.going.includes(id) ? profile.going.filter((x) => x !== id) : [...profile.going, id])

  const scrollToUpcoming = () => upcomingRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <Screen tabs>
      {/* Header: your avatar (opens Profile), today's date, greeting, notifications, events this week */}
      <div className="flex flex-none items-center gap-3 px-1 pt-1">
        <Link to="/profile" aria-label="Your profile" className="stripes-light h-10 w-10 flex-none rounded-full" />
        <div className="flex-1 leading-[1.2]">
          <div className="text-[12px] text-mute">{longDate()}</div>
          <div className="font-display text-[20px]">
            {greeting()}, {profile.firstName}
          </div>
        </div>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-sf text-ink" aria-label="Notifications">
          <Icon name="bell" size={20} />
          <span className="absolute top-[9px] right-[10px] h-2 w-2 rounded-full border-2 border-sf bg-blue" />
        </div>
        <button type="button" onClick={scrollToUpcoming} className="flex h-10 items-center gap-1.5 rounded-full bg-sf px-3 text-[13px] font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-acc" />
          {thisWeek.length} events
        </button>
      </div>

      {/* Recommended action (from the UCL Careers appointment types) */}
      <div className="relative mt-[18px] flex-none overflow-hidden rounded-3xl bg-hero p-5 text-hero-ink">
        <div className="text-[11px] font-semibold tracking-[.08em] uppercase opacity-85">Recommended actions</div>
        <div className="mt-2 max-w-[250px] font-display text-[27px] leading-[1.12]">
          {action.before}
          <em>{action.italic}</em>
          {action.after}
        </div>
        <div className="mt-2 max-w-[260px] text-[13px] leading-normal opacity-90">
          {requested ? `Requested. UCL Careers will confirm a slot by email. Before it: ${action.prep?.toLowerCase() || 'bring your questions'}.` : action.detail}
        </div>
        <button
          type="button"
          onClick={() => setRequested(!requested)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold text-plum"
        >
          {requested ? 'Requested ✓' : action.button}
        </button>
        <div className="absolute top-3 right-3.5">
          <Mascot size={64} />
        </div>
      </div>

      {/* Featured this week */}
      {featured && (
        <>
          <div className="mt-4 flex flex-none items-baseline justify-between px-1">
            <h2 className="font-display text-[20px] font-normal">Featured this week</h2>
            <button type="button" onClick={scrollToUpcoming} className="text-[13px] text-mute hover:text-ink">
              Calendar view ›
            </button>
          </div>
          <div className="mt-2.5 flex-none rounded-3xl bg-sf px-4 pt-3.5 pb-4 shadow-ring">
            <div className="flex gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-sf2 px-[9px] py-1 text-acc">{featured.tag}</span>
              <span className="rounded-full bg-sf2 px-[9px] py-1 text-mute">UCL Careers</span>
            </div>
            <div className="mt-2.5 text-[16px] font-semibold">{featured.title}</div>
            <div className="mt-[3px] text-[13px] text-mute">
              {shortDate(featured.date)} · {featured.start}
              {featured.end ? `–${featured.end}` : ''} · {featured.place}
            </div>
            <WhyLine className="mt-2.5">Why: {featured.why.charAt(0).toLowerCase() + featured.why.slice(1)}</WhyLine>
            <button
              type="button"
              onClick={() => toggleGoing(featured.id)}
              className={`mt-3 h-9 rounded-full px-4 text-[13px] font-semibold ${profile.going.includes(featured.id) ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
            >
              {profile.going.includes(featured.id) ? 'Going ✓' : 'Book a place'}
            </button>
          </div>
        </>
      )}

      {/* Upcoming, with filters */}
      <div ref={upcomingRef} className="mt-4 flex flex-none scroll-mt-4 items-baseline justify-between gap-2 px-1">
        <h2 className="font-display text-[20px] font-normal">Upcoming</h2>
        <div className="flex gap-1.5 text-[12px]">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                setShown(PAGE_SIZE)
              }}
              className={`rounded-full px-2.5 py-[5px] ${filter === f ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex flex-none flex-col gap-2">
        {visible.map((event, i) => {
          // A small month heading whenever the month changes (e.g. "November").
          const month = event.date.slice(0, 7)
          const newMonth = i > 0 && month !== visible[i - 1].date.slice(0, 7)
          return (
            <div key={event.id} className="flex flex-col gap-2">
              {newMonth && (
                <div className="px-1 pt-2 font-display text-[18px] text-mute">
                  {new Date(`${event.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'long' })}
                </div>
              )}
              <EventRow event={event} going={profile.going.includes(event.id)} onToggle={() => toggleGoing(event.id)} />
            </div>
          )
        })}
        {list.length === 0 && <div className="py-6 text-center text-[14px] text-mute">Nothing coming up here yet.</div>}
        {list.length > shown && (
          <button type="button" onClick={() => setShown(shown + PAGE_SIZE)} className="mt-1 h-11 rounded-full bg-sf text-[14px] font-semibold shadow-ring">
            Show more ({list.length - shown})
          </button>
        )}
      </div>
    </Screen>
  )
}
