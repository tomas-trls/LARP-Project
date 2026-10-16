// The notifications panel that slides up when you tap the bell on Home (design v3, screen 10).
//
//   - Filter chips: All / Groups / Messages / Careers / Badges
//   - Rows grouped under "Today" and "Earlier this week". Unread rows have a tinted background
//     and a blue dot on the right.
//   - Tapping a row marks it read and opens it (see "go" in src/data/notifications.js).
//   - A button like "Set reminder" switches to its done label ("Reminder set ✓").
//   - Swipe a row to the left to show "Dismiss" (drag with a mouse works too).
//   - "Mark all as read" clears the dots one after another.
//
// What you read, dismissed or pressed is kept by Home (the "state" prop) and saved in the profile.
import { useEffect, useRef, useState } from 'react'
import { NOTIFICATIONS, NOTIFICATION_FILTERS } from '../../data/notifications.js'
import { SOCIAL_PEOPLE } from '../../data/people.js'

const WHEN = ['Today', 'Earlier this week']
const SWIPE_WIDTH = 92 // how far a row slides left to show "Dismiss"

// The animations for this panel (the bell swing and the pulsing dot are used by Home's header).
export const NOTIFICATION_KEYFRAMES = `
@keyframes ntSwing{0%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}35%{transform:rotate(-14deg)}55%{transform:rotate(10deg)}75%{transform:rotate(-6deg)}}
@keyframes ntUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes ntPulse{0%,100%{box-shadow:0 0 0 0 rgba(48,214,255,.6)}50%{box-shadow:0 0 0 5px rgba(48,214,255,0)}}
`

// The little pentagon that smiles when there's nothing left to read.
function HappyMascot() {
  return (
    <div className="relative h-[72px] w-16">
      <div className="absolute top-0 left-1 h-[52px] w-14 bg-lilac" style={{ clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)' }}>
        <div className="absolute top-[22px] left-[17px] h-[3px] w-[9px] rounded-b-[6px] bg-plum" />
        <div className="absolute top-[22px] left-[34px] h-[3px] w-[9px] rounded-b-[6px] bg-plum" />
        <div className="absolute top-[33px] left-6 h-1.5 w-3 rounded-b-[10px] border-b-2 border-plum" />
      </div>
      <div className="absolute bottom-[5px] left-[22px] h-4 w-[2.5px] rounded-sm bg-plum" />
      <div className="absolute bottom-[5px] left-[39px] h-4 w-[2.5px] rounded-sm bg-plum" />
    </div>
  )
}

// One notification row, with the red "Dismiss" button hidden underneath it.
function Row({ n, unread, isDone, swiped, onSwipe, onTap, onAction, onDismiss }) {
  const startX = useRef(null)
  const dragged = useRef(false) // true right after a swipe, so the click that follows is ignored
  const avatar = n.who ? SOCIAL_PEOPLE[n.who]?.color : n.whoColor

  return (
    <div className="relative mb-1 overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[#E5484D] text-[13px] font-semibold text-white"
        // Hidden until the row is swiped, so its red edge never peeks out at the rounded corners.
        style={{ width: SWIPE_WIDTH, visibility: swiped ? 'visible' : 'hidden' }}
        tabIndex={swiped ? 0 : -1}
      >
        Dismiss
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false
            return
          }
          onTap()
        }}
        onKeyDown={(e) => e.key === 'Enter' && onTap()}
        // Swipe: remember where the finger went down, and compare when it comes up.
        onPointerDown={(e) => {
          startX.current = e.clientX
        }}
        onPointerUp={(e) => {
          const moved = e.clientX - (startX.current ?? e.clientX)
          dragged.current = Math.abs(moved) > 10
          if (moved < -40) onSwipe(true)
          else if (moved > 30 && swiped) onSwipe(false)
        }}
        className="relative flex cursor-pointer items-center gap-3 bg-bg p-3 select-none"
        style={{
          transform: swiped ? `translateX(-${SWIPE_WIDTH}px)` : 'none',
          transition: 'transform .25s cubic-bezier(.2,.8,.3,1)',
          touchAction: 'pan-y',
        }}
      >
        {/* Unread rows get the card colour behind them; it fades out once read. */}
        <div className="pointer-events-none absolute inset-0 transition-[background] duration-300" style={{ background: unread ? 'var(--sf)' : 'transparent' }} />

        <div className="relative h-10 w-10 flex-none">
          {avatar ? (
            <>
              <div className="h-10 w-10 rounded-full" style={{ background: avatar }} />
              <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg text-[11px]">{n.icon}</div>
            </>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sf2 text-[18px]">{n.icon}</div>
          )}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="text-[13px] leading-[1.4]">
            {n.pre}
            <b>{n.b1}</b>
            {n.mid}
            {n.b2 && <b>{n.b2}</b>}
            {n.post}
          </div>
          <div className="mt-0.5 text-[11px] text-mute">{n.t}</div>
        </div>

        {n.act && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // don't also open the row
              onAction()
            }}
            className={`relative flex h-[30px] flex-none items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap ${
              isDone ? 'bg-sf2 text-ink' : 'bg-cta text-cta-ink'
            }`}
          >
            {isDone ? n.done : n.act}
          </button>
        )}

        <div className="relative h-2 w-2 flex-none rounded-full bg-blue transition-opacity duration-300" style={{ opacity: unread ? 1 : 0 }} />
      </div>
    </div>
  )
}

