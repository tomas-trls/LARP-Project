// "Post a group" in three steps: 1 pick an event, 2 pick a group size, 3 write a message and
// choose who can see it. The post then shows on People › Social and on the event's Home card.
//   <PostGroupSheet feed={feed} onClose={...} onPosted={...} startEvent="quiz" startSize={6} />
import { useState } from 'react'
import Icon from '../Icon.jsx'
import { FeedSheet } from './parts.jsx'

const SIZES = [
  [3, '3'],
  [6, '6'],
  [8, '8+'],
  ['custom', 'Custom'],
]

export default function PostGroupSheet({ feed, onClose, onPosted, startEvent = null, startSize = 6 }) {
  const [step, setStep] = useState(startEvent ? 2 : 1)
  const [query, setQuery] = useState('')
  const [evKey, setEvKey] = useState(startEvent)
  const [size, setSize] = useState(startSize)
  const [custom, setCustom] = useState('')
  const [msg, setMsg] = useState(null) // null = use the suggested message
  const [vis, setVis] = useState('conn') // 'conn' = connections only, 'all' = everyone at UCL

  const ev = evKey ? feed.events[evKey] : null
  const cap = size === 'custom' ? Math.max(0, parseInt(custom, 10) || 0) : size
  const capOk = cap >= 2
  const sizeSummary = capOk ? `Group of ${cap >= 8 ? '8+' : cap} · you + ${cap - 1}` : 'Pick a size'
  const message = msg ?? (ev ? `Looking for ${cap - 1} people to go to ${ev.title} with` : '')

  // Featured events first, then soonest first. The search matches the title or category.
  const q = query.trim().toLowerCase()
  const choices = Object.values(feed.events)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.date.localeCompare(b.date))
    .filter((e) => !q || e.title.toLowerCase().includes(q) || e.cat.toLowerCase().includes(q))

  const submit = () => {
    if (!ev || !capOk) return
    feed.postGroup({ ev: evKey, size: cap, msg: message.trim() || `Looking for ${cap - 1} people to go to ${ev.title} with`, vis })
    onPosted?.()
    onClose()
  }

  const pill = (on) => `flex flex-1 items-center justify-center rounded-full transition-colors ${on ? 'bg-acc text-acc-ink' : 'bg-sf2 text-ink'}`

  return (
    <FeedSheet onClose={onClose} maxHeight="82%" label="Post a group">
      <div className="flex min-h-0 flex-1 flex-col pb-[max(34px,env(safe-area-inset-bottom))]">
        {/* Title row: back (after step 1), "Step N of 3", close */}
        <div className="flex flex-none items-center justify-between gap-2.5 px-5 pb-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="Back" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-ink">
              <Icon name="back" size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Step {step} of 3</div>
            <div className="font-display text-[22px] leading-[1.1]">Post a group</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-mute">
            <Icon name="close" size={14} strokeWidth={2.5} />
          </button>
        </div>

        {step === 1 && (
          <div className="flex min-h-0 flex-col">
            <div className="px-5 pb-2.5 text-[14px] text-mute">Which event are you going to?</div>
            <div className="mx-5 mb-2.5 flex h-11 flex-none items-center gap-2.5 rounded-[14px] bg-sf2 px-3.5 text-mute">
              <Icon name="search" size={16} />
              <input
                autoFocus
                value={query}
                placeholder="Search events"
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
              />
            </div>
            <div className="no-scrollbar flex max-h-[46dvh] flex-col overflow-y-auto px-5">
              {choices.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => {
                    setEvKey(e.key)
                    setMsg(null)
                    setStep(2)
                  }}
                  className="flex min-h-14 items-center gap-3 border-b border-line px-0.5 py-2 text-left"
                >
                  <span className="h-3 w-3 flex-none rounded" style={{ background: e.blockBg }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-[1.3] font-semibold">{e.title}</span>
                    <span className="block text-[12px] text-mute">
                      {e.dateLabel} · {e.time} · {e.place}
                    </span>
                  </span>
                  {e.featured && <span className="flex-none rounded-full bg-acc px-2 py-[3px] text-[10px] font-semibold text-acc-ink">Featured</span>}
                </button>
              ))}
              {choices.length === 0 && <div className="px-0.5 py-[18px] text-[14px] text-mute">No events match, try another word.</div>}
            </div>
          </div>
        )}

        {step === 2 && ev && (
          <div className="flex flex-col gap-3.5 px-5">
            <div className="flex items-center gap-3 rounded-[18px] bg-bg p-2.5">
              <span className="h-10 w-3 flex-none rounded-md" style={{ background: ev.blockBg }} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] leading-[1.3] font-semibold">{ev.title}</div>
                <div className="text-[12px] text-mute">
                  {ev.dateLabel} · {ev.time} · {ev.place}
                </div>
              </div>
            </div>
            <div className="text-[14px] text-mute">How big should the group be, including you?</div>
            <div className="flex gap-2 text-[14px] font-semibold">
              {SIZES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSize(key)
                    setMsg(null)
                  }}
                  className={`h-[46px] ${pill(size === key)}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {size === 'custom' && (
              <input
                autoFocus
                type="number"
                min={2}
                max={30}
                value={custom}
                placeholder="How many in total?"
                onChange={(e) => {
                  setCustom(e.target.value)
                  setMsg(null)
                }}
                className="box-border h-11 w-full rounded-[14px] border-none bg-sf2 px-3.5 text-[14px] text-ink outline-none placeholder:text-mute"
              />
            )}
            <div className="text-[13px] text-mute">{sizeSummary}</div>
            <button
              type="button"
              onClick={() => capOk && setStep(3)}
              className="h-[52px] rounded-full bg-cta text-[15px] font-semibold text-cta-ink"
              style={{ opacity: capOk ? 1 : 0.5 }}
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && ev && (
          <div className="flex flex-col gap-3.5 px-5">
            <div className="text-[14px] text-mute">Say a few words, casual is good.</div>
            <textarea
              value={message}
              rows={3}
              onChange={(e) => setMsg(e.target.value)}
              className="box-border block w-full resize-none rounded-2xl border-none bg-sf2 p-3.5 text-[14px] leading-[1.45] text-ink outline-none"
            />
            <div className="text-[14px] text-mute">Who can see it?</div>
            <div className="flex gap-2 text-[13px] font-semibold">
              <button type="button" onClick={() => setVis('conn')} className={`h-11 ${pill(vis === 'conn')}`}>
                Connections only
              </button>
              <button type="button" onClick={() => setVis('all')} className={`h-11 ${pill(vis === 'all')}`}>
                Everyone at UCL
              </button>
            </div>
            <div className="text-[12px] leading-[1.45] text-mute">{sizeSummary} · your post also shows on the event’s Home card as a group forming.</div>
            <button type="button" onClick={submit} className="h-[52px] rounded-full bg-cta text-[15px] font-semibold text-cta-ink">
              Post group
            </button>
          </div>
        )}
      </div>
    </FeedSheet>
  )
}
