// The big mascot on 05 Personality and the sliding "Introvert · Ambivert · Extrovert" labels under it.
// The mascot changes shape and colour for each one: calm lilac, smiling, then arms-up cyan.
//   vert = 0 introvert, 1 ambivert, 2 extrovert. onPick(i) is called when a label is tapped.
import { VERT_LABELS } from './options.js'

const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'

// What the mascot looks like for each choice (sizes in px, angles in degrees).
const LOOKS = [
  { fill: '#BA82FF', eyeH: 8, eyeW: 16, eyeR: '0 0 10px 10px', eyeTop: 72, mouthW: 10, mouthH: 3, mouthR: '2px', mouthBg: '#361A54', mouthBorder: 'none', mouthTop: 98, armL: 14, armR: -14, bodyRot: -3, bob: 0 },
  { fill: '#DDBDFF', eyeH: 8, eyeW: 16, eyeR: '0 0 10px 10px', eyeTop: 70, mouthW: 14, mouthH: 6, mouthR: '0 0 10px 10px', mouthBg: 'transparent', mouthBorder: '2.5px solid #361A54', mouthTop: 94, armL: 28, armR: -28, bodyRot: 0, bob: 0 },
  { fill: '#30D6FF', eyeH: 12, eyeW: 12, eyeR: '999px', eyeTop: 66, mouthW: 22, mouthH: 12, mouthR: '0 0 14px 14px', mouthBg: '#361A54', mouthBorder: 'none', mouthTop: 92, armL: 150, armR: -150, bodyRot: 4, bob: -8 },
]
const INK = '#361A54'
const MOVE = 'all .7s cubic-bezier(.4,0,.2,1)' // every change animates smoothly
const SLOT = 140 // width of each label in the sliding row
const SPRING = 'transform .85s cubic-bezier(.34,1.4,.4,1), color .5s, opacity .5s, border-color .5s, background .5s'

export default function VertPicker({ vert, onPick }) {
  const v = LOOKS[vert]
  const part = (style) => <div style={{ position: 'absolute', transition: MOVE, ...style }} />
  const eye = (centre) =>
    part({
      left: centre - v.eyeW / 2,
      top: v.eyeTop,
      width: v.eyeW,
      height: v.eyeH,
      borderBottom: `2.5px solid ${INK}`,
      borderRadius: v.eyeR,
      background: vert === 2 ? INK : 'transparent',
    })

  return (
    <>
      {/* The mascot: arms, legs, then the pentagon body with its face */}
      <div aria-hidden="true" style={{ position: 'relative', width: 170, height: 200, marginTop: 30, flex: 'none', transition: MOVE, transform: `translateY(${v.bob}px)` }}>
        {part({ left: 16, top: 84, width: 6, height: 58, background: INK, borderRadius: 3, transformOrigin: '50% 0%', transform: `rotate(${v.armL}deg)` })}
        {part({ right: 16, top: 84, width: 6, height: 58, background: INK, borderRadius: 3, transformOrigin: '50% 0%', transform: `rotate(${v.armR}deg)` })}
        {part({ left: 60, bottom: 0, width: 6, height: 40, background: INK, borderRadius: 3 })}
        {part({ left: 108, bottom: 0, width: 6, height: 40, background: INK, borderRadius: 3 })}
        <div style={{ width: 170, height: 160, background: v.fill, clipPath: PENTAGON, position: 'relative', transition: MOVE, transform: `rotate(${v.bodyRot}deg)`, transformOrigin: '50% 100%' }}>
          {eye(60)}
          {eye(110)}
          {part({ left: 85 - v.mouthW / 2, top: v.mouthTop, width: v.mouthW, height: v.mouthH, borderRadius: v.mouthR, background: v.mouthBg, borderBottom: v.mouthBorder, boxSizing: 'border-box' })}
        </div>
      </div>

      {/* The labels slide so the chosen one sits in the middle, inside a white outline */}
      <div
        className="relative mt-7 h-11 w-full flex-none overflow-hidden font-display text-[22px] whitespace-nowrap"
        style={{
          maskImage: 'linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)',
          WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)',
        }}
      >
        <div
          className="absolute top-0 left-1/2 flex h-11 items-center"
          style={{ transition: 'transform .85s cubic-bezier(.34,1.4,.4,1)', transform: `translateX(${-(SLOT * vert + SLOT / 2)}px)` }}
        >
          {VERT_LABELS.map((label, i) => {
            const chosen = i === vert
            return (
              <button
                type="button"
                key={label}
                onClick={() => onPick(i)}
                aria-pressed={chosen}
                className="box-border flex-none rounded-full py-[5px] text-center text-white"
                style={{
                  width: SLOT,
                  transition: SPRING,
                  opacity: chosen ? 1 : 0.5,
                  transform: `scale(${chosen ? 1 : 0.84})`,
                  fontStyle: chosen ? 'italic' : 'normal',
                  border: `1.5px solid ${chosen ? '#FFFFFF' : 'transparent'}`,
                  background: chosen ? 'rgba(255,255,255,.12)' : 'transparent',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
