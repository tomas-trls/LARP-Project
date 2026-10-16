// One hook for everything about group posts: the events, the posts, joining, the waitlist,
// comments, likes, and posting your own group. Home and People both use it.
//
//   const feed = useFeed()
//   feed.groups          every post, ready to show (newest of yours first)
//   feed.join(group)     join or leave a group (or join / leave its waitlist when it's full)
//   feed.commentsFor(id) the comments under a post, with yours added
//   feed.addComment(id, text, replyTo)   feed.toggleLike(commentId)
//   feed.postGroup({ ev, size, msg, vis })
//
// What you do is saved in the profile (see profileStore.jsx):
//   groupsJoined, waitlist, myGroups, myComments, likedComments
import { useMemo } from 'react'
import { DEFAULT_COMMENTS, DEFAULT_GROUPS, feedEvents } from '../../data/feed.js'
import { SOCIAL_PEOPLE } from '../../data/people.js'
import { useProfile } from '../../profileStore.jsx'
import { todayISO } from '../../sampleData.js'

export const ME = 'me'

// Your own avatar: your first profile photo.
export function myPhoto(profile) {
  return profile.photos?.[0] ?? '/photos/sample-1.png'
}

// The CSS background for anyone's round avatar: your photo, or the person's colour.
export function avatarBg(who, profile) {
  if (who === ME) return `url(${myPhoto(profile)}) center/cover`
  return SOCIAL_PEOPLE[who]?.color ?? 'var(--sf2)'
}

export function nameOf(who) {
  return who === ME ? 'You' : (SOCIAL_PEOPLE[who]?.name ?? who)
}

export function firstNameOf(who) {
  return who === ME ? 'You' : nameOf(who).split(' ')[0]
}

export default function useFeed() {
  const { profile, update } = useProfile()
  const today = todayISO()
  // useMemo: the events are found in ~1,000 rows, so only do it once per day.
  const events = useMemo(() => feedEvents(today), [today])

  const joined = profile.groupsJoined ?? []
  const waitlist = profile.waitlist ?? []
  const myGroups = profile.myGroups ?? []
  const myComments = profile.myComments ?? {}
  const liked = profile.likedComments ?? []

  // Adds everything a card needs to a raw post: the event, who's in, spots left, button labels.
  const decorate = (g) => {
    const ev = events[g.ev]
    if (!ev) return null // the event is over or doesn't exist
    const members = joined.includes(g.id) && !g.joined.includes(ME) ? [...g.joined, ME] : g.joined
    const n = members.length
    const left = Math.max(0, g.size - n)
    const full = left === 0
    const inGroup = members.includes(ME)
    const onWait = waitlist.includes(g.id)
    const poster = g.by === ME ? { name: 'You', tag: 'Your post' } : SOCIAL_PEOPLE[g.by]
    return {
      ...g,
      ev,
      msg: g.msg.replace('{day}', ev.weekday),
      members,
      name: poster.name,
      tag: poster.tag,
      n,
      left,
      full,
      inGroup,
      onWait,
      friend: g.by === ME || poster.tag === 'Connection',
      sizeLabel: `Group of ${g.size === 8 ? '8+' : g.size}`,
      progress: full ? 'Full · Join waitlist' : `${n} of ${g.size} · ${left} spot${left === 1 ? '' : 's'} left`,
      line: `${firstNameOf(g.by)}${n > 1 ? ` + ${n - 1} other${n - 1 === 1 ? '' : 's'}` : ''} · ${full ? 'full' : `${left} spot${left === 1 ? '' : 's'} left`}`,
      joinLabel: inGroup ? 'You’re in ✓' : full ? (onWait ? 'On waitlist ✓' : 'Join waitlist') : 'Join group',
      joinShort: inGroup ? 'Joined ✓' : full ? (onWait ? 'Waitlisted' : 'Waitlist') : 'Join',
      joinOn: inGroup || onWait, // true = the button shows the quieter "done" style
      comments: [...(DEFAULT_COMMENTS[g.id] ?? []), ...(myComments[g.id] ?? [])],
    }
  }

  const groups = [...myGroups, ...DEFAULT_GROUPS].map(decorate).filter(Boolean)

  // Join or leave. A full group you're not in toggles the waitlist instead.
  const join = (g) => {
    if (g.inGroup) {
      if (g.by === ME) return // you can't leave your own post
      update('groupsJoined', joined.filter((x) => x !== g.id))
    } else if (g.full) {
      update('waitlist', g.onWait ? waitlist.filter((x) => x !== g.id) : [...waitlist, g.id])
    } else {
      update('groupsJoined', [...joined, g.id])
    }
  }

  const addComment = (groupId, text, replyTo) => {
    const comment = { id: `mine-${Date.now()}`, by: ME, ago: 'now', text, likes: 0, re: replyTo || undefined }
    update('myComments', { [groupId]: [...(myComments[groupId] ?? []), comment] })
  }

  const toggleLike = (commentId) =>
    update('likedComments', liked.includes(commentId) ? liked.filter((x) => x !== commentId) : [...liked, commentId])

  // Your own post goes to the top of every feed. Size 8 or more shows as "8+".
  const postGroup = ({ ev, size, msg, vis }) => {
    const post = { id: `mine-${Date.now()}`, by: ME, ago: 'Just now', ev, size: size >= 8 ? 8 : size, joined: [ME], msg, vis }
    update('myGroups', [post, ...myGroups])
  }

  return { events, groups, join, addComment, toggleLike, liked, postGroup }
}
