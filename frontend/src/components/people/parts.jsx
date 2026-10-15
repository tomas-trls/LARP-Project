// Small pieces shared by the People and Connections screens.
import { Link } from 'react-router-dom'
import { useProfile } from '../../profileStore.jsx'

// The "127 connections" pill with three overlapping dots. Tapping it opens 13b Connections.
export function ConnectionsPill({ count }) {
  return (
    <Link
      to="/connections"
      className="flex h-10 items-center gap-2 rounded-full bg-sf pr-3.5 pl-2.5 text-[13px] font-semibold text-ink shadow-ring"
    >
      <span className="flex">
        {['#DDBDFF', '#BA82FF', '#993BFF'].map((c, i) => (
          <span key={c} className={`h-[22px] w-[22px] rounded-full border-2 border-sf ${i ? '-ml-2' : ''}`} style={{ background: c }} />
        ))}
      </span>
      {count} connections
    </Link>
  )
}

// A round 40px button for the top-right corner. "badge" puts a small number on it.
export function RoundButton({ children, badge, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sf text-ink shadow-ring"
    >
      {children}
      {badge != null && (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-acc px-[5px] text-[10px] font-semibold text-acc-ink">
          {badge}
        </span>
      )}
    </button>
  )
}

// Follow / Following button. Who you follow is saved in profile.following.
export function FollowButton({ id }) {
  const { profile, update } = useProfile()
  const following = profile.following.includes(id)
  const toggle = () =>
    update('following', following ? profile.following.filter((x) => x !== id) : [...profile.following, id])
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex h-[34px] flex-none items-center rounded-full px-3.5 text-[13px] font-semibold ${
        following ? 'bg-acc text-acc-ink' : 'border-[1.5px] border-acc text-acc'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

// The little "CAREER" / "SOCIAL" label next to a name. Social is blue, career is purple.
export function KindTag({ kind, onSurface = false }) {
  return (
    <span
      className={`rounded-full px-[7px] py-[3px] text-[10px] font-semibold tracking-[.06em] uppercase ${onSurface ? 'bg-sf' : 'bg-sf2'} ${
        kind === 'social' ? 'text-blue' : 'text-acc'
      }`}
    >
      {kind}
    </span>
  )
}

