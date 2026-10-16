// Plans (booked events coming up) and Memories (events you went to) on the Profile screen,
// plus their full-screen views and the single-memory page.
//
// Memories look like a little stack of polaroids: swipe or use the arrows to flip through,
// tap the top one to open it. Each memory can hold up to 6 photos and a note.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAT, MEMORIES } from '../../data/memories.js'
import { PEOPLE } from '../../data/messages.js'
import Icon from '../Icon.jsx'
import { avatarBg } from '../messages/avatar.js'
import { memoryView } from './planData.js'
import { PhotoPicker } from './Photos.jsx'

// The diagonal shine used on every coloured event strip.
const SHINE = 'repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 6px,transparent 6px 16px)'

function Avatars({ ids, myPhoto, size = 20, border = 'var(--sf)' }) {
  return (
    <div className="flex" style={{ paddingLeft: size === 28 ? 8 : 6 }}>
      {ids.map((p, i) => (
        <div key={p + i} className="flex-none rounded-full" style={{ width: size, height: size, marginLeft: size === 28 ? -8 : -6, border: `2px solid ${border}`, background: avatarBg(p, myPhoto) }} />
      ))}
    </div>
  )
}

// One booked event card. "Today" cards glow.
export function PlanCard({ plan, myPhoto, wide = false }) {
  const navigate = useNavigate()
  const [bg, ink] = CAT[plan.ev.cat]
  const today = plan.daysAway === 0
  return (
    <div
      className={`relative flex flex-none snap-start flex-col overflow-hidden rounded-[20px] bg-sf ${wide ? 'w-full' : 'w-[200px]'}`}
      style={{ boxShadow: today ? '0 0 0 1.5px var(--acc),0 0 24px rgba(153,59,255,.45)' : 'var(--ring)' }}
    >
      <div className="relative flex h-16 items-end px-3 py-2.5" style={{ background: bg, color: ink }}>
        <div className="absolute inset-0" style={{ background: SHINE }} />
        <span className="relative text-[10px] font-bold tracking-[.06em] uppercase">{plan.ev.cat}</span>
        <span className="absolute top-2 right-2 rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-plum">{plan.countdown}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2.5 pb-3">
        <div className="line-clamp-2 text-[13px] leading-[1.25] font-semibold">{plan.ev.title}</div>
        <div className="text-[11px] text-mute">
          {plan.ev.date} · {plan.ev.time}
        </div>
        <div className="mt-auto flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {plan.avatars.length > 0 && <Avatars ids={plan.avatars} myPhoto={myPhoto} />}
            <span className="truncate text-[11px] text-mute">{plan.whoLine}</span>
          </div>
          {plan.chat && (
            <button
              type="button"
              onClick={() => navigate(`/messages?chat=${plan.chat}`)}
              aria-label="Open the group chat"
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border-[1.5px] border-line text-ink"
            >
              <Icon name="chat" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// The small heading with a round arrow button ("PLANS upcoming   ›").
export function RowHeading({ title, sub, onOpen }) {
  return (
    <div className="mt-[22px] flex flex-none items-center justify-between border-b border-line px-1 pb-2.5">
      <div className="flex items-baseline gap-2">
        <div className="text-[12px] font-bold tracking-[.1em] uppercase">{title}</div>
        <span className="text-[11px] text-mute">{sub}</span>
      </div>
      <button type="button" onClick={onOpen} aria-label={`See all ${title.toLowerCase()}`} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf text-ink shadow-ring">
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  )
}

// The polaroid stack. index = which memory is on top.
export function MemoryStack({ memories, index, setIndex, onOpen, myPhoto }) {
  const [leaving, setLeaving] = useState(null) // the card flying off to the right
  const startX = useRef(null)
  const n = memories.length
  if (!n) return null

  const next = () => {
    setLeaving(memories[index].id)
    setTimeout(() => setIndex((index + 1) % n), 230)
    setTimeout(() => setLeaving(null), 700)
  }
  const prev = () => setIndex((index - 1 + n) % n)

  // Card positions: the top one straight, the next two tilted behind it.
  const POS = [
    ['translate(0,0) rotate(0deg) scale(1)', 1],
    ['translate(8px,-6px) rotate(4deg) scale(.95)', 0.82],
    ['translate(-6px,-12px) rotate(-3deg) scale(.9)', 0.64],
  ]
  const order = Array.from({ length: n }, (_, k) => memories[(index + k) % n])

  return (
    <>
      <div
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          const d = e.clientX - (startX.current ?? e.clientX)
          if (d < -40) next()
          else if (d > 40) prev()
          else if (Math.abs(d) < 8) onOpen(memories[index].id)
        }}
        className="relative mt-4 h-[330px] flex-none cursor-pointer select-none"
        style={{ touchAction: 'pan-y' }}
        role="button"
        aria-label={`Open memory: ${memories[index].title}`}
      >
        {order
          .map((m, k) => {
            let transform = POS[Math.min(k, 2)][0]
            let opacity = k < 3 ? POS[k][1] : 0
            let z = 30 - k
            if (leaving === m.id && k === n - 1) {
              transform = 'translate(260px,0) rotate(14deg) scale(.9)'
              opacity = 0.5
              z = 0
            }
            return (
              <div
                key={m.id}
                className="pointer-events-none absolute top-1.5 left-1/2 -ml-[110px] w-[220px] rounded-md bg-[#FAFAFA] px-2.5 pt-2.5 pb-3 text-plum shadow-[0_10px_30px_rgba(20,8,40,.35)]"
                style={{ zIndex: z, transform, opacity, transformOrigin: '50% 60%', transition: k < 3 || leaving === m.id ? 'transform .45s cubic-bezier(.2,.8,.3,1),opacity .45s' : 'none' }}
              >
                <div className="relative aspect-square rounded-[3px]" style={{ background: m.cover }}>
                  <div className="absolute bottom-2 left-2">
                    <Avatars ids={m.met} myPhoto={myPhoto} size={22} border="#FAFAFA" />
                  </div>
                </div>
                <div className="mt-2.5 truncate font-display text-[17px] leading-[1.1] italic">{m.title}</div>
                <div className="mt-0.5 text-[11px] text-[#7A6796]">{m.date}</div>
              </div>
            )
          })
          .reverse()}
      </div>
      <div className="flex flex-none items-center justify-center gap-3.5 text-[12px] text-mute">
        <button type="button" onClick={prev} aria-label="Previous memory" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf shadow-ring">
          <Icon name="back" size={16} />
        </button>
        <span>
          {index + 1} of {n} · swipe or tap to open
        </span>
        <button type="button" onClick={next} aria-label="Next memory" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sf shadow-ring">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </>
  )
}

// A full-screen page over Profile with a back button and a small title.
export function FullPage({ title, onBack, children, z = 'z-40' }) {
  return (
    <div className={`fixed inset-0 ${z} mx-auto flex w-full max-w-[402px] flex-col bg-bg pt-[max(20px,env(safe-area-inset-top))] text-ink`} style={{ animation: 'larpIn .25s both' }}>
      <div className="flex h-11 flex-none items-center justify-between px-4 pt-1">
        <button type="button" onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-sf text-mute shadow-ring">
          <Icon name="back" size={20} />
        </button>
        <div className="text-[14px] text-mute">{title}</div>
        <div className="w-10" />
      </div>
      {children}
    </div>
  )
}

// Plans page: Upcoming / Past tabs.
export function PlansPage({ plans, memories, onBack, onOpenMemory, myPhoto }) {
  const [tab, setTab] = useState('up')
  const [past, setPast] = useState('all')
  const isCareers = (m) => ['Networking', 'Careers', 'Workshop'].includes(m.cat)
  const pastList = memories.filter((m) => past === 'all' || (past === 'careers' ? isCareers(m) : !isCareers(m)))
  return (
    <FullPage title="Plans" onBack={onBack}>
      <div className="mx-4 mt-3.5 flex h-11 flex-none rounded-full bg-sf p-1 text-[14px] font-semibold shadow-ring">
        {[
          ['up', 'Upcoming'],
          ['past', 'Past'],
        ].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center rounded-full ${tab === k ? 'bg-acc text-acc-ink' : 'text-mute'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3.5 pb-10">
        {tab === 'up' && plans.map((p) => <PlanCard key={p.key} plan={p} myPhoto={myPhoto} wide />)}
        {tab === 'up' && plans.length === 0 && <div className="py-10 text-center text-[14px] text-mute">No plans yet — join a group or book an event.</div>}
        {tab === 'past' && (
          <>
            <div className="flex gap-2 text-[13px] font-semibold">
              {[
                ['all', 'All'],
                ['careers', 'Careers'],
                ['social', 'Social'],
              ].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setPast(k)} className={`flex h-[34px] items-center rounded-full px-3.5 ${past === k ? 'bg-acc text-acc-ink' : 'bg-sf text-ink shadow-ring'}`}>
                  {label}
                </button>
              ))}
            </div>
            {pastList.map((m) => (
              <button key={m.id} type="button" onClick={() => onOpenMemory(m.id)} className="flex items-center gap-3 rounded-[18px] bg-sf px-3 py-2.5 text-left shadow-ring">
                <div className="h-[46px] w-[46px] flex-none rounded-xl" style={{ background: m.cover }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] leading-[1.25] font-semibold">{m.title}</div>
                  <div className="mt-0.5 text-[12px] text-mute">
                    {m.date} · {m.whoLine}
                  </div>
                </div>
                <span className={`flex-none rounded-full bg-sf2 px-[9px] py-1 text-[11px] font-semibold ${m.status === 'Missed' ? 'text-mute' : 'text-acc'}`}>{m.status}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </FullPage>
  )
}

// Memories page: a photo grid per month.
export function MemoriesPage({ memories, onBack, onOpenMemory }) {
  const months = ['October', 'September']
  return (
    <FullPage title="Memories" onBack={onBack}>
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 pt-3.5 pb-10">
        {months.map((month) => (
          <div key={month} className="flex flex-col gap-2.5">
            <div className="font-display text-[22px]">{month}</div>
            <div className="grid grid-cols-3 gap-2">
              {memories
                .filter((m) => m.month === month)
                .map((m) => (
                  <button key={m.id} type="button" onClick={() => onOpenMemory(m.id)} className="relative aspect-square overflow-hidden rounded-[14px] text-left" style={{ background: m.cover, color: m.ink }}>
                    {m.status === 'Missed' && <div className="absolute inset-0 bg-[rgba(54,26,84,.55)]" />}
                    <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10px] leading-[1.2] font-semibold text-[#FAFAFA]" style={{ background: 'linear-gradient(transparent,rgba(20,8,40,.75))' }}>
                      <div className="line-clamp-2">{m.title}</div>
                      <div className="mt-px font-medium opacity-80">{m.date}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </FullPage>
  )
}

// One memory: big cover, photos (up to 6), who you met, XP and badge, and your note.
//   saved / onSave   the student's own photos and notes for memories (profile.memories)
//   onXp(points, message)   gives XP the first time a memory gets a photo or a note
export function MemoryPage({ id, saved, onSave, onBack, onXp, myPhoto, grow }) {
  const base = MEMORIES.find((m) => m.id === id)
  const m = memoryView(base, saved)
  const [adding, setAdding] = useState(false)
  const [closing, setClosing] = useState(false)
  const [note, setNote] = useState(m.note)

  // The first photo or note on a memory earns 10 XP.
  const reward = () => {
    if (!saved.rewarded.includes(id)) {
      onXp(10, '+10 XP · memory saved')
      return [...saved.rewarded, id]
    }
    return saved.rewarded
  }

  const addPhoto = (src) => {
    setAdding(false)
    onSave({ photos: { ...saved.photos, [id]: [...(saved.photos[id] ?? []), src] }, rewarded: reward() })
  }

  const saveNote = () => {
    if (note === m.note) return
    onSave({ notes: { ...saved.notes, [id]: note }, rewarded: note.trim() ? reward() : saved.rewarded })
  }

  const close = () => {
    setClosing(true)
    setTimeout(onBack, 300)
  }

  return (
    <FullPage title="Memory" onBack={close} z="z-50">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-3.5 pb-10">
        <div
          className="relative aspect-[4/3] flex-none overflow-hidden rounded-[22px]"
          style={{ background: m.cover, color: m.ink, animation: closing ? 'larpOut .3s both' : grow ? 'arPop .42s cubic-bezier(.2,.8,.3,1) both' : 'larpIn .25s both' }}
        >
          <div className="absolute inset-x-0 bottom-0 px-4 py-3.5 text-[#FAFAFA]" style={{ background: 'linear-gradient(transparent,rgba(20,8,40,.8))' }}>
            <div className="font-display text-[24px] leading-[1.1]">{m.title}</div>
            <div className="mt-[3px] text-[12px] opacity-85">
              {m.date} · {m.cat}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5" style={{ animation: closing ? 'larpOut .2s both' : 'larpIn .35s .2s both' }}>
          <div>
            <div className="mb-2 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Photos · up to 6</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) =>
                m.photos[i] ? (
                  <div key={i} className="aspect-square rounded-xl" style={{ background: `url(${m.photos[i]}) center/cover` }} />
                ) : (
                  <button key={i} type="button" onClick={() => setAdding(true)} aria-label="Add a photo" className="flex aspect-square items-center justify-center rounded-xl border-[1.5px] border-dashed border-mute text-[20px] text-mute">
                    +
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-[18px] bg-sf px-3.5 py-3 shadow-ring">
            <div className="flex items-center gap-2.5">
              {m.met.length > 0 && <Avatars ids={m.met} myPhoto={myPhoto} size={28} />}
              <span className="text-[13px]">{m.whoLine}</span>
            </div>
            {m.conn.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {m.conn.map((p) => (
                  <span key={p} className="flex items-center gap-1.5 rounded-full bg-sf2 py-1 pr-2.5 pl-1 text-[12px] font-semibold">
                    <span className="h-5 w-5 rounded-full" style={{ background: avatarBg(p, myPhoto) }} />
                    Met {PEOPLE[p]?.[0] ?? p}
                  </span>
                ))}
              </div>
            )}
            {(m.xp > 0 || m.badge) && (
              <div className="flex flex-wrap gap-1.5">
                {m.xp > 0 && <span className="rounded-full bg-acc px-[9px] py-1 text-[11px] font-bold text-acc-ink">+{m.xp} XP</span>}
                {m.badge && <span className="rounded-full bg-sf2 px-[9px] py-1 text-[11px] font-semibold text-blue">Badge · {m.badge}</span>}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Your note</div>
            <textarea
              value={note}
              rows={2}
              placeholder="Add a note — who you met, what to follow up"
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              className="block w-full resize-none rounded-[14px] border-none bg-sf2 p-3 text-[14px] leading-[1.45] text-ink outline-none placeholder:text-mute"
            />
          </div>
        </div>
      </div>
      {adding && <PhotoPicker onCancel={() => setAdding(false)} onDone={addPhoto} />}
    </FullPage>
  )
}
