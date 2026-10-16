// The full-screen chat that opens over the Messages list.
// It draws one of four layouts, like the design:
//   direct   one-to-one chat with a person
//   group    an Event Group, with the event pinned on top
//   society  a society's home: Announcements, General and channels (members only until you join)
//   channel  inside a society: Announcements (only the committee can post) or General
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ALUMNI, GROUP_MEMBERS, PEOPLE } from '../../data/messages.js'
import { CAT, EVENTS } from '../../data/memories.js'
import Icon from '../Icon.jsx'
import Sheet from '../onboarding/Sheet.jsx'
import { avatarBg, nameOf } from './avatar.js'
import MessageItem from './MessageItem.jsx'

// The round back button used in every chat header.
function Back({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sf text-mute shadow-ring">
      <Icon name="back" size={20} />
    </button>
  )
}

// The picture in a chat header: round photo (person), purple day tile (event group) or flag (society).
function HeaderPicture({ chat, channel, myPhoto }) {
  if (chat.type === 'direct')
    return (
      <div className="relative h-10 w-10 flex-none rounded-full" style={{ background: avatarBg(chat.person ?? chat.id, myPhoto) }}>
        {ALUMNI.includes(chat.person ?? chat.id) && <div className="absolute -right-px -bottom-px h-3 w-3 rounded-full border-2 border-bg bg-blue" />}
      </div>
    )
  if (chat.type === 'group')
    return <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-hero text-[12px] font-semibold text-white">{chat.day}</div>
  return (
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sf2 text-acc">
      {channel ? <Icon name="chat" size={18} /> : <Icon name="flag" size={18} />}
    </div>
  )
}

