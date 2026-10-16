// The People › Career card stack (screen 12). Drag the top card:
//   left  = Not now    right = Coffee chat (opens the coffee sheet)    up = Save
// The ✕ / Coffee chat? / bookmark buttons under the deck do the same with a tap.
// A stamp ("NOT NOW", "COFFEE CHAT", "SAVE") fades in as you drag, so you can see what will happen.
import { useRef, useState } from 'react'
import Icon from '../Icon.jsx'

const THRESHOLD = 90 // pixels you need to drag before a swipe counts

// How far a stamp shows (0 to 1) for a drag distance.
const fade = (v) => Math.max(0, Math.min(1, v / 80))

export default function SwipeDeck({ deck, onPass, onSave, onCoffee }) {
  const top = deck[0]
  const [drag, setDrag] = useState(null) // { x, y } while dragging
  const [fly, setFly] = useState(null) // 'left' | 'up' | 'right' while the card flies away
  const start = useRef(null)

  // Animate the card away, then tell the page (which moves on to the next person).
  const flyAway = (dir, done) => {
    setDrag(null)
    setFly(dir)
    setTimeout(
      () => {
        setFly(null)
        done()
      },
      dir === 'up' ? 520 : 420,
    )
  }

  const onDown = (e) => {
    if (fly || !top) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0 })
  }
  const onMove = (e) => {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const onUp = () => {
    if (!start.current || !drag) return
    start.current = null
    if (drag.x > THRESHOLD) {
      setDrag(null)
      onCoffee(top)
    } else if (drag.x < -THRESHOLD) flyAway('left', () => onPass(top))
    else if (drag.y < -THRESHOLD) flyAway('up', () => onSave(top))
    else setDrag(null) // not far enough: the card springs back
  }

  // The top card's position: following your finger, flying away, or resting.
  const dx = drag?.x ?? 0
  const dy = drag?.y ?? 0
  let transform = 'none'
  let transition = 'transform .4s cubic-bezier(.2,.8,.3,1),opacity .4s'
  let opacity = 1
  if (drag) {
    transform = `translate(${dx}px,${dy}px) rotate(${(dx * 0.06).toFixed(2)}deg)`
    transition = 'none'
  } else if (fly === 'left') transform = 'translate(-620px,40px) rotate(-22deg)'
  else if (fly === 'right') transform = 'translate(620px,40px) rotate(22deg)'
  else if (fly === 'up') {
    transform = 'translate(150px,-340px) scale(.08)'
    opacity = 0
    transition = 'transform .5s cubic-bezier(.5,0,.8,.4),opacity .45s .05s'
  }

  return (
    <>
      <div className="relative mt-4 h-[372px] flex-none">
        {/* The next two people, peeking out behind */}
        {deck.slice(1, 3).map((p, i) => (
          <div
            key={p.id}
            className="absolute inset-x-0 top-0 box-border h-[340px] overflow-hidden rounded-[28px] bg-sf shadow-ring"
            style={{
              transform: `translateY(${12 * (i + 1)}px) scale(${1 - 0.05 * (i + 1)})`,
              zIndex: 2 - i,
              opacity: 1 - 0.15 * (i + 1),
              transition: 'transform .4s cubic-bezier(.2,.8,.3,1),opacity .4s',
            }}
          >
            <div className="h-[150px]" style={{ background: 'repeating-linear-gradient(135deg,var(--sf2) 0 6px,var(--sf) 6px 12px)' }} />
            <div className="px-[18px] py-4 font-display text-[24px]">{p.name}</div>
          </div>
        ))}

        {top ? (
          <div
            key={top.id}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="absolute inset-x-0 top-0 z-[5] box-border touch-none overflow-hidden rounded-[28px] bg-sf shadow-ring select-none"
            style={{ transform, opacity, transition, transformOrigin: '50% 100%', cursor: drag ? 'grabbing' : 'grab' }}
          >
            {/* A real person has a face picture (top.color is a CSS url(...)); sample people keep the striped placeholder. */}
            <div className="relative h-[150px]" style={{ background: top.color?.startsWith('url(') ? top.color : 'repeating-linear-gradient(135deg,var(--sf2) 0 6px,var(--sf) 6px 12px)' }}>
              {!top.color?.startsWith('url(') && <span className="absolute bottom-3 left-3.5 rounded-md bg-sf px-2 py-[3px] font-mono text-[11px] text-mute">profile photo</span>}
              {top.alumni && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-[12px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue" />
                  Alumni
                </div>
              )}
              {/* Stamps that appear while dragging */}
              <Stamp className="top-4 left-4 -rotate-12 border-[#E5484D] text-[#E5484D]" show={fade(-dx)}>
                Not now
              </Stamp>
              <Stamp className="top-[52px] right-4 rotate-12 border-acc text-acc" show={fade(dx)}>
                Coffee chat
              </Stamp>
              <Stamp className="top-[50px] left-1/2 -translate-x-1/2 border-blue text-blue" show={fade(-dy)}>
                Save
              </Stamp>
            </div>
            <div className="px-[18px] pt-3.5 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-display text-[25px] leading-[1.1]">{top.name}</div>
                <div className="text-[13px] font-semibold whitespace-nowrap text-acc">{top.match}% match</div>
              </div>
              <div className="mt-[3px] text-[13px] leading-[1.35] text-mute">{top.role}</div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px]">
                {top.tags.map((t) => (
                  <span key={t} className="rounded-full bg-sf2 px-2.5 py-1">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-2.5 flex items-start gap-2 text-[12px] leading-[1.45] text-mute">
                <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-blue" />
                <span>
                  <b className="text-ink">Why:</b> {top.why}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Everyone seen
          <div className="absolute inset-x-0 top-0 box-border flex h-[340px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[28px] bg-sf p-6 text-center shadow-ring">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sf2 text-acc">
              <Icon name="check" size={26} />
            </div>
            <div className="font-display text-[24px]">All caught up</div>
            <div className="text-[13px] leading-[1.45] text-mute">New people on your routes land here every Monday. Saved people are in the bookmark.</div>
          </div>
        )}
      </div>

      {/* ✕ · Coffee chat? · Save */}
      <div className="mt-3.5 flex flex-none items-center justify-center gap-[18px]">
        <button
          type="button"
          aria-label="Not now"
          disabled={!top}
          onClick={() => flyAway('left', () => onPass(top))}
          className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-sf text-mute shadow-ring active:scale-[.92]"
        >
          <Icon name="close" size={22} />
        </button>
        <button
          type="button"
          disabled={!top}
          onClick={() => onCoffee(top)}
          className="flex h-[60px] items-center justify-center gap-2.5 rounded-full bg-cta px-[26px] text-[15px] font-semibold text-cta-ink active:scale-[.97]"
        >
          <Icon name="coffee" size={20} />
          Coffee chat?
        </button>
        <button
          type="button"
          aria-label="Save"
          disabled={!top}
          onClick={() => flyAway('up', () => onSave(top))}
          className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-sf text-acc shadow-ring active:scale-[.92]"
        >
          <Icon name="bookmark" size={22} />
        </button>
      </div>
      <div className="mt-3 flex-none text-center text-[12px] text-mute">
        {top ? `${top.first} sees your note and profile before accepting.` : 'You’ve seen everyone on your routes this week.'}
      </div>
    </>
  )
}

function Stamp({ children, show, className }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-xl border-[2.5px] bg-sf px-3.5 py-2 text-[16px] font-bold tracking-[.04em] uppercase ${className}`}
      style={{ opacity: show }}
    >
      {children}
    </div>
  )
}
