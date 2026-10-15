// The animated parts of screen 01 Intro: the five mascots, the headline and the typed-out line.
import { useEffect, useState } from 'react'

const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'

// [body colour, face colour, size]. The middle one is the biggest.
const SHADES = [
  ['#EEDEFF', '#361A54', 0.66],
  ['#DDBDFF', '#361A54', 0.74],
  ['#BA82FF', '#361A54', 1.18],
  ['#993BFF', '#FAFAFA', 0.74],
  ['#30D6FF', '#361A54', 0.66],
]
const TILT = ['rotate(-14deg)', 'rotate(9deg)', undefined, undefined, 'rotate(-7deg)']
// How long each mascot's sway lasts and when it starts, so they don't move in step.
const SWAY = [[4.2, 0.0], [3.6, 1.1], [3.9, 0.6], [4.5, 1.8], [3.4, 0.3]]

// One sleepy mascot. The middle one fades in first, then "wakes up" (its flat mouth becomes a smile).
function IntroMascot({ index }) {
  const [fill, face, scale] = SHADES[index]
  const w = 92
  const h = 86
  const mid = index === 2
  const delay = mid ? 0.3 : 2.4 + 0.1 * Math.abs(index - 2)
  const [swayTime, swayDelay] = SWAY[index]
  const box = { position: 'absolute' }
  const limb = (style) => <div style={{ ...box, width: 5, background: 'var(--ink)', borderRadius: 3, ...style }} />
  const eye = (left) => <div style={{ ...box, left, top: 38, width: 10, height: 5, borderBottom: `2px solid ${face}`, borderRadius: '0 0 8px 8px' }} />

  return (
    <div
      style={{
        position: 'relative',
        width: w * scale,
        height: (h + 20) * scale,
        marginLeft: index ? -10 : 0,
        zIndex: mid ? 3 : index === 1 || index === 3 ? 2 : 1,
      }}
    >
      <div style={{ ...box, left: 0, bottom: 0, width: w, height: h + 20, transform: `scale(${scale})`, transformOrigin: 'bottom left' }}>
        <div style={{ ...box, inset: 0, opacity: 0, animation: `larpIn 1.1s ${delay}s cubic-bezier(.2,.7,.2,1) forwards` }}>
          <div style={{ ...box, inset: 0, transformOrigin: '50% 100%', animation: `larpSway ${swayTime}s ${swayDelay}s ease-in-out infinite` }}>
            {limb({ left: 10, top: 46, height: 30, transform: 'rotate(28deg)', transformOrigin: 'top center', animation: `larpArmL ${swayTime}s ${swayDelay}s ease-in-out infinite` })}
            {limb({ right: 10, top: 46, height: 30, transform: 'rotate(-28deg)', transformOrigin: 'top center', animation: `larpArmR ${swayTime}s ${swayDelay}s ease-in-out infinite` })}
            {limb({ left: 32, bottom: 0, height: 20 })}
            {limb({ left: 58, bottom: 0, height: 20 })}
            <div style={{ ...box, left: 0, top: 0, width: w, height: h, background: fill, clipPath: PENTAGON, transform: TILT[index] }}>
              {eye(28)}
              {eye(54)}
              {/* smile (the middle mascot's smile appears after 3.6 seconds) */}
              <div
                style={{
                  ...box,
                  left: 41,
                  top: 52,
                  width: 10,
                  height: 6,
                  borderBottom: `2px solid ${face}`,
                  borderRadius: '0 0 10px 10px',
                  opacity: mid ? 0 : 1,
                  animation: mid ? 'larpIn .5s 3.6s forwards' : 'none',
                }}
              />
              {/* the middle mascot starts with a flat mouth that fades out */}
              {mid && <div style={{ ...box, left: 42, top: 54, width: 8, height: 3, borderRadius: 2, background: face, animation: 'larpOut .5s 3.6s forwards' }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function IntroMascots() {
  return (
    <div className="flex h-[140px] w-full items-end justify-center" aria-hidden="true">
      {SHADES.map((_, i) => (
        <IntroMascot key={i} index={i} />
      ))}
    </div>
  )
}

// "Same campus. Just more connected." Each word fades up in turn, then "connected." glows.
export function IntroHeadline() {
  const words = ['Same', 'campus.', 'Just', 'more']
  return (
    <h1 className="max-w-[320px] text-center font-display text-[44px] leading-[1.1] font-normal text-ink">
      {words.map((w, i) => (
        <span key={w} className="mr-[0.22em] inline-block opacity-0" style={{ animation: `larpIn 1s ${0.36 * i + 0.3}s cubic-bezier(.2,.7,.2,1) forwards` }}>
          {w}
        </span>
      ))}
      <span
        className="inline-block text-acc italic opacity-0"
        style={{ animation: 'larpIn 1s 1.85s cubic-bezier(.2,.7,.2,1) forwards, larpPulse 4.5s 3s cubic-bezier(.4,0,.2,1) infinite' }}
      >
        connected.
      </span>
    </h1>
  )
}

// The line under the headline types itself out, one letter every 55ms, starting after 3.2 seconds.
// Each part is [text, italic?].
const SEGMENTS = [
  ['Shape ', false],
  ['your career', true],
  [' path, surrounded by the people who share ', false],
  ['your vision', true],
  ['\n\n', false],
  ['Events - Networking - Societies', false],
]
const TOTAL = SEGMENTS.reduce((n, [t]) => n + t.length, 0)

export function IntroTyped() {
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    let timer
    const start = setTimeout(() => {
      timer = setInterval(() => {
        setTyped((t) => {
          if (t + 1 >= TOTAL) clearInterval(timer)
          return t + 1
        })
      }, 55)
    }, 3200)
    return () => {
      clearTimeout(start)
      clearInterval(timer)
    }
  }, [])

  // Cut the text at "typed" letters, keeping the italic parts italic.
  let left = typed
  const parts = []
  SEGMENTS.forEach(([text, italic], i) => {
    if (left <= 0) return
    const part = text.slice(0, left)
    left -= text.length
    if (text === '\n\n') parts.push(<br key={i + 'a'} />, part.length === 2 ? <br key={i + 'b'} /> : null)
    else parts.push(italic ? <i key={i}>{part}</i> : <span key={i}>{part}</span>)
  })

  return (
    <p className="min-h-[90px] max-w-[280px] text-center text-[15px] leading-normal whitespace-pre-wrap text-mute" aria-label="Shape your career path, surrounded by the people who share your vision. Events - Networking - Societies">
      {parts}
    </p>
  )
}
