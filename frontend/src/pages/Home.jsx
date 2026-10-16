// 10 · Home
// Top to bottom: greeting (with search and notifications), filter chips (For you / Most popular / Groups / + Create),
// "How was ...?" memory prompt, Recommended actions (swipe sideways), Featured this week,
// Groups forming near you, and every Upcoming event that has a reason to be shown.
//
// Events come from the real UCL sample data (components/home/eventFeed.js) and the group posts
// are shared with People › Social (components/feed/useFeed.js), so joining a group here
// shows on People too.
//
// The magnifying glass opens search (components/home/SearchView.jsx) in place of the feed,
// and the bell opens the notifications panel (components/home/NotificationsSheet.jsx).
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CommentsSheet from '../components/feed/CommentsSheet.jsx'
import { Face, JoinButton } from '../components/feed/parts.jsx'
import PostGroupSheet from '../components/feed/PostGroupSheet.jsx'
import useFeed, { myPhoto } from '../components/feed/useFeed.js'
import ActionCarousel from '../components/home/ActionCarousel.jsx'
import EventRow from '../components/home/EventRow.jsx'
import { addDays, buildFeed } from '../components/home/eventFeed.js'
import FeaturedCard from '../components/home/FeaturedCard.jsx'
import NotificationsSheet, { NOTIFICATION_KEYFRAMES, unreadCount } from '../components/home/NotificationsSheet.jsx'
import { recommendedActions } from '../components/home/recommendedAction.js'
import SearchView from '../components/home/SearchView.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { HOME_FEATURED } from '../data/feed.js'
import { NOTIFICATIONS } from '../data/notifications.js'
import { useProfile } from '../profileStore.jsx'
import { careerEvents, greeting, longDate, suEvents, todayISO } from '../sampleData.js'

const CHIPS = [
  ['foryou', 'For you'],
  ['popular', 'Most popular'],
  ['groups', 'Groups'],
]
const SIZES = [
  [3, 'Group of 3'],
  [6, 'Group of 6'],
  [8, 'Group of 8+'],
]
const PAGE_SIZE = 20 // how many upcoming events to show before "Show more"
const RECENT_DEFAULT = ['Deloitte', 'Bouldering', 'Career Lab', 'Padel'] // the design's example recent searches
const NO_NOTIFICATIONS_READ = { read: [], dismissed: [], done: [] }
const SLIDE = '.35s cubic-bezier(.2,.8,.3,1)' // the header animation when search opens

// A section heading with a small note on the right.
function Heading({ children, right }) {
  return (
    <div className="mt-[22px] flex flex-none items-baseline justify-between px-1">
      <h2 className="font-display text-[22px] font-normal">{children}</h2>
      {right}
    </div>
  )
}

