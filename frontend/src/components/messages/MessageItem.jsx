// One message in a chat, drawn the way the design draws it.
// Normal texts are bubbles (yours on the right in purple, theirs on the left).
// Special messages are cards: event, shared location, icebreaker, meeting point and poll.
//
// Tap and hold (or right-click) a bubble to react with an emoji. Double-tap a bubble to reply to it.
import { useRef } from 'react'
import { ALUMNI } from '../../data/messages.js'
import { CAT, EVENTS, EVENT_GROUPS } from '../../data/memories.js'
import { avatarBg, nameOf, stackStyle } from './avatar.js'

const REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '🙏']

// A small row of overlapping avatars.
function Avatars({ ids, myPhoto, size = 20, border = 'var(--sf)', faded = [] }) {
  return (
    <div className="flex pl-1.5">
      {ids.map((id, i) => (
        <div key={id + i} style={{ ...stackStyle(avatarBg(id, myPhoto), size, border), opacity: faded.includes(id) ? 0.3 : 1, transition: 'opacity .3s' }} />
      ))}
    </div>
  )
}

// The event card inside a chat: coloured strip, title, who's going, and two buttons.
function EventCard({ evKey, going, onGo, joined, onJoin, myPhoto }) {
  const ev = EVENTS[evKey]
  if (!ev) return null
  const [bg, ink] = CAT[ev.cat]
  const group = EVENT_GROUPS[evKey]
  const ids = (group ? group.joined.filter((p) => p !== 'maya') : ['priya', 'marco']).slice(0, 4)
  return (
    <div className="w-[240px] overflow-hidden rounded-[18px] bg-sf shadow-ring">
      <div className="relative flex h-14 items-end px-3 py-2" style={{ background: bg, color: ink }}>
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 6px,transparent 6px 16px)' }} />
        <span className="relative text-[10px] font-bold tracking-[.06em] uppercase">{ev.cat}</span>
      </div>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3 text-ink">
        <div className="text-[13px] leading-[1.25] font-semibold">{ev.title}</div>
        <div className="text-[11px] text-mute">
          {ev.date} · {ev.time} · {ev.place}
        </div>
        <div className="flex items-center gap-1.5">
          <Avatars ids={ids} myPhoto={myPhoto} />
          <span className="text-[11px] text-mute">{group ? `${group.joined.length} going` : '12 going'}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onGo}
            className={`flex h-[34px] flex-1 items-center justify-center rounded-full text-[12px] font-semibold ${going ? 'bg-sf2 text-ink' : 'bg-cta text-cta-ink'}`}
          >
            {going ? 'Going ✓' : 'I’m going'}
          </button>
          {group && (
            <button type="button" onClick={onJoin} className="flex h-[34px] flex-1 items-center justify-center rounded-full border-[1.5px] border-acc text-[12px] font-semibold text-acc">
              {joined ? 'Joined ✓' : 'Join group'}
            </button>
          )}
        </div>
        {going && <div className="text-[11px] font-semibold text-acc">Maya is going ✓</div>}
      </div>
    </div>
  )
}

