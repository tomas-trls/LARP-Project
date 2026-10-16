// "Recommended actions": cards you swipe sideways, with dots underneath showing which one you're on.
// The first card is the purple "Top for you" card with the mascot; the rest are "Suggested".
// Pressing a card's button marks it "Requested ✓" (saved in profile.actionsRequested).
import { useState } from 'react'
import { useProfile } from '../../profileStore.jsx'
import Mascot from '../Mascot.jsx'

export default function ActionCarousel({ actions }) {
  const { profile, update } = useProfile()
  const [dot, setDot] = useState(0)
  const requested = profile.actionsRequested ?? []

  const toggle = (id) => update('actionsRequested', requested.includes(id) ? requested.filter((x) => x !== id) : [...requested, id])

  // While scrolling, the card whose left edge is closest to the start is the "current" one.
  const onScroll = (e) => {
    const row = e.currentTarget
    const start = row.getBoundingClientRect().left + 16
    let best = 0
    let bestDistance = Infinity
    ;[...row.children].forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left - start)
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    })
    if (best !== dot) setDot(best)
  }

  return (
    <>
      <div onScroll={onScroll} className="no-scrollbar -mx-4 mt-3 flex flex-none snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-0.5 pb-1.5">
        {actions.map((a, i) => {
          const done = requested.includes(a.id)
          return i === 0 ? (
            // Top for you
            <div key={a.id} className="relative box-border flex w-[300px] flex-none snap-start flex-col overflow-hidden rounded-3xl bg-hero p-5 text-hero-ink">
              <div className="text-[11px] font-semibold tracking-[.08em] uppercase opacity-85">Top for you</div>
              <div className="mt-2 max-w-[190px] font-display text-[26px] leading-[1.12]">{a.label}</div>
              <div className="mt-2 text-[13px] leading-[1.45] opacity-90">{done ? `Requested. UCL Careers will confirm a slot by email.` : a.prep}</div>
              <div className="mt-2.5 flex items-start gap-2 text-[12px] leading-[1.4] opacity-90">
                <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-white" />
                <span>
                  <b>Why:</b> {a.why}
                </span>
              </div>
              <button type="button" onClick={() => toggle(a.id)} className="mt-4 h-[46px] rounded-full bg-white text-[14px] font-semibold text-plum">
                {done ? 'Requested ✓' : a.cta}
              </button>
              <Mascot size={64} className="absolute top-3.5 right-3.5" />
            </div>
          ) : (
            // Suggested
            <div key={a.id} className="box-border flex w-[250px] flex-none snap-start flex-col rounded-3xl bg-sf2 p-[18px] text-ink">
              <div className="text-[11px] font-semibold tracking-[.08em] text-acc uppercase">Suggested</div>
              <div className="mt-2 font-display text-[21px] leading-[1.12]">{a.label}</div>
              <div className="mt-1.5 text-[12px] leading-[1.45] text-mute">{a.prep}</div>
              <div className="mt-2 flex items-start gap-2 text-[12px] leading-[1.4]">
                <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-acc" />
                <span>
                  <b>Why:</b> {a.why}
                </span>
              </div>
              <div className="mt-auto pt-3.5">
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`h-10 w-full rounded-full text-[13px] font-semibold ${done ? 'bg-acc text-acc-ink' : 'bg-cta text-cta-ink'}`}
                >
                  {done ? 'Requested ✓' : a.cta}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {/* Dots: the current card's dot is long */}
      <div className="mt-2 flex flex-none justify-center gap-[5px]">
        {actions.map((a, i) => (
          <div
            key={a.id}
            className="h-1.5 rounded-[3px] transition-all duration-200"
            style={{ width: i === dot ? 22 : 6, background: i === dot ? 'var(--acc)' : 'var(--sf2)' }}
          />
        ))}
      </div>
    </>
  )
}
