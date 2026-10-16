// 15 · Messages
// One list of chats (people, Event Groups, societies) and one chat screen that opens over it.
// Only mutual connections can message one-to-one, and every Event Group has its own chat.
//
// Everything you send, react or vote on stays in memory for this visit only (there is no back end yet).
// A chat can be opened from another screen with /messages?chat=<id>, e.g. /messages?chat=deloitte.
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import ChatScreen from '../components/messages/ChatScreen.jsx'
import { DEFAULT_PHOTO, avatarBg, nameOf } from '../components/messages/avatar.js'
import { Chip, ChipRow } from '../components/ui.jsx'
import Sheet from '../components/onboarding/Sheet.jsx'
import conversations, { PEOPLE, agoLabel, starter } from '../data/messages.js'
import { EVENTS } from '../data/memories.js'
import { useProfile } from '../profileStore.jsx'

const FILTERS = ['All', 'Direct', 'Groups', 'Societies', 'Events']

// Does a chat belong under the picked filter chip?
function passes(chat, filter) {
  if (filter === 'All') return true
  if (filter === 'Direct') return chat.type === 'direct'
  if (filter === 'Groups') return chat.type === 'group'
  if (filter === 'Societies') return chat.type === 'society'
  // Events = Event Groups, plus chats where someone shared an event.
  return chat.type === 'group' || (chat.msgs ?? []).some((m) => m.kind === 'event')
}

// The current time as "14:05", for messages you send.
function timeNow() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// The grey preview line under a chat's name.
function previewOf(chat) {
  if (chat.type === 'society') return { prefix: '', text: chat.lastText }
  const last = chat.msgs[chat.msgs.length - 1]
  if (!last) return { prefix: '', text: '' }
  const text = last.kind === 'event' ? `📅 ${EVENTS[last.ev]?.title ?? 'Event'}` : last.kind === 'loc' ? `📍 ${last.text}` : last.text || ''
  if (last.by === 'maya') return { prefix: 'You: ', text }
  if (last.by && chat.type !== 'direct') return { prefix: `${nameOf(last.by).split(' ')[0]}: `, text }
  return { prefix: '', text }
}

// The picture on the left of each chat row.
function RowPicture({ chat, myPhoto }) {
  if (chat.type === 'direct') return <div className="h-[50px] w-[50px] flex-none rounded-full" style={{ background: avatarBg(chat.person ?? chat.id, myPhoto) }} />
  if (chat.type === 'group')
    return <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-hero text-[11px] font-semibold text-white">{chat.day}</div>
  return (
    <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl bg-sf2 text-acc">
      <Icon name="flag" size={20} />
    </div>
  )
}