// A shared location: a little grid "map" with a pin, then the place name.
function LocationCard({ text, sub }) {
  return (
    <div className="w-[240px] overflow-hidden rounded-[18px] bg-sf shadow-ring">
      <div
        className="relative h-20"
        style={{ background: 'repeating-linear-gradient(0deg,var(--sf2) 0 1px,transparent 1px 20px),repeating-linear-gradient(90deg,var(--sf2) 0 1px,var(--sf) 1px 20px)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%] text-[24px]">📍</div>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-[13px] font-semibold">{text}</div>
        <div className="mt-0.5 text-[11px] text-mute">{sub}</div>
      </div>
    </div>
  )
}

// A text bubble. Long-press / right-click opens reactions, double-click replies.
function Bubble({ msg, mine, onReact, onReply }) {
  const holdTimer = useRef(null)
  const startHold = () => {
    holdTimer.current = setTimeout(onReact, 450)
  }
  const stopHold = () => clearTimeout(holdTimer.current)
  return (
    <div
      onDoubleClick={onReply}
      onContextMenu={(e) => {
        e.preventDefault()
        onReact()
      }}
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      className={`cursor-pointer px-3.5 py-2.5 text-[14px] leading-[1.4] select-none ${mine ? 'rounded-[18px_18px_4px_18px] bg-acc text-acc-ink' : 'rounded-[18px_18px_18px_4px] bg-sf2 text-ink'}`}
    >
      {msg.quote && <div className="mb-1.5 border-l-2 border-current pl-2 text-[12px] opacity-75">{msg.quote}</div>}
      {msg.text}
    </div>
  )
}

// The emoji reactions under a bubble, and the picker that pops up.
function Reactions({ msg, open, onPick }) {
  return (
    <>
      {msg.re?.length > 0 && (
        <div className="-mt-0.5 flex gap-[3px] pl-1">
          {msg.re.map((e, i) => (
            <span key={i} className="rounded-full bg-sf px-1.5 py-0.5 text-[12px] shadow-ring">
              {e}
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="flex gap-1 rounded-full bg-sf px-2 py-1.5 shadow-[0_8px_24px_rgba(20,8,40,.35),var(--ring)]" style={{ animation: 'arPop .2s both' }}>
          {REACTIONS.map((e) => (
            <button key={e} type="button" onClick={() => onPick(e)} className="p-0.5 text-[18px]">
              {e}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Cards from LARP itself (no sender): icebreaker, meeting point, poll.
function SystemCard({ msg, chat, state, actions, myPhoto }) {
  if (msg.kind === 'ice')
    return (
      <div className="flex flex-col gap-2 self-stretch rounded-[18px] bg-hero px-3.5 py-3 text-hero-ink">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase opacity-85">Icebreaker</div>
        <div className="text-[13px] leading-[1.45]">{msg.text}</div>
        <button type="button" onClick={() => actions.setText(msg.answer ?? '')} className="flex h-8 items-center self-start rounded-full bg-white px-3.5 text-[12px] font-semibold text-plum">
          Answer
        </button>
      </div>
    )

  if (msg.kind === 'meet') {
    const imHere = state.here.includes(chat.id)
    const arrived = [...(msg.here ?? []), ...(imHere ? ['maya'] : [])]
    const members = chat.type === 'group' ? ['maya', 'leila', 'sam', 'priya', 'tom', 'marco'] : []
    return (
      <div className="flex flex-col gap-2 self-stretch rounded-[18px] bg-sf px-3.5 py-3 shadow-ring">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span>📍</span>
          {msg.text}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Avatars ids={members} myPhoto={myPhoto} size={22} faded={members.filter((p) => !arrived.includes(p))} />
            <span className="text-[11px] text-mute">{arrived.length} arrived</span>
          </div>
          <button type="button" onClick={() => actions.toggleHere(chat.id)} className="flex h-[30px] items-center rounded-full bg-cta px-3 text-[12px] font-semibold text-cta-ink">
            {imHere ? 'You’re here ✓' : 'I’m here'}
          </button>
        </div>
      </div>
    )
  }

  if (msg.kind === 'poll') {
    const myVote = state.votes[chat.id]
    // Everyone's votes, with yours moved to the option you picked.
    const options = msg.opts.map(([label, who], i) => {
      const voters = who.filter((p) => p !== 'maya')
      if (myVote === i || (myVote === undefined && who.includes('maya'))) voters.push('maya')
      return { label, voters }
    })
    const total = options.reduce((n, o) => n + o.voters.length, 0) || 1
    return (
      <div className="flex flex-col gap-2 self-stretch rounded-[18px] bg-sf px-3.5 py-3 shadow-ring">
        <div className="text-[13px] font-semibold">📊 {msg.q}</div>
        {options.map((o, i) => {
          const mine = o.voters.includes('maya')
          return (
            <button key={o.label} type="button" onClick={() => actions.vote(chat.id, i)} className="relative h-10 overflow-hidden rounded-xl bg-sf2 text-left">
              <div
                className="absolute inset-y-0 left-0 opacity-50 transition-[width] duration-300"
                style={{ width: `${Math.round((o.voters.length / total) * 100)}%`, background: mine ? 'var(--acc)' : 'var(--sf)' }}
              />
              <div className="relative flex h-full items-center justify-between px-3 text-[13px]">
                <span className="font-semibold">{o.label}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-mute">
                  <Avatars ids={o.voters.slice(0, 3)} myPhoto={myPhoto} size={16} border="var(--sf2)" />
                  {o.voters.length} vote{o.voters.length === 1 ? '' : 's'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }
  return null
}

// The whole message: date line, then a system card, someone else's message or yours.
//   msg, prev   this message and the one before it (to group bubbles from the same person)
//   chat        the chat it belongs to          state / actions   shared chat state and changes
export default function MessageItem({ msg, prev, index, chat, state, actions, myPhoto }) {
  const mine = msg.by === 'maya'
  const system = !msg.by
  // Bubbles from the same person in a row sit closer together and only show the avatar once.
  const sameAsPrev = prev && prev.by === msg.by && !msg.d && !prev.kind && !msg.kind
  const showName = !mine && !system && chat.type !== 'direct' && !sameAsPrev
  const key = `${chat.id}:${index}`
  const reactOpen = state.react === key
  const evKey = `${chat.id}:${index}`

  const content = (
    <>
      {!msg.kind && <Bubble msg={msg} mine={mine} onReact={() => actions.openReact(key)} onReply={() => actions.reply(msg)} />}
      {msg.kind === 'event' && (
        <>
          {msg.text && (
            <div className={`px-3.5 py-2.5 text-[14px] leading-[1.4] ${mine ? 'rounded-[18px_18px_4px_18px] bg-acc text-acc-ink' : 'rounded-[18px_18px_18px_4px] bg-sf2 text-ink'}`}>
              {msg.text}
            </div>
          )}
          <EventCard
            evKey={msg.ev}
            going={!!state.going[evKey]}
            onGo={() => actions.toggleGoing(evKey)}
            joined={state.joinedGroups.includes(msg.ev)}
            onJoin={() => actions.toggleJoinGroup(msg.ev)}
            myPhoto={myPhoto}
          />
        </>
      )}
      {msg.kind === 'loc' && <LocationCard text={msg.text} sub={msg.sub} />}
    </>
  )

  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`} style={{ marginTop: sameAsPrev ? 2 : 10 }}>
      {msg.d && <div className="self-center pt-2 pb-1 text-[11px] text-mute">{msg.d}</div>}

      {system && <SystemCard msg={msg} chat={chat} state={state} actions={actions} myPhoto={myPhoto} />}

      {!mine && !system && (
        <div className="flex max-w-[88%] items-end gap-2">
          <div className="h-7 w-7 flex-none rounded-full" style={{ background: avatarBg(msg.by, myPhoto), opacity: sameAsPrev ? 0 : 1 }} />
          <div className="flex min-w-0 flex-col gap-[3px]">
            {showName && (
              <div className="flex items-center gap-1 pl-1 text-[11px] font-semibold text-mute">
                {nameOf(msg.by)}
                {ALUMNI.includes(msg.by) && <span className="h-[7px] w-[7px] rounded-full bg-blue" />}
              </div>
            )}
            {content}
            <Reactions msg={msg} open={reactOpen} onPick={(e) => actions.react(chat, index, e)} />
          </div>
        </div>
      )}

      {mine && (
        <div className="flex max-w-[88%] flex-col items-end gap-[3px]">
          {content}
          <div className="flex items-center gap-1 pr-1 text-[10px] text-mute">
            <span>{msg.ago}</span>
            {msg.read && (
              // Two ticks = they have read it.
              <svg width="14" height="10" viewBox="0 0 16 10" fill="none" stroke="var(--acc)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Read">
                <path d="M1 5l3 3 6-7M7 8l1 1 6-8" />
              </svg>
            )}
          </div>
          <Reactions msg={msg} open={reactOpen} onPick={(e) => actions.react(chat, index, e)} />
        </div>
      )}
    </div>
  )
}
