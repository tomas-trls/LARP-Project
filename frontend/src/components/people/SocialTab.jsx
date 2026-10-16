// 13 · People › Social
// "Go to things with someone": post a group or join one. The purple card shows the group
// closest to filling up for an event like yours; below it, every "Going together" post,
// then people who share your hobbies.
// Matched on hobbies and personality only, never on your CV (docs/DESIGN_DECISIONS.md, section 8).
import { useState } from 'react'
import Icon from '../Icon.jsx'
import { HOBBY_MATCHES, SOCIAL_PEOPLE } from '../../data/people.js'
import { useProfile } from '../../profileStore.jsx'
import CommentsSheet from '../feed/CommentsSheet.jsx'
import GroupPostCard from '../feed/GroupPostCard.jsx'
import { Face, FilterChips } from '../feed/parts.jsx'
import PostGroupSheet from '../feed/PostGroupSheet.jsx'
import useFeed, { firstNameOf, ME } from '../feed/useFeed.js'

const FILTERS = [
  ['featured', 'Featured this week'],
  ['friends', 'Friends'],
  ['g3', 'Group of 3'],
  ['g6', 'Group of 6'],
  ['g8', 'Group of 8+'],
  ['weekend', 'This weekend'],
]

function passes(filter, g) {
  if (!filter) return true
  if (filter === 'featured') return g.ev.featured
  if (filter === 'friends') return g.friend
  if (filter === 'g3') return g.size === 3
  if (filter === 'g6') return g.size === 6
  if (filter === 'g8') return g.size === 8
  if (filter === 'weekend') return g.ev.weekend
  return true
}

export default function SocialTab() {
  const { profile, update } = useProfile()
  const feed = useFeed()
  const [filter, setFilter] = useState(null)
  const [posting, setPosting] = useState(false)
  const [commentsFor, setCommentsFor] = useState(null)

  // The social side only shows non-careers events.
  const socialGroups = feed.groups.filter((g) => !g.ev.careers)
  const posts = socialGroups.filter((g) => passes(filter, g))
  // Hero: the quiz group if it's on, otherwise the social group with the most people that still has room.
  const hero =
    socialGroups.find((g) => g.ev.key === 'quiz') ??
    [...socialGroups].filter((g) => !g.full || g.inGroup).sort((a, b) => b.n - a.n)[0]
  const others = hero ? hero.members.filter((p) => p !== ME) : []
  const heroLine = hero
    ? `${others.slice(0, 2).map(firstNameOf).join(', ')}${others.length > 2 ? ` and ${others.length - 2} other${others.length - 2 === 1 ? '' : 's'}` : ''} are going to ${hero.ev.title}. Join them?`
    : ''

  const following = profile.following ?? []
  const toggleFollow = (id) => update('following', following.includes(id) ? following.filter((x) => x !== id) : [...following, id])
  const openGroup = commentsFor ? feed.groups.find((g) => g.id === commentsFor) : null

  return (
    <>
      <div className="mt-4 flex flex-none items-center justify-between gap-3 px-1">
        <h2 className="font-display text-[26px] leading-[1.15] font-normal">
          Go to things <em>with</em> someone
        </h2>
        <button
          type="button"
          onClick={() => setPosting(true)}
          className="flex h-10 flex-none items-center justify-center gap-1.5 rounded-full bg-cta px-4 text-[13px] font-semibold text-cta-ink"
        >
          <Icon name="plus" size={16} />
          Post a group
        </button>
      </div>
      <FilterChips className="mt-3" options={FILTERS} value={filter} onChange={setFilter} />

      {/* The purple card: a group close to filling up */}
      {hero && (
        <div className="mt-3.5 flex-none rounded-3xl bg-hero px-5 py-[18px] text-hero-ink">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-white/[.18] px-[9px] py-1">{hero.ev.org}</span>
            <span className="rounded-full bg-white/[.18] px-[9px] py-1">
              {hero.ev.dateLabel} · {hero.ev.start} · {hero.ev.place}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex flex-none pl-2">
              {hero.members.slice(0, 4).map((p) => (
                <Face key={p} who={p} size={36} ring="2px solid var(--hero)" className="-ml-2" />
              ))}
            </div>
            <div className="font-display text-[22px] leading-[1.15]">{heroLine}</div>
          </div>
          <div className="mt-2 text-[12px] opacity-90">{hero.progress} · matched on your hobbies, not your CV</div>
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => feed.join(hero)}
              className="flex h-[46px] flex-1 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-plum"
            >
              {hero.inGroup ? 'You’re in ✓' : hero.full ? (hero.onWait ? 'On waitlist ✓' : 'Join waitlist') : 'Join their group'}
            </button>
            <button
              type="button"
              onClick={() => setCommentsFor(hero.id)}
              aria-label="Group comments"
              className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border-[1.5px] border-white/60"
            >
              <Icon name="chat" size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Going together */}
      <div className="mt-[22px] flex flex-none items-baseline justify-between px-1">
        <h2 className="font-display text-[22px] font-normal">Going together</h2>
        <div className="text-[13px] text-mute">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="mt-3 flex flex-none flex-col gap-2.5">
        {posts.map((g) => (
          <GroupPostCard key={g.id} group={g} onJoin={feed.join} onComments={() => setCommentsFor(g.id)} />
        ))}
        {posts.length === 0 && <div className="py-[30px] text-center text-[14px] text-mute">No posts match this filter yet. Be the first to post a group.</div>}
      </div>

      {/* People who share your hobbies */}
      <h2 className="mt-[22px] px-1 font-display text-[22px] font-normal">People who share your hobbies</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex flex-none snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pt-0.5 pb-1.5">
        {HOBBY_MATCHES.map((key) => {
          const p = SOCIAL_PEOPLE[key]
          const on = following.includes(p.followId)
          return (
            <div key={key} className="box-border flex w-[156px] flex-none snap-start flex-col items-center gap-2 rounded-[20px] bg-sf p-3.5 text-center shadow-ring">
              <div className="h-[52px] w-[52px] rounded-full" style={{ background: p.color }} />
              <div>
                <div className="text-[14px] font-semibold">{p.name}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-acc">{p.tag}</div>
              </div>
              <div className="min-h-[30px] text-[11px] leading-[1.35] text-mute">{p.bio}</div>
              <button
                type="button"
                onClick={() => toggleFollow(p.followId)}
                className={`box-border h-[34px] w-full rounded-full border-[1.5px] border-acc text-[13px] font-semibold transition-colors ${on ? 'bg-acc text-acc-ink' : 'text-acc'}`}
              >
                {on ? 'Following' : 'Follow'}
              </button>
            </div>
          )
        })}
      </div>

      {posting && <PostGroupSheet feed={feed} onClose={() => setPosting(false)} onPosted={() => setFilter(null)} />}
      {openGroup && <CommentsSheet group={openGroup} feed={feed} onClose={() => setCommentsFor(null)} />}
    </>
  )
}