export default function Home() {
  const { profile, update } = useProfile()
  const navigate = useNavigate()
  const feed = useFeed()
  const [filter, setFilter] = useState('foryou') // 'foryou' | 'popular' | 'groups' | 'create'
  const [shown, setShown] = useState(PAGE_SIZE)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [createSize, setCreateSize] = useState(3)
  const [posting, setPosting] = useState(false)
  const [commentsFor, setCommentsFor] = useState(null)

  // Notifications: which ones you've read, dismissed or pressed. Kept here while the screen is
  // open (so "Mark all as read" can clear them one by one) and saved to the profile on every change.
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [swing, setSwing] = useState(false) // the bell swings for a moment when tapped
  const [notifs, setNotifs] = useState(() => ({ ...NO_NOTIFICATIONS_READ, ...profile.notifications }))
  useEffect(() => {
    update('notifications', notifs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs])
  const hasUnread = unreadCount(notifs) > 0
  const recent = profile.recentSearches ?? RECENT_DEFAULT

  const today = todayISO()
  // useMemo: only rebuild the event list when the profile changes (it reads ~1,000 events).
  const events = useMemo(() => buildFeed(profile, today), [profile, today])
  const weekEnd = addDays(today, 6)
  const thisWeek = events.filter((e) => e.date <= weekEnd).length

  // Which items each chip shows. "pop" = popular, "group" = has a group forming.
  const pass = (item) =>
    filter === 'foryou' || filter === 'create' || (filter === 'popular' && item.pop) || (filter === 'groups' && item.group)

  // Recommended actions (real UCL Careers appointment types)
  const actions = recommendedActions(profile, today).filter(pass)

  // Featured this week: the design's three picks, matched to real events
  const groupsFor = (ev) => feed.groups.filter((g) => g.ev.id === ev.id)
  const featured = HOME_FEATURED.map((f) => ({ ...f, ev: feed.events[f.ev] }))
    .filter((f) => f.ev)
    .map((f) => ({ ...f, group: groupsFor(f.ev).length > 0 }))
    .filter(pass)

  // Groups forming near you: open groups (or ones you're in). "Most popular" = your friends' groups.
  const homeGroups = feed.groups.filter((g) => (!g.full || g.inGroup) && pass({ group: true, pop: g.friend })).slice(0, 6)

  // Upcoming: real events, with any group forming for them
  const upcoming = events
    .map((e) => ({ ...e, groups: feed.groups.filter((g) => g.ev.id === e.id) }))
    .map((e) => ({ ...e, group: e.groups.length > 0, pop: e.score >= 4 || e.groups.length > 0 }))
    .filter(pass)
  const visible = upcoming.slice(0, shown)

  const toggleGoing = (id) => update('going', profile.going.includes(id) ? profile.going.filter((x) => x !== id) : [...profile.going, id])

  // "How was ...?": the last event you said you'd go to that has now happened (or the design's example).
  const allEvents = [...careerEvents, ...suEvents]
  const lastGone = profile.going
    .map((id) => allEvents.find((e) => e.id === id))
    .filter((e) => e && e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const memTitle = lastGone ? lastGone.title : 'Meet the Deloitte Team'
  const showMemory = !profile.memPromptDismissed && filter !== 'create'

  const empty = !actions.length && !featured.length && !homeGroups.length && !upcoming.length
  const openGroup = commentsFor ? feed.groups.find((g) => g.id === commentsFor) : null

  const openSearch = () => setSearching(true)
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  const openNotifications = () => {
    setNotifsOpen(true)
    setSwing(true)
    setTimeout(() => setSwing(false), 420)
  }

  // Group notifications name the real event of that group post (e.g. the Deloitte pop-up).
  const notifTitles = {}
  NOTIFICATIONS.forEach((n) => {
    const g = n.go?.group && feed.groups.find((x) => x.id === n.go.group)
    if (g) notifTitles[n.id] = g.ev.title
  })
  // Where a notification takes you: a group's comments, or another screen.
  const openNotification = (n) => {
    setNotifsOpen(false)
    if (n.go.group && feed.groups.some((g) => g.id === n.go.group)) setCommentsFor(n.go.group)
    else if (n.go.to) navigate(n.go.to)
  }

  return (
    <Screen tabs>
      <style>{NOTIFICATION_KEYFRAMES}</style>

      {/* Header: your photo (opens Profile), date, greeting, search, notifications.
          When search opens, the greeting fades up, the bell fades out and the search bar
          grows across the whole row. */}
      <div className="relative flex h-[52px] flex-none items-center gap-3 px-1 pt-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-3"
          style={{
            opacity: searching ? 0 : 1,
            transform: searching ? 'translateY(-14px)' : 'none',
            transition: `opacity .25s, transform ${SLIDE}`,
            pointerEvents: searching ? 'none' : 'auto',
          }}
        >
          <Link
            to="/profile"
            aria-label="Your profile"
            className="h-11 w-11 flex-none rounded-full"
            style={{ background: `url(${myPhoto(profile)}) center/cover` }}
          />
          <div className="min-w-0 flex-1 leading-[1.15]">
            <div className="text-[12px] text-mute">{longDate()}</div>
            <div className="mt-0.5 font-display text-[30px] whitespace-nowrap">
              {greeting()}, {profile.firstName}
            </div>
          </div>
        </div>

        {/* The bell. A pulsing blue dot means there's something unread. */}
        <button
          type="button"
          onClick={openNotifications}
          aria-label={hasUnread ? `Notifications, ${unreadCount(notifs)} unread` : 'Notifications'}
          className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sf text-ink shadow-ring"
          style={{ opacity: searching ? 0 : 1, transition: 'opacity .2s', pointerEvents: searching ? 'none' : 'auto' }}
        >
          <span className="flex" style={{ transformOrigin: '50% 10%', animation: swing ? 'ntSwing .4s ease-in-out' : 'none' }}>
            <Icon name="bell" size={20} />
          </span>
          {hasUnread && (
            <span className="absolute top-2 right-[9px] h-[9px] w-[9px] rounded-full border-2 border-sf bg-blue" style={{ animation: 'ntPulse 2s ease-in-out infinite' }} />
          )}
        </button>

        {/* The search pill: a 40px circle next to the bell that grows into a full search bar. */}
        <div
          className="absolute top-2.5 z-[3] flex h-10 items-center overflow-hidden rounded-full bg-sf shadow-ring"
          style={{
            right: searching ? 4 : 52,
            width: searching ? 'calc(100% - 8px)' : 40,
            transition: `width ${SLIDE}, right ${SLIDE}`,
          }}
        >
          {searching ? (
            <div className="flex w-full items-center gap-2 pr-1.5 pl-3">
              <Icon name="search" size={18} className="flex-none text-mute" />
              <input
                autoFocus
                value={query}
                placeholder="Search events, people, societies…"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Enter saves the search in "Recent searches". Escape closes search.
                  const text = query.trim()
                  if (e.key === 'Enter' && text)
                    update('recentSearches', [text, ...recent.filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 4))
                  if (e.key === 'Escape') closeSearch()
                }}
                className="h-10 min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-mute"
              />
              <button type="button" onClick={closeSearch} className="flex-none px-2 text-[14px] font-semibold text-acc" style={{ animation: 'larpIn .3s .15s both' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={openSearch} aria-label="Search" className="flex h-10 w-10 flex-none items-center justify-center text-ink">
              <Icon name="search" size={20} />
            </button>
          )}
        </div>
      </div>

      {/* While searching, the search view takes the place of the feed. */}
      {searching && (
        <SearchView
          query={query}
          setQuery={setQuery}
          recent={recent}
          setRecent={(list) => update('recentSearches', list)}
          onDone={closeSearch}
        />
      )}

      {!searching && (
        <>
          {/* Chips */}
          <div className="no-scrollbar -mx-4 mt-[18px] flex flex-none items-center gap-2 overflow-x-auto px-4 text-[13px]">
            {CHIPS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex h-[38px] flex-none items-center rounded-full px-4 whitespace-nowrap transition-colors ${
                  filter === key ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf font-medium text-ink shadow-ring'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilter(filter === 'create' ? 'foryou' : 'create')}
              className={`flex h-[38px] flex-none items-center rounded-full px-4 font-semibold whitespace-nowrap transition-colors ${
                filter === 'create' ? 'bg-acc text-acc-ink' : 'bg-sf2 text-acc'
              }`}
            >
              + Create
            </button>
            <div className="ml-auto flex h-[38px] flex-none items-center gap-1.5 rounded-full bg-sf px-3.5 font-semibold whitespace-nowrap shadow-ring">
              <span className="h-2 w-2 rounded-full bg-acc" />
              {thisWeek} events
            </div>
          </div>

          {/* How was ...? */}
          {showMemory && (
            <div className="mt-3.5 flex flex-none items-center gap-3 rounded-[18px] bg-sf2 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">How was {memTitle}?</div>
                <div className="mt-0.5 text-[12px] text-mute">Add a photo or a note · +10 XP</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  update('memPromptDismissed', true)
                  navigate('/profile#memories')
                }}
                className="flex h-[34px] flex-none items-center rounded-full bg-cta px-3.5 text-[12px] font-semibold text-cta-ink"
              >
                Add
              </button>
            </div>
          )}

          {/* + Create: start a group post */}
          {filter === 'create' && (
            <div className="mt-4 flex-none rounded-3xl bg-sf p-[18px] shadow-ring">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[22px] leading-[1.1]">
                    Start a <em>group</em> post
                  </div>
                  <div className="mt-1.5 text-[13px] leading-[1.45] text-mute">Pick an event and a group size. People who share your hobbies see it first.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilter('foryou')}
                  aria-label="Close"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-mute"
                >
                  <Icon name="close" size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="mt-3.5 flex gap-2 text-[12px] font-semibold">
                {SIZES.map(([size, label]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCreateSize(size)}
                    className={`rounded-full px-3 py-2 ${createSize === size ? 'bg-acc text-acc-ink' : 'bg-sf2'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPosting(true)}
                className="mt-3 flex h-12 w-full items-center justify-between rounded-2xl bg-sf2 px-4 text-[14px]"
              >
                <span className="text-mute">Choose an event</span>
                <span>›</span>
              </button>
              <button type="button" onClick={() => setPosting(true)} className="mt-3 h-[46px] w-full rounded-full bg-cta text-[14px] font-semibold text-cta-ink">
                Post to People › Social
              </button>
            </div>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <>
              <Heading right={<div className="text-[13px] font-medium text-mute">{actions.length} for you</div>}>Recommended actions</Heading>
              <ActionCarousel key={filter} actions={actions} />
            </>
          )}

          {/* Featured this week */}
          {featured.length > 0 && (
            <>
              <Heading right={<div className="text-[13px] font-medium text-mute">{featured.length} picked for you</div>}>Featured this week</Heading>
              <div className="no-scrollbar -mx-4 mt-3 flex flex-none snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-0.5 pb-1.5">
                {featured.map((f) => {
                  const groups = groupsFor(f.ev)
                  return (
                    <FeaturedCard
                      key={f.ev.key}
                      item={f}
                      group={groups[0]}
                      groupCount={groups.length}
                      booked={profile.going.includes(f.ev.id)}
                      onJoin={feed.join}
                      onBook={() => toggleGoing(f.ev.id)}
                    />
                  )
                })}
                <Link
                  to="/people?tab=social"
                  className="box-border flex w-[180px] flex-none snap-start flex-col justify-between rounded-3xl bg-sf2 p-5 text-ink no-underline"
                >
                  <div className="flex flex-none">
                    {['#DDBDFF', '#BA82FF', '#993BFF'].map((c, i) => (
                      <span key={c} className={`h-[30px] w-[30px] rounded-full border-2 border-sf2 ${i ? '-ml-2.5' : ''}`} style={{ background: c }} />
                    ))}
                  </div>
                  <div>
                    <div className="font-display text-[22px] leading-[1.1]">Find a group to go with →</div>
                    <div className="mt-2 text-[12px] leading-[1.4] text-mute">Open posts for this week’s featured events.</div>
                  </div>
                </Link>
              </div>
            </>
          )}

          {/* Groups forming near you */}
          {homeGroups.length > 0 && (
            <>
              <Heading
                right={
                  <Link to="/people?tab=social" className="text-[13px] font-medium text-mute no-underline hover:text-ink">
                    View all ›
                  </Link>
                }
              >
                Groups forming near you
              </Heading>
              <div className="no-scrollbar -mx-4 mt-3 flex flex-none snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-0.5 pb-1.5">
                {homeGroups.map((g) => (
                  <div key={g.id} className="box-border flex w-[210px] flex-none snap-start flex-col gap-2.5 rounded-[20px] bg-sf p-3.5 shadow-ring">
                    <div className="flex items-center justify-between gap-2">
                      <Face who={g.by} size={34} />
                      <span className="rounded-full bg-sf2 px-[9px] py-1 text-[12px] font-semibold">
                        {g.n}/{g.size} filled
                      </span>
                    </div>
                    <div>
                      <div className="text-[14px] leading-[1.25] font-semibold">{g.ev.title}</div>
                      <div className="mt-[3px] text-[12px] text-mute">
                        {g.ev.dateLabel} · {g.ev.start} · by {g.by === 'me' ? 'you' : g.name.split(' ')[0]}
                      </div>
                      {g.comments.length > 0 && (
                        <button type="button" onClick={() => setCommentsFor(g.id)} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-acc">
                          <Icon name="chat" size={12} />
                          {g.comments.length > 1 ? `View all ${g.comments.length} comments` : 'View comment'}
                        </button>
                      )}
                    </div>
                    <JoinButton group={g} onJoin={feed.join} short className="mt-auto h-9" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <>
              <Heading right={<div className="text-[13px] font-medium text-mute">{upcoming.length} events</div>}>Upcoming</Heading>
              <div className="mt-3 flex flex-none flex-col gap-2">
                {visible.map((event, i) => {
                  // A month heading whenever the month changes (e.g. "November").
                  const newMonth = i > 0 && event.date.slice(0, 7) !== visible[i - 1].date.slice(0, 7)
                  return (
                    <div key={event.id} className="flex flex-col gap-2">
                      {newMonth && (
                        <div className="px-1 pt-2 font-display text-[18px]">
                          {new Date(`${event.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'long' })}
                        </div>
                      )}
                      <EventRow
                        event={event}
                        groups={event.groups}
                        going={profile.going.includes(event.id)}
                        onToggle={() => {
                          // In a group for it? Open the group's comments instead of toggling.
                          const mine = event.groups.find((g) => g.inGroup)
                          if (mine) setCommentsFor(mine.id)
                          else toggleGoing(event.id)
                        }}
                      />
                    </div>
                  )
                })}
                {upcoming.length > shown && (
                  <button type="button" onClick={() => setShown(shown + PAGE_SIZE)} className="mt-1 h-11 rounded-full bg-sf text-[14px] font-semibold shadow-ring">
                    Show more ({upcoming.length - shown})
                  </button>
                )}
              </div>
            </>
          )}

          {empty && <div className="mt-10 text-center text-[14px] text-mute">Nothing here yet, try another filter.</div>}
        </>
      )}

      {posting && (
        <PostGroupSheet
          feed={feed}
          startSize={createSize}
          onClose={() => setPosting(false)}
          onPosted={() => {
            setFilter('foryou')
            navigate('/people?tab=social')
          }}
        />
      )}
      {openGroup && <CommentsSheet group={openGroup} feed={feed} onClose={() => setCommentsFor(null)} />}
      {notifsOpen && (
        <NotificationsSheet state={notifs} setState={setNotifs} titles={notifTitles} onClose={() => setNotifsOpen(false)} onOpen={openNotification} />
      )}
    </Screen>
  )
}