// state = { read: [ids], dismissed: [ids], done: [ids] }
// setState(fn) changes it (fn gets the old state and returns the new one).
// titles = { n1: 'Real event title', ... } replaces b2 for group notifications.
// onOpen(n) is called when a notification should take you somewhere.
export default function NotificationsSheet({ state, setState, titles, onClose, onOpen }) {
  const [filter, setFilter] = useState('All')
  const [swiped, setSwiped] = useState(null) // the id of the row slid open, if any

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const live = NOTIFICATIONS.filter((n) => !state.dismissed.includes(n.id)).map((n) => ({ ...n, b2: titles[n.id] ?? n.b2 }))
  const unread = live.filter((n) => !state.read.includes(n.id))
  const visible = live.filter((n) => filter === 'All' || n.cat === filter)
  const groups = WHEN.map((when) => ({ when, rows: visible.filter((n) => n.when === when) })).filter((g) => g.rows.length)
  const emptyText = live.length === 0 || unread.length === 0 ? 'You’re all caught up' : `Nothing in ${filter}`

  const markRead = (id) => setState((s) => ({ ...s, read: s.read.includes(id) ? s.read : [...s.read, id] }))

  // Mark all as read, one row every 90ms so you can see the dots go out.
  const markAll = () => {
    unread.forEach((n, i) => setTimeout(() => markRead(n.id), i * 90))
  }

  const tap = (n) => {
    if (swiped === n.id) {
      setSwiped(null) // a tap on a slid-open row just closes it
      return
    }
    markRead(n.id)
    if (n.go) setTimeout(() => onOpen(n), 260) // a short pause so the read state shows first
  }

  const action = (n) => {
    markRead(n.id)
    if (n.done) {
      // A button with a done state ("Set reminder" -> "Reminder set ✓") toggles in place.
      setState((s) => ({ ...s, done: s.done.includes(n.id) ? s.done.filter((x) => x !== n.id) : [...s.done, n.id] }))
    } else if (n.go) {
      onOpen(n) // a plain button like "View" just opens it
    }
  }

  const dismiss = (n) => {
    setSwiped(null)
    setState((s) => ({ ...s, dismissed: [...s.dismissed, n.id] }))
  }

  return (
    <div className="fixed inset-0 z-50">
      <style>{NOTIFICATION_KEYFRAMES}</style>
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" style={{ animation: 'larpIn .2s both' }} onClick={onClose} />
      <div
        role="dialog"
        aria-label="Notifications"
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[85dvh] max-w-(--app-w) flex-col rounded-t-[28px] bg-bg pt-2.5 shadow-[0_-10px_40px_rgba(20,8,40,.35)]"
        style={{ animation: 'ntUp .35s cubic-bezier(.2,.8,.3,1) both' }}
      >
        <div className="mx-auto mb-3 h-[5px] w-10 flex-none rounded-[3px] bg-line" />
        <div className="flex flex-none items-center justify-between px-5 pb-3">
          <h2 className="font-display text-[26px] font-normal">Notifications</h2>
          <button
            type="button"
            onClick={markAll}
            className="text-[13px] font-semibold text-acc"
            style={{ opacity: unread.length ? 1 : 0.4 }}
            disabled={!unread.length}
          >
            Mark all as read
          </button>
        </div>

        <div className="no-scrollbar flex flex-none gap-1.5 overflow-x-auto px-5 pb-2.5">
          {NOTIFICATION_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex h-8 flex-none items-center rounded-full px-3 text-[12px] font-semibold transition-colors ${
                filter === f ? 'bg-acc text-acc-ink' : 'bg-sf2 text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-10">
          {groups.map((g) => (
            <div key={g.when} className="pt-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">{g.when}</div>
              {g.rows.map((n) => (
                <Row
                  key={n.id}
                  n={n}
                  unread={!state.read.includes(n.id)}
                  isDone={state.done.includes(n.id)}
                  swiped={swiped === n.id}
                  onSwipe={(open) => setSwiped(open ? n.id : null)}
                  onTap={() => tap(n)}
                  onAction={() => action(n)}
                  onDismiss={() => dismiss(n)}
                />
              ))}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="flex flex-col items-center gap-3.5 px-2.5 py-[60px] text-center" style={{ animation: 'larpIn .3s both' }}>
              <HappyMascot />
              <div className="font-display text-[24px]">{emptyText}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// How many notifications are still unread (for the dot on the bell).
// eslint-disable-next-line react/only-export-components
export function unreadCount(state) {
  return NOTIFICATIONS.filter((n) => !state.dismissed.includes(n.id) && !state.read.includes(n.id)).length
}