// The bottom bar: reply preview, the "+" tray (event / photo / location) and the text box.
function Composer({ state, actions, canPost, adminOnly }) {
  return (
    <div className="flex-none border-t border-line bg-bg px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
      {state.reply && (
        <div className="mb-1.5 flex items-center justify-between border-l-2 border-acc px-2 pt-1 pb-2 text-[12px] text-mute">
          <span className="truncate">Replying · {state.reply}</span>
          <button type="button" onClick={actions.cancelReply} className="ml-2 flex-none font-semibold text-acc">
            Cancel
          </button>
        </div>
      )}
      {state.plus && (
        <div className="mb-2 flex gap-2 text-[12px] font-semibold">
          {[
            ['📅', 'Share event', actions.openPicker],
            ['📷', 'Photo', actions.sharePhoto],
            ['📍', 'Location', actions.shareLocation],
          ].map(([emoji, label, onClick]) => (
            <button key={label} type="button" onClick={onClick} className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[14px] bg-sf shadow-ring">
              <span className="text-[18px]">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      )}
      {canPost && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={actions.togglePlus} aria-label="Share" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sf text-[20px] text-ink shadow-ring">
            +
          </button>
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-sf px-4 shadow-ring">
            <input
              value={state.text}
              placeholder="Message"
              onChange={(e) => actions.setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && actions.send()}
              className="h-11 min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
            />
          </div>
          <button
            type="button"
            onClick={() => actions.send()}
            aria-label="Send"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-cta text-cta-ink transition-opacity"
            style={{ opacity: state.text.trim() ? 1 : 0.45 }}
          >
            <Icon name="arrow-right" size={20} />
          </button>
        </div>
      )}
      {adminOnly && <div className="flex h-11 items-center justify-center rounded-full bg-sf text-[13px] text-mute">🔒 Only admins can send messages</div>}
    </div>
  )
}

// A society's home screen: who it is, a members-only lock, then Announcements, General and channels.
function SocietyHome({ chat, joined, actions }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1.5 pb-10">
      {!joined && (
        <div className="mb-2 flex flex-col items-center gap-2.5 rounded-[20px] bg-sf p-[18px] text-center shadow-ring">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sf2 text-mute">
            <Icon name="lock" size={22} />
          </div>
          <div className="font-display text-[22px]">Members only</div>
          <div className="text-[13px] leading-[1.45] text-mute">{chat.members} members · join to read Announcements, General and the channels below.</div>
          <button type="button" onClick={actions.joinSociety} className="flex h-11 items-center rounded-full bg-cta px-[22px] text-[14px] font-semibold text-cta-ink">
            Join society
          </button>
        </div>
      )}
      <ChannelRow emoji="📣" tile="bg-acc" title="Announcements" pinned last={chat.ann.length ? chat.ann[chat.ann.length - 1].text : 'No announcements yet'} onClick={() => actions.openChannel('ann')} />
      <ChannelRow
        emoji="💬"
        title="General"
        last={chat.general.length ? `${nameOf(chat.general[chat.general.length - 1].by).split(' ')[0]}: ${chat.general[chat.general.length - 1].text}` : 'Say hi to the society'}
        onClick={() => actions.openChannel('general')}
      />
      <div className="mt-3.5 px-1 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Channels</div>
      {chat.channels.map(([emoji, name, last, unread]) => (
        <ChannelRow
          key={name}
          emoji={emoji}
          title={name}
          last={joined ? last || 'No messages yet' : 'Join to see this channel'}
          unread={joined ? unread : 0}
          faded={!joined}
          onClick={joined ? () => actions.openChannel('general') : undefined}
        />
      ))}
    </div>
  )
}

function ChannelRow({ emoji, tile = 'bg-sf2', title, last, pinned, unread = 0, faded, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 border-b border-line px-1 py-3 text-left ${faded ? 'opacity-60' : ''}`}>
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[18px] ${tile}`}>{emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold">{title}</span>
          {pinned && <span className="text-[10px] text-mute">📌 pinned</span>}
        </div>
        <div className="truncate text-[12px] text-mute">{last}</div>
      </div>
      {unread > 0 && (
        <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-acc px-1.5 text-[11px] font-semibold text-acc-ink">{unread}</div>
      )}
    </button>
  )
}

// The event pinned at the top of a group chat, with a countdown and directions link.
function PinnedEvent({ chat }) {
  const ev = EVENTS[chat.ev]
  if (!ev) return null
  return (
    <div className="flex flex-none overflow-hidden rounded-[18px] bg-sf shadow-ring">
      <div className="w-2.5 flex-none" style={{ background: CAT[ev.cat][0] }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] leading-[1.25] font-semibold">📌 {ev.title}</div>
          <span className="rounded-full bg-acc px-2 py-[3px] text-[10px] font-bold whitespace-nowrap text-acc-ink">{chat.countdown}</span>
        </div>
        <div className="text-[11px] text-mute">
          {ev.date} · {ev.time} · {ev.place}
        </div>
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(ev.place + ', London')}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-7 items-center self-start rounded-full border-[1.5px] border-acc px-3 text-[11px] font-semibold text-acc"
        >
          Get directions
        </a>
      </div>
    </div>
  )
}