export default function Messages() {
  const { profile } = useProfile()
  const myPhoto = (profile.photos ?? [DEFAULT_PHOTO])[0]
  const [params, setParams] = useSearchParams()
  const openId = params.get('chat')

  const [filter, setFilter] = useState('All')
  const [chats, setChats] = useState(conversations) // our own copy, so we can add messages
  const [composing, setComposing] = useState(false) // the pencil's "new message" sheet
  // Everything about the open chat screen.
  const [state, setState] = useState({
    channel: null, // in a society: null (its home), 'ann' or 'general'
    text: '',
    reply: null,
    react: null, // which message has its emoji picker open
    plus: false, // the + tray
    picker: false, // the "Share an event" sheet
    info: false, // the members sheet
    going: {}, // event cards you tapped "I'm going" on
    joinedGroups: [], // event groups you joined from a card
    joinedSocieties: [],
    here: [], // group chats where you tapped "I'm here"
    votes: {}, // chat id -> option you voted for
  })
  const reactOpenedAt = useRef(0)
  const set = (patch) => setState((s) => ({ ...s, ...patch }))

  const chat = chats.find((c) => c.id === openId)

  const openChat = (id, text = '') => {
    setParams({ chat: id })
    set({ channel: null, text, reply: null, react: null, plus: false, picker: false, info: false })
    setChats((all) => all.map((c) => (c.id === id ? { ...c, unread: 0 } : c))) // opening marks it read
  }

  // Adds a message from you to the open chat and moves the chat to the top of the list.
  const send = (extra) => {
    if (!chat) return
    const text = state.text.trim()
    if (!text && !extra) return
    const msg = { by: 'maya', text, ago: timeNow(), quote: state.reply ?? undefined, ...extra }
    const field = chat.type === 'society' ? 'general' : 'msgs'
    const updated = { ...chat, [field]: [...chat[field], msg], minutesAgo: 0, unread: 0 }
    setChats((all) => [updated, ...all.filter((c) => c.id !== chat.id)])
    set({ text: '', reply: null, plus: false, picker: false })
  }

  // Changes one message (used for emoji reactions).
  const changeMessage = (target, index, change) => {
    const field = target.type === 'society' ? (state.channel === 'ann' ? 'ann' : 'general') : 'msgs'
    setChats((all) => all.map((c) => (c.id === target.id ? { ...c, [field]: c[field].map((m, i) => (i === index ? change(m) : m)) } : c)))
  }

  const actions = {
    close: () => {
      setParams({})
      set({ channel: null, info: false, react: null, reply: null, plus: false, picker: false })
    },
    setText: (text) => set({ text, plus: false }),
    send,
    togglePlus: () => set({ plus: !state.plus }),
    openPicker: () => set({ picker: true, plus: false }),
    closePicker: () => set({ picker: false }),
    shareEvent: (key) => send({ kind: 'event', ev: key, text: state.text.trim() || 'Fancy this?' }),
    sharePhoto: () => send({ text: '📷 Photo' }),
    shareLocation: () => send({ kind: 'loc', text: 'Costa Coffee · Marshgate, UCL East', sub: 'Shared location' }),
    reply: (m) => set({ reply: `${m.by === 'maya' ? 'You' : nameOf(m.by)}: ${(m.text || 'event').slice(0, 60)}`, react: null }),
    cancelReply: () => set({ reply: null }),
    openReact: (key) => {
      reactOpenedAt.current = Date.now()
      set({ react: key })
    },
    // A tap anywhere closes the emoji picker (but not the tap that just opened it).
    clearReact: () => {
      if (state.react && Date.now() - reactOpenedAt.current > 300) set({ react: null })
    },
    react: (target, index, emoji) => {
      changeMessage(target, index, (m) => ({ ...m, re: [...(m.re ?? []), emoji] }))
      set({ react: null })
    },
    toggleGoing: (key) => set({ going: { ...state.going, [key]: !state.going[key] } }),
    toggleJoinGroup: (ev) =>
      set({ joinedGroups: state.joinedGroups.includes(ev) ? state.joinedGroups.filter((x) => x !== ev) : [...state.joinedGroups, ev] }),
    toggleHere: (id) => set({ here: state.here.includes(id) ? state.here.filter((x) => x !== id) : [...state.here, id] }),
    vote: (id, option) => set({ votes: { ...state.votes, [id]: option } }),
    toggleInfo: () => set({ info: !state.info }),
    openChannel: (channel) => set({ channel }),
    backToSociety: () => set({ channel: null }),
    joinSociety: () => {
      set({ joinedSocieties: [...state.joinedSocieties, chat.id] })
      setChats((all) =>
        all.map((c) =>
          c.id === chat.id ? { ...c, ...c.onJoin, last: 'General', lastText: `You joined ${c.name}`, role: 'Member' } : c,
        ),
      )
    },
    shareGroup: () => set({ text: 'One spot left in our Bending Spoons group — who’s in?' }),
  }

  const rows = chats.filter((c) => passes(c, filter))
  // People you can start a new chat with: everyone you already message one-to-one.
  const directContacts = chats.filter((c) => c.type === 'direct')

  return (
    <Screen tabs>
      <div className="flex items-center justify-between px-1 pt-1">
        <h1 className="font-display text-[28px] font-normal">Messages</h1>
        <button type="button" onClick={() => setComposing(true)} aria-label="New message" className="flex h-10 w-10 items-center justify-center rounded-full bg-sf text-ink shadow-ring">
          <Icon name="pencil" size={20} />
        </button>
      </div>

      <ChipRow className="mt-3.5">
        {FILTERS.map((f) => (
          <Chip key={f} small on={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </ChipRow>

      {/* Claude's conversation starter for a new match */}
      <div className="mt-4 flex items-start gap-3 rounded-[20px] bg-sf2 px-4 py-3.5">
        <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-blue" />
        <div className="flex-1">
          <div className="text-[11px] font-semibold tracking-[.08em] text-mute uppercase">New match · conversation starter</div>
          <div className="mt-1 text-[14px] leading-[1.45]">{starter.text}</div>
        </div>
        <button type="button" onClick={() => openChat(starter.chatId, starter.draft)} className="flex h-8 flex-none items-center rounded-full bg-cta px-3 text-[12px] font-semibold text-cta-ink">
          Use
        </button>
      </div>

      {/* The chat list */}
      <div className="mt-3.5 flex flex-col">
        {rows.map((c) => {
          const { prefix, text } = previewOf(c)
          const locked = c.locked && !state.joinedSocieties.includes(c.id)
          return (
            <button key={c.id} type="button" onClick={() => openChat(c.id)} className="flex w-full items-center gap-3 border-b border-line px-1 py-3 text-left">
              <RowPicture chat={c} myPhoto={myPhoto} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{c.type === 'society' ? `${c.name} · ${c.last}` : c.name}</span>
                  <span className={`flex-none text-[11px] font-semibold ${c.unread ? 'text-acc' : 'text-mute'}`}>{agoLabel(c.minutesAgo)}</span>
                </div>
                <div className="mt-0.5 truncate text-[13px] text-mute">
                  <b className="text-ink">{prefix}</b>
                  {text}
                </div>
              </div>
              {c.unread > 0 && <div className="h-2.5 w-2.5 flex-none rounded-full bg-acc" aria-label="Unread" />}
              {locked && <Icon name="lock" size={16} className="flex-none text-mute" />}
            </button>
          )
        })}
        {rows.length === 0 && <div className="py-10 text-center text-[14px] text-mute">No chats here yet.</div>}
      </div>

      {chat && <ChatScreen chat={chat} state={state} actions={actions} myPhoto={myPhoto} />}

      {/* The pencil: start a chat with one of your connections */}
      {composing && (
        <Sheet title="New message" onClose={() => setComposing(false)} maxHeight="60%">
          <div className="px-5 pb-2 text-[13px] text-mute">One-to-one chats open once you both accept a connection.</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {directContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setComposing(false)
                  openChat(c.id)
                }}
                className="flex w-full items-center gap-3 border-b border-line py-2.5 text-left"
              >
                <div className="h-9 w-9 flex-none rounded-full" style={{ background: avatarBg(c.person ?? c.id, myPhoto) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[12px] text-mute">{PEOPLE[c.person ?? c.id]?.[2] ?? c.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </Screen>
  )
}
