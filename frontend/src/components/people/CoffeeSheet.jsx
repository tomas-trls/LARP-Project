// "Coffee chat with Priya": a note (pre-written, editable), in person or video, and a time.
// Sending only saves the invite inside LARP. Nothing is sent to LinkedIn or anywhere else.
import { useState } from 'react'
import Icon from '../Icon.jsx'
import { COFFEE_SLOTS } from '../../data/people.js'
import { FeedSheet } from '../feed/parts.jsx'

const FORMATS = [
  ['inperson', 'In person'],
  ['video', 'Video call'],
]

const label = 'text-[11px] font-semibold tracking-[.06em] text-mute uppercase mb-2'

export default function CoffeeSheet({ person, onClose, onSend }) {
  const [note, setNote] = useState(`Hi ${person.first}, I’m ${person.hook}. Would you be up for a 20-min coffee chat?`)
  const [format, setFormat] = useState('inperson')
  const [slot, setSlot] = useState(0)
  const slots = [...COFFEE_SLOTS, `Let ${person.first} pick`]

  return (
    <FeedSheet onClose={onClose} label={`Coffee chat with ${person.first}`}>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-[max(34px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 px-5 pb-3.5">
          <div className="h-11 w-11 flex-none rounded-full" style={{ background: person.color }} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[22px] leading-[1.1]">Coffee chat with {person.first}</div>
            <div className="mt-0.5 text-[12px] text-mute">{person.role}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-mute">
            <Icon name="close" size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5">
          <div>
            <div className={label}>Your note</div>
            <textarea
              value={note}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              className="box-border block w-full resize-none rounded-2xl border-none bg-sf2 p-3.5 text-[14px] leading-[1.45] text-ink outline-none"
            />
          </div>

          <div>
            <div className={label}>Format</div>
            <div className="flex gap-2 text-[13px] font-semibold">
              {FORMATS.map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  className={`flex h-[42px] flex-1 items-center justify-center rounded-full transition-colors ${format === key ? 'bg-acc text-acc-ink' : 'bg-sf2 text-ink'}`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={label}>When · free in both calendars</div>
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(i)}
                  className="flex min-h-[46px] items-center justify-between gap-2.5 rounded-[14px] bg-sf2 px-3.5 text-left text-[14px] transition-shadow"
                  style={{ boxShadow: slot === i ? '0 0 0 2px var(--acc)' : 'none' }}
                >
                  <span>{s}</span>
                  {slot === i && (
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-acc text-acc-ink">
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSend({ note, format, slot: slots[slot] })}
            className="h-[52px] rounded-full bg-cta text-[15px] font-semibold text-cta-ink"
          >
            Send invite
          </button>
        </div>
      </div>
    </FeedSheet>
  )
}