export default function ChatScreen({ chat, state, actions, myPhoto }) {
  const isSociety = chat.type === 'society'
  const joined = isSociety && (!chat.locked || state.joinedSocieties.includes(chat.id))
  const channel = isSociety ? state.channel : null
  const messages = isSociety ? (channel === 'ann' ? chat.ann : chat.general) : chat.msgs

  // Who can type here: anyone in a person or group chat; in a society only in General once you've joined.
  const canPost = !isSociety || (channel === 'general' && joined)
  const adminOnly = isSociety && channel === 'ann' && chat.role !== 'Committee'

  // Keep the newest message in view.
  const endRef = useRef(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, chat.id, channel])

  const title = channel === 'ann' ? '📣 Announcements' : channel === 'general' ? '💬 General' : chat.name
  const sub = isSociety ? `Society · ${chat.members} members` : chat.sub
  const role = isSociety ? (state.joinedSocieties.includes(chat.id) ? 'Member' : chat.role || 'Not a member') : ''

  const infoMembers = chat.type === 'direct' ? [chat.person ?? chat.id] : GROUP_MEMBERS

  return (
    // "fixed" so it covers the list and the tab bar, inside the phone-width column.
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-[402px] flex-col bg-bg pt-[max(20px,env(safe-area-inset-top))] text-ink" style={{ animation: 'larpIn .2s both' }} onClick={actions.clearReact}>
      {/* Header */}
      {isSociety && !channel ? (
        <div className="flex flex-none items-center gap-2.5 px-4 pt-1 pb-2.5">
          <Back onClick={actions.close} />
          <HeaderPicture chat={chat} myPhoto={myPhoto} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{chat.name}</div>
            <div className="text-[11px] text-mute">{sub}</div>
          </div>
          <span className="rounded-full bg-sf2 px-2 py-[3px] text-[10px] font-semibold text-acc">{role}</span>
        </div>
      ) : (
        <div className="flex flex-none items-center gap-2.5 border-b border-line px-4 pt-1 pb-2.5">
          <Back onClick={channel ? actions.backToSociety : actions.close} />
          <button type="button" onClick={actions.toggleInfo} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <HeaderPicture chat={chat} channel={channel} myPhoto={myPhoto} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{title}</div>
              <div className="text-[11px] text-mute">{sub}</div>
            </div>
          </button>
        </div>
      )}

      {/* Body */}
      {isSociety && !channel ? (
        <SocietyHome chat={chat} joined={joined} actions={actions} />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2.5">
            {chat.type === 'group' && <PinnedEvent chat={chat} />}
            {chat.spotLeft && (
              <div className="mt-2 flex flex-none items-center justify-between gap-2 rounded-[14px] bg-sf2 px-3 py-2.5 text-[12px]">
                <span>
                  <b>1 spot left</b> · share this group
                </span>
                <button type="button" onClick={actions.shareGroup} className="flex h-[30px] items-center gap-1.5 rounded-full bg-cta px-3 font-semibold text-cta-ink">
                  <Icon name="link" size={14} />
                  Share
                </button>
              </div>
            )}
            {chat.formed && <div className="mt-3 self-center rounded-full bg-sf px-3 py-1.5 text-center text-[11px] text-mute">{chat.formed}</div>}

            {messages.map((m, i) => (
              <MessageItem key={i} msg={m} prev={messages[i - 1]} index={i} chat={chat} state={state} actions={actions} myPhoto={myPhoto} />
            ))}

            {chat.typing && !isSociety && <div className="px-1 pt-2.5 text-[11px] text-mute">{nameOf(chat.person ?? chat.id).split(' ')[0]} is typing…</div>}

            {/* After you check in at the Deloitte evening, LARP asks you to save a memory. */}
            {chat.id === 'deloitte' && state.here.includes('deloitte') && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-sf2 px-3.5 py-3 text-[12px]">
                <span>
                  How was it? <b>Add a photo to your Memories</b>
                </span>
                <Link to="/profile?memory=m2" className="flex h-[30px] flex-none items-center rounded-full bg-cta px-3 font-semibold text-cta-ink">
                  Open
                </Link>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <Composer state={state} actions={actions} canPost={canPost} adminOnly={adminOnly} />
        </>
      )}

      {/* Who's in this chat */}
      {state.info && (
        <Sheet title={title} onClose={actions.toggleInfo} maxHeight="60%">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {infoMembers
              .filter((p) => PEOPLE[p] || p === 'maya')
              .map((p) => (
                <div key={p} className="flex items-center gap-3 border-b border-line py-2.5">
                  <div className="h-9 w-9 flex-none rounded-full" style={{ background: avatarBg(p, myPhoto) }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold">{nameOf(p)}</div>
                    <div className="text-[12px] text-mute">{p === 'maya' ? 'You' : PEOPLE[p][2]}</div>
                  </div>
                </div>
              ))}
          </div>
        </Sheet>
      )}

      {/* Pick an event to share */}
      {state.picker && (
        <Sheet title="Share an event" onClose={actions.closePicker} maxHeight="72%">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {Object.entries(EVENTS).map(([key, ev]) => (
              <button key={key} type="button" onClick={() => actions.shareEvent(key)} className="flex min-h-14 w-full items-center gap-3 border-b border-line px-0.5 py-2 text-left">
                <div className="h-3 w-3 flex-none rounded" style={{ background: CAT[ev.cat][0] }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] leading-[1.3] font-semibold">{ev.title}</div>
                  <div className="text-[12px] text-mute">
                    {ev.date} · {ev.time} · {ev.place}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
