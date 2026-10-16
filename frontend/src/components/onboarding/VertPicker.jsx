// 05 Personality: the big pentagon character and the sliding "Introvert · Ambivert · Extrovert" labels.
//
// VertMascot changes its face and arms with a "pose": neutral (nothing picked yet), intro, ambi, extro,
// or think (while the quiz result is being worked out). Each change animates smoothly.
// VertCarousel slides the picked (or highlighted) label to the middle. Tapping a label picks it.
import { VERT_LABELS } from './options.js'

const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'
const PLUM = '#361A54'
const SMOOTH = 'all .6s cubic-bezier(.4,0,.2,1)'

// What the character looks like in each pose (sizes in pixels, angles in degrees).
// eyeFill = solid round eyes; armZ = 2 puts the arms in front of the body (hands on face).
const POSES = {
  neutral: { fill: '#DDBDFF', eyeH: 8, eyeW: 16, eyeR: '0 0 10px 10px', eyeTop: 70, eyeFill: false, mouthW: 12, mouthH: 5, mouthR: '0 0 10px 10px', mouthBg: 'transparent', mouthBorder: `2.5px solid ${PLUM}`, mouthTop: 95, armL: 18, armR: -18, armZ: 0, bodyRot: 0 },
  intro: { fill: '#BA82FF', eyeH: 4, eyeW: 16, eyeR: '0 0 10px 10px', eyeTop: 75, eyeFill: false, mouthW: 10, mouthH: 5, mouthR: '0 0 8px 8px', mouthBg: 'transparent', mouthBorder: `2.5px solid ${PLUM}`, mouthTop: 96, armL: -24, armR: 24, armZ: 2, bodyRot: -2 },
  ambi: { fill: '#DDBDFF', eyeH: 8, eyeW: 16, eyeR: '0 0 10px 10px', eyeTop: 70, eyeFill: false, mouthW: 18, mouthH: 8, mouthR: '0 0 12px 12px', mouthBg: 'transparent', mouthBorder: `2.5px solid ${PLUM}`, mouthTop: 93, armL: 150, armR: -10, armZ: 0, bodyRot: 0 },
  extro: { fill: '#30D6FF', eyeH: 12, eyeW: 12, eyeR: '999px', eyeTop: 66, eyeFill: true, mouthW: 26, mouthH: 14, mouthR: '0 0 16px 16px', mouthBg: PLUM, mouthBorder: 'none', mouthTop: 90, armL: 150, armR: -150, armZ: 0, bodyRot: 4 },
  think: { fill: '#DDBDFF', eyeH: 8, eyeW: 8, eyeR: '999px', eyeTop: 60, eyeFill: true, mouthW: 10, mouthH: 3, mouthR: '2px', mouthBg: PLUM, mouthBorder: 'none', mouthTop: 98, armL: 16, armR: 72, armZ: 2, bodyRot: -3 },
}

// The animations used on this screen (the design keeps them next to the character too).
export const PERSONALITY_KEYFRAMES = `
@keyframes p5Pop{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,255,255,.7)}35%{transform:scale(1.35)}65%{transform:scale(.92)}100%{transform:scale(1.1);box-shadow:0 0 0 14px rgba(255,255,255,0)}}
@keyframes p5Up{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:none}}
@keyframes p5Out{to{opacity:0;transform:scale(.7)}}
@keyframes p5In{from{opacity:0;transform:translateX(var(--fx))}to{opacity:1;transform:none}}
@keyframes p5Pulse{0%,100%{transform:scale(.92);opacity:.75}50%{transform:scale(1.06);opacity:1}}
@keyframes p5Bounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-16px)}65%{transform:translateY(-4px)}}
@keyframes p5Spark{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
`

// One absolutely-placed piece of the character (an arm, a leg, an eye...). It animates when its style changes.
function Part({ style }) {
  return <div style={{ position: 'absolute', transition: SMOOTH, ...style }} />
}

// The 10 little stars that burst out when the quiz lands on a result.
function Sparks() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2
        return (
          <span
            key={i}
            style={{
              position: 'absolute', left: 85, top: 90, opacity: 0,
              fontSize: i % 2 ? 14 : 20,
              color: i % 3 ? '#FFFFFF' : '#30D6FF',
              '--dx': `${Math.cos(angle) * 120}px`,
              '--dy': `${Math.sin(angle) * 100}px`,
              animation: 'p5Spark .9s cubic-bezier(.2,.7,.2,1) forwards',
            }}
          >
            ✦
          </span>
        )
      })}
    </div>
  )
}

