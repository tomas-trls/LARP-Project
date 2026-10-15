// Screens 12 (People › Career) and 13 (People › Social), on one page with a Career / Social switch.
// The switch is kept in the address (/people or /people?tab=social), so either side can be linked to.
//
// Career: one suggested alumnus or student at a time, matched on your route and CV.
// Social: someone to go to a real upcoming SU event with, matched on hobbies and personality only.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { ConnectionsPill, FollowButton, RoundButton } from '../components/people/parts.jsx'
import { Avatar } from '../components/ui.jsx'
import { CAREER_SUGGESTIONS, CONNECTION_TOTAL, HOBBY_MATCHES, SOCIAL_PAIRS, plainHobby } from '../data/people.js'
import { useProfile } from '../profileStore.jsx'
import { shortDate, suEvents, todayISO, upcoming } from '../sampleData.js'

export default function People() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'social' ? 'social' : 'career'
  const { profile } = useProfile()
  const total = CONNECTION_TOTAL + (profile.accepted ?? []).length

  return (
    <Screen tabs>
      {/* Title row: "People", the connections pill, and a bookmark (career) or calendar (social) button */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">People</h1>
        <div className="flex gap-2">
          <ConnectionsPill count={total} />
          {tab === 'career' ? (
            <RoundButton label="Saved people" badge={6}>
              <Icon name="bookmark" size={20} />
            </RoundButton>
          ) : (
            <RoundButton label="My plans">
              <Icon name="calendar" size={20} />
            </RoundButton>
          )}
        </div>
      </div>

      {/* The Career / Social switch */}
      <div className="mt-3.5 flex h-12 flex-none rounded-full bg-sf p-1 shadow-ring" role="tablist">
        {['career', 'social'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'social' ? { tab: 'social' } : {})}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full text-[14px] ${
              tab === t ? 'bg-acc font-semibold text-acc-ink' : 'text-mute'
            }`}
          >
            {t === 'career' && tab === 'career' && <Icon name="briefcase" size={16} />}
            {t === 'career' ? 'Career' : 'Social'}
          </button>
        ))}
      </div>

      {tab === 'career' ? <CareerSide /> : <SocialSide />}
    </Screen>
  )
}

// ---------- 12 · Career ----------

function CareerSide() {
  const { profile, update } = useProfile()
  const [index, setIndex] = useState(0) // which suggestion is showing
  const requested = profile.requested ?? [] // ids you sent a request to (saved, so it survives a refresh)

  // After the last person, show a friendly "all caught up" card.
  if (index >= CAREER_SUGGESTIONS.length) {
    return (
      <div className="mt-4 flex flex-col items-center rounded-[28px] bg-sf px-6 py-10 text-center shadow-ring">
        <div className="font-display text-[26px]">You're all caught up</div>
        <p className="mt-2 text-[14px] text-mute">New people on your {profile.activeRoute} route show up here each week.</p>
        <button type="button" onClick={() => setIndex(0)} className="mt-5 h-12 rounded-full bg-cta px-6 text-[15px] font-semibold text-cta-ink">
          Start again
        </button>
      </div>
    )
  }

  const person = CAREER_SUGGESTIONS[index]
  const sent = requested.includes(person.id)
  const firstName = person.name.split(' ')[0]

  // Sending a request only records it in LARP. Nothing is ever sent on LinkedIn.
  const sendRequest = () => update('requested', [...requested, person.id])

  return (
    <>
      <div className="mt-4 flex-none overflow-hidden rounded-[28px] bg-sf shadow-ring">
        {/* Photo placeholder with an Alumni / Student badge */}
        <div
          className="relative h-[220px]"
          style={{ background: 'repeating-linear-gradient(135deg,var(--sf2) 0 6px,var(--sf) 6px 12px)' }}
        >
          <span className="absolute bottom-3.5 left-3.5 rounded-md bg-sf px-2 py-0.5 font-mono text-[11px] text-mute">profile photo</span>
          <span className="absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-[12px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-blue" />
            {person.kind}
          </span>
        </div>
        <div className="px-[18px] pt-4 pb-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-display text-[26px]">{person.name}</div>
            <div className="flex-none text-[13px] font-semibold text-acc">{person.match}% match</div>
          </div>
          <div className="mt-0.5 text-[14px] text-mute">{person.headline}</div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
            {person.tags.map((t) => (
              <span key={t} className="rounded-full bg-sf2 px-2.5 py-[5px]">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 text-[12px] leading-[1.45] text-mute">
            <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-blue" />
            <span>Why: {person.why}</span>
          </div>
        </div>
      </div>

      <div className="mt-[18px] flex flex-none gap-2.5">
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          className="h-14 flex-1 rounded-full bg-sf text-[15px] font-semibold text-mute shadow-ring"
        >
          {sent ? 'Next' : 'Not now'}
        </button>
        <button
          type="button"
          onClick={sendRequest}
          disabled={sent}
          className={`h-14 flex-[2] rounded-full text-[15px] font-semibold ${sent ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
        >
          {sent ? 'Request sent ✓' : 'Send connection request'}
        </button>
      </div>
      <div className="mt-3 text-center text-[12px] text-mute">
        {sent ? `${firstName} will see it in Pending. You can chat once they accept.` : `${firstName} sees your note and profile first.`}
      </div>
    </>
  )
}

// ---------- 13 · Social ----------

// Picks a real upcoming Students' Union event for a pair: the first one whose title has one of
// the person's words (e.g. "quiz"). If none match, the first upcoming social.
function eventFor(pair) {
  const soon = upcoming(suEvents, todayISO()).filter((e) => e.start)
  return (
    soon.find((e) => pair.eventWords.some((w) => e.title.toLowerCase().includes(w))) ??
    soon.find((e) => e.category === 'Socials & Food') ??
    soon[0]
  )
}

// "SU · Mully's bar" -> "Students' Union"; a society keeps its own name.
function organiserLabel(e) {
  return e.organiser.startsWith('SU ·') || e.organiser.includes("Students' Union") ? "Students' Union" : e.organiser
}

function SocialSide() {
  const { profile, update } = useProfile()
  const myHobbies = profile.interests.on.map(plainHobby)

  // Rank possible partners by how many hobbies you share. Ties keep the list order.
  const shared = (p) => p.likes.filter((l) => myHobbies.some((h) => h.includes(l) || l.includes(h))).length
  const pairs = [...SOCIAL_PAIRS].sort((a, b) => shared(b) - shared(a))

  const [index, setIndex] = useState(0)
  const pair = pairs[index % pairs.length]
  const event = eventFor(pair)
  const paired = (profile.paired ?? []).includes(pair.id)
  const firstName = pair.name.split(' ')[0]

  const pairUp = () => {
    update('paired', [...(profile.paired ?? []), pair.id])
    if (event && !profile.going.includes(event.id)) update('going', [...profile.going, event.id])
  }

  return (
    <>
      <h2 className="mt-4 px-1 font-display text-[26px] leading-[1.15] font-normal">
        Go to things <em>with</em> someone
      </h2>
      <p className="mt-1 px-1 text-[13px] text-mute">Pairs use your personality answers and hobbies — never your CV.</p>

      {/* The bright purple pairing card */}
      <div className="mt-3.5 flex-none rounded-3xl bg-hero px-5 py-[18px] text-hero-ink">
        {event && (
          <>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/20 px-[9px] py-1">{organiserLabel(event)}</span>
              <span className="rounded-full bg-white/20 px-[9px] py-1">
                {shortDate(event.date)} · {event.start}
              </span>
            </div>
            <div className="mt-2.5 font-display text-[24px] leading-tight">
              {event.title} · {event.location.split(',')[0]}
            </div>
          </>
        )}
        <div className="mt-3.5 flex items-center gap-3 rounded-[18px] bg-white/15 p-3">
          <Avatar size={48} light />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{pair.name}</div>
            <div className="text-[12px] opacity-90">{pair.line}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              {pair.tags.map((t) => (
                <span key={t} className="rounded-full bg-white/20 px-2 py-[3px]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={pairUp}
            disabled={paired}
            className="h-[46px] flex-1 rounded-full bg-white text-[14px] font-semibold text-plum"
          >
            {paired ? 'Paired ✓' : `Pair up with ${firstName}`}
          </button>
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="h-[46px] rounded-full border-[1.5px] border-white/60 px-4 text-[14px] font-semibold"
          >
            Someone else
          </button>
        </div>
        {paired && <div className="mt-2.5 text-center text-[12px] opacity-90">Your group chat with {firstName} is in Messages.</div>}
      </div>

      <h2 className="mt-5 px-1 font-display text-[20px] font-normal">People who share your hobbies</h2>
      <div className="mt-2.5 flex flex-col gap-2">
        {HOBBY_MATCHES.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-[18px] bg-sf px-3.5 py-2.5 shadow-ring">
            <div className="h-10 w-10 flex-none rounded-full bg-sf2" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{p.name}</div>
              <div className="text-[12px] text-mute">{p.line}</div>
            </div>
            <FollowButton id={p.id} />
          </div>
        ))}
      </div>
      <Link to="/connections" className="mt-3 text-center text-[13px] font-semibold text-acc">
        See all your connections
      </Link>
    </>
  )
}
