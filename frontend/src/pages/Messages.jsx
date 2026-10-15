// 15 · Messages
// Group chats (events, societies, UCL Careers) and one-to-one chats with mutual connections.
// Tapping a chat opens it in a sheet. Messages you send stay in this browser tab only (no back end yet).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import conversations, { starter } from '../data/messages.js'

const FILTERS = [
  ['All', null],
  ['Direct', 'direct'],
  ['Groups', 'group'],
  ['Societies', 'society'],
  ['Events', 'event'],
]

// The round or rounded-square picture on the left of each chat.
function ChatAvatar({ chat }) {
  if (chat.avatar === 'date')
    return <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-hero text-[11px] font-semibold text-white">{chat.dateNum}</div>
  if (chat.avatar === 'flag')
    return (
      <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-sf2 text-acc">
        <Icon name="flag" size={20} />
      </div>
    )
  if (chat.avatar === 'friend') return <div className="h-[50px] w-[50px] flex-none rounded-full" style={{ background: 'repeating-linear-gradient(135deg,#EEDEFF 0 4px,#DDBDFF 4px 8px)' }} />
  if (chat.avatar === 'person') return <div className="stripes h-[50px] w-[50px] flex-none rounded-full" />
  return <div className="h-[50px] w-[50px] flex-none rounded-full bg-sf2" />
}

export default function Messages() {
  const [filter, setFilter] = useState(null)
  // A copy of the conversations we can change (new messages, read/unread) during this visit.
  const [chats, setChats] = useState(conversations)
  const [openId, setOpenId] = useState(null)
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)
  const [starterUsed, setStarterUsed] = useState(false)

  const open = chats.find((c) => c.id === openId)
  const list = chats.filter((c) => !filter || c.kind === filter)

  const openChat = (id, text = '') => {
    setOpenId(id)
    setDraft(text)
    setComposing(false)
    setChats((all) => all.map((c) => (c.id === id ? { ...c, unread: false } : c))) // opening marks it as read
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setChats((all) => all.map((c) => (c.id === openId ? { ...c, time: 'now', thread: [...c.thread, { from: 'me', text }] } : c)))
    setDraft('')
  }

  // The grey line under the name: the last message (with the sender's name in group chats).
  const preview = (chat) => {
    if (chat.preview) return chat.preview
    const last = chat.thread[chat.thread.length - 1]
    if (!last) return ''
    if (last.from === 'me') return `You: ${last.text}`
    return chat.kind === 'direct' || last.from === chat.name ? last.text : (
      <>
        <b className="text-ink">{last.from}:</b> {last.text}
      </>
    )
  }

  return (
    <Screen tabs>
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">Messages</h1>
        <button type="button" onClick={() => setComposing(true)} aria-label="New message" className="flex h-10 w-10 items-center justify-center rounded-full bg-sf text-ink shadow-ring">
          <Icon name="pencil" size={20} />
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mt-3.5 flex flex-none gap-1.5 overflow-x-auto px-5 text-[12px]">
        {FILTERS.map(([label, kind]) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(kind)}
            className={`flex-none rounded-full px-3 py-[7px] whitespace-nowrap ${filter === kind ? 'bg-acc font-semibold text-acc-ink' : 'bg-sf shadow-ring'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conversation starter for a new match */}
      {!starterUsed && (
        <div className="mt-4 flex flex-none items-start gap-3 rounded-[20px] bg-sf2 px-4 py-3.5">
          <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-blue" />
          <div className="flex-1">
            <div className="text-[11px] font-semibold tracking-[.08em] text-mute uppercase">New match · conversation starter</div>
            <div className="mt-1 text-[14px] leading-[1.45]">{starter.text}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStarterUsed(true)
              openChat(starter.conversationId, starter.message)
            }}
            className="flex h-8 flex-none items-center rounded-full bg-cta px-3 text-[12px] font-semibold text-cta-ink"
          >
            Use
          </button>
        </div>
      )}

      <div className="mt-3.5 flex flex-none flex-col">
        {list.map((chat, i) => (
          <button
            key={chat.id}
            type="button"
            onClick={() => openChat(chat.id)}
            className={`flex items-center gap-3 px-1 py-3 text-left ${i < list.length - 1 ? 'border-b border-line' : ''}`}
          >
            <ChatAvatar chat={chat} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{chat.name}</span>
                <span className={`flex-none text-[11px] ${chat.unread ? 'font-semibold text-acc' : 'text-mute'}`}>{chat.time}</span>
              </div>
              <div className={`mt-0.5 truncate text-[13px] ${chat.unread ? 'text-ink' : 'text-mute'}`}>{preview(chat)}</div>
            </div>
            {chat.unread && <span className="h-2.5 w-2.5 flex-none rounded-full bg-acc" />}
            {chat.locked && <Icon name="lock" size={16} className="flex-none text-mute" />}
          </button>
        ))}
        {list.length === 0 && <div className="py-8 text-center text-[14px] text-mute">No chats here yet.</div>}
      </div>

      {/* An open chat */}
      <BottomSheet
        open={!!open}
        title={open?.name}
        subtitle={open?.kind === 'direct' ? 'Mutual connection' : open?.locked ? 'Members only' : 'Group chat'}
        onClose={() => setOpenId(null)}
        footer={
          open &&
          !open.locked && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Message"
                aria-label="Message"
                className="h-12 min-w-0 flex-1 rounded-full bg-sf px-4 text-[15px] text-ink shadow-ring outline-none placeholder:text-mute"
              />
              <button type="button" onClick={send} aria-label="Send" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-acc text-acc-ink">
                <Icon name="arrow-right" size={20} />
              </button>
            </div>
          )
        }
      >
        {open?.locked ? (
          <div className="flex flex-col items-start gap-3 pb-2 text-[14px] leading-normal text-mute">
            <p>This channel is only for society members. Join the society to read and post.</p>
            <Link to="/societies" className="flex h-10 items-center rounded-full bg-cta px-4 text-[14px] font-semibold text-cta-ink">
              Find the society
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {open?.thread.map((m, i) => (
              <div key={i} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${m.from === 'me' ? 'self-end bg-acc text-acc-ink' : 'self-start bg-sf shadow-ring'}`}>
                {m.from !== 'me' && open.kind !== 'direct' && <div className="text-[11px] font-semibold text-acc">{m.from}</div>}
                {m.text}
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* New message: one-to-one chats are only possible with mutual connections */}
      <BottomSheet open={composing} title="New message" subtitle="You can message people once you're both connected." onClose={() => setComposing(false)}>
        <div className="flex flex-col pb-2">
          {chats
            .filter((c) => c.kind === 'direct')
            .map((c) => (
              <button key={c.id} type="button" onClick={() => openChat(c.id)} className="flex items-center gap-3 border-b border-line py-3 text-left">
                <ChatAvatar chat={c} />
                <span className="text-[15px] font-semibold">{c.name.split(' · ')[0]}</span>
              </button>
            ))}
          <Link to="/connections" className="mt-3 text-[14px] font-semibold text-acc">
            See all connections ›
          </Link>
        </div>
      </BottomSheet>
    </Screen>
  )
}