// pose: a key of POSES. thinking: show the "…" speech bubble. sparkKey: changes each time a result lands
// (to replay the stars). bounceKey: changes each time Extrovert is picked (to replay the jump).
export function VertMascot({ pose, thinking = false, sparkKey = null, bounceKey = 0 }) {
  const p = POSES[pose]
  const limb = { width: 6, background: PLUM, borderRadius: 3 }
  return (
    <div style={{ position: 'relative', width: 170, height: 200, marginTop: 26, flex: 'none' }} aria-hidden="true">
      {/* The extrovert jumps twice. A new "key" restarts the animation every time it is picked. */}
      <div key={pose === 'extro' ? `b${bounceKey}` : 'still'} style={{ position: 'absolute', inset: 0, animation: pose === 'extro' ? 'p5Bounce .55s ease-in-out 2' : 'none' }}>
        <Part style={{ ...limb, left: 16, top: 84, height: 58, transformOrigin: '50% 0%', zIndex: p.armZ, transform: `rotate(${p.armL}deg)` }} />
        <Part style={{ ...limb, right: 16, top: 84, height: 58, transformOrigin: '50% 0%', zIndex: p.armZ, transform: `rotate(${p.armR}deg)` }} />
        <Part style={{ ...limb, left: 60, bottom: 0, height: 40 }} />
        <Part style={{ ...limb, left: 108, bottom: 0, height: 40 }} />
        {/* The body, with the two eyes and the mouth inside it */}
        <div style={{ width: 170, height: 160, background: p.fill, clipPath: PENTAGON, position: 'relative', transition: SMOOTH, transform: `rotate(${p.bodyRot}deg)`, transformOrigin: '50% 100%' }}>
          {[60, 110].map((x) => (
            <Part key={x} style={{ left: x - p.eyeW / 2, top: p.eyeTop, width: p.eyeW, height: p.eyeH, borderBottom: `2.5px solid ${PLUM}`, borderRadius: p.eyeR, background: p.eyeFill ? PLUM : 'transparent', boxSizing: 'border-box' }} />
          ))}
          <Part style={{ left: 85 - p.mouthW / 2, top: p.mouthTop, width: p.mouthW, height: p.mouthH, borderRadius: p.mouthR, background: p.mouthBg, borderBottom: p.mouthBorder, boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* "…" bubble while the result is being worked out */}
      {thinking && (
        <div style={{ position: 'absolute', right: -46, top: -8, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <div className="flex h-10 w-[58px] items-center justify-center rounded-[20px] bg-white text-[22px] font-bold text-plum" style={{ animation: 'p5Pulse .5s ease-in-out infinite' }}>
            …
          </div>
        </div>
      )}

      {sparkKey != null && <Sparks key={sparkKey} />}
    </div>
  )
}

// focus: the label slid to the middle. selected: the label filled in white (or null).
// lit: the label glowing during the spin (or null). spinning: use the quick slide for the spin.
export function VertCarousel({ focus, selected, lit, spinning, onPick }) {
  const SLOT = 140 // width of each label
  const fade = 'linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)'
  return (
    <div
      className="relative h-12 w-full overflow-hidden font-display text-[22px] whitespace-nowrap"
      style={{ maskImage: fade, WebkitMaskImage: fade }}
      role="radiogroup"
      aria-label="Introvert, ambivert or extrovert"
    >
      <div
        className="absolute top-0 left-1/2 flex h-12 items-center"
        style={{
          transition: `transform ${spinning ? '.18s ease-out' : '.7s cubic-bezier(.34,1.4,.4,1)'}`,
          transform: `translateX(${-(SLOT * focus + SLOT / 2)}px)`,
        }}
      >
        {VERT_LABELS.map((label, i) => {
          const isFocus = i === focus
          const isOn = i === selected
          return (
            <button
              type="button"
              key={label}
              role="radio"
              aria-checked={isOn}
              onClick={() => onPick(i)}
              className="box-border flex h-10 flex-none items-center justify-center rounded-full select-none"
              style={{
                width: SLOT,
                transition: 'all .3s',
                opacity: isFocus ? 1 : 0.5,
                transform: `scale(${isFocus ? 1 : 0.84})`,
                fontStyle: isFocus ? 'italic' : 'normal',
                background: isOn ? '#FFFFFF' : 'transparent',
                color: isOn ? PLUM : '#FFFFFF',
                border: `1.5px solid ${isFocus && !isOn ? '#FFFFFF' : 'transparent'}`,
                boxShadow: i === lit ? '0 0 24px 6px rgba(255,255,255,.5)' : 'none',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
