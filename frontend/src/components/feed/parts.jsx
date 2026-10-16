// Small pieces used by the group-post screens (Home, People › Career, People › Social).
import { useEffect } from 'react'
import { useProfile } from '../../profileStore.jsx'
import { avatarBg } from './useFeed.js'

// A panel that slides up from the bottom, in the card colour, over a dimmed screen.
// The design's comment sheet has a fixed height (75%); the others grow with their content.
//   <FeedSheet onClose={...} height="75%">...</FeedSheet>
export function FeedSheet({ onClose, height, maxHeight = '86%', label, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[402px] flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={label}
        className="relative flex flex-col rounded-t-[28px] bg-sf pt-2.5 shadow-[0_-10px_40px_rgba(20,8,40,.35)]"
        style={{ height, maxHeight, animation: 'sheetUp .25s cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="mx-auto mb-3 h-[5px] w-10 flex-none rounded-[3px] bg-line" />
        {children}
      </div>
    </div>
  )
}

// A round avatar for anyone in the feed ('me' shows your photo).
export function Face({ who, size = 32, ring, className = '' }) {
  const { profile } = useProfile()
  return (
    <div
      className={`flex-none rounded-full ${className}`}
      style={{ width: size, height: size, background: avatarBg(who, profile), border: ring }}
    />
  )
}

// The little coloured square with the event's category (Networking, Social...).
export function EventBlock({ ev, size = 52 }) {
  return (
    <div
      className="relative flex flex-none items-center justify-center overflow-hidden rounded-[14px]"
      style={{ width: size, height: size, background: ev.blockBg, color: ev.blockInk }}
    >
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 4px,transparent 4px 10px)' }} />
      <span className="relative px-0.5 text-center text-[8px] leading-[1.1] font-bold break-words uppercase">{ev.cat}</span>
    </div>
  )
}

// One circle per place in the group: filled with a face when taken, dashed when free.
export function Spots({ group, size = 26, gap = 5, nowrap = false }) {
  const { profile } = useProfile()
  return (
    <div className={`flex ${nowrap ? '' : 'flex-wrap'}`} style={{ gap }}>
      {Array.from({ length: group.size }, (_, i) => {
        const who = group.members[i]
        return (
          <div
            key={i}
            className="box-border rounded-full"
            style={{
              width: size,
              height: size,
              background: who ? avatarBg(who, profile) : 'transparent',
              border: who ? '2px solid var(--sf)' : '1.5px dashed var(--mute)',
            }}
          />
        )
      })}
    </div>
  )
}

// The Join / Join waitlist button. "on" (joined or waitlisted) uses the quieter style.
export function JoinButton({ group, onJoin, short = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onJoin(group)
      }}
      className={`flex items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-colors ${
        group.joinOn ? 'bg-sf2 text-ink' : 'bg-cta text-cta-ink'
      } ${className}`}
    >
      {short ? group.joinShort : group.joinLabel}
    </button>
  )
}

// Icons that only the feed uses (the shared Icon.jsx doesn't have them).
export function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  )
}

export function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  )
}

// A sideways-scrolling row of filter chips. Tapping the selected chip again clears the filter.
//   <FilterChips options={[['week', 'This week'], ...]} value={filter} onChange={setFilter} />
export function FilterChips({ options, value, onChange, toggle = true, className = '' }) {
  return (
    <div className={`no-scrollbar -mx-4 flex flex-none gap-2 overflow-x-auto px-4 py-0.5 text-[13px] ${className}`}>
      {options.map(([key, label]) => {
        const on = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(on && toggle ? null : key)}
            className={`flex h-9 flex-none items-center rounded-full px-3.5 whitespace-nowrap transition-colors ${
              on ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf font-medium text-ink shadow-ring'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
