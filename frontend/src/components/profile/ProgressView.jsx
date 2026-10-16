// Profile › Your progress: how your five scores have moved since you made your gap summary.
//   - a spider chart: where you started (dashed), where you are now (filled), and the alumni targets
//   - one bar per category: start → now, with the target as a dotted line
//   - "What moved the scores": the events and steps that changed them, and what to do next
import { useState } from 'react'
import { CATEGORIES, GAPS } from '../../data/careerData.js'
import { FIT_AT_START, MILESTONES, SCORES_AT_START, SCORES_NOW } from '../../data/memories.js'
import Icon from '../Icon.jsx'
import { FullPage } from './PlansMemories.jsx'

// Same drawing rules as the spider chart on screen 09: corners in the order
// Academics, Experience, Skills, Teamwork, Leadership; a score of 100 reaches 70 units from the centre.
const AXIS_ORDER = [0, 3, 1, 2, 4]
const ANGLES = [-90, -18, 54, 126, 198]
function toPoints(scores) {
  return AXIS_ORDER.map((cat, k) => {
    const r = scores[cat] * 0.7
    const t = (ANGLES[k] * Math.PI) / 180
    return `${(130 + r * Math.cos(t)).toFixed(1)},${(100 + r * Math.sin(t)).toFixed(1)}`
  }).join(' ')
}
const RINGS = [100, 75, 50, 25].map((v) => toPoints([v, v, v, v, v]))
const LABELS = [
  { cat: 0, x: 130, y: 20, anchor: 'middle' },
  { cat: 3, x: 203, y: 78, anchor: 'start' },
  { cat: 1, x: 176, y: 172, anchor: 'start' },
  { cat: 2, x: 84, y: 172, anchor: 'end' },
  { cat: 4, x: 57, y: 78, anchor: 'end' },
]

// areas = up to two of the student's picked career areas ({ id, title }) that have gap data.
export default function ProgressView({ areas, fit, onBack, onRequest }) {
  const [focus, setFocus] = useState(null) // highlighted area id
  const [requested, setRequested] = useState(false)

  // For each category, the target is the highest alumni score among your areas.
  const rows = CATEGORIES.map((c, i) => {
    const target = Math.max(...areas.map((a) => GAPS[a.id].al[i]))
    return { c, from: SCORES_AT_START[i], to: SCORES_NOW[i], target, gain: SCORES_NOW[i] - SCORES_AT_START[i], gap: Math.max(0, target - SCORES_NOW[i]) }
  })
  const bestGain = Math.max(...rows.map((r) => r.gain))
  const bigGap = Math.max(...rows.map((r) => r.gap))

  return (
    <FullPage title="Your progress" onBack={onBack}>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 pt-3.5 pb-10">
        {/* Fit ring and headline */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--acc) 0 ${fit}%, var(--sf2) ${fit}% 100%)` }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-[13px] font-semibold">{fit}%</div>
          </div>
          <div>
            <div className="font-display text-[26px] leading-[1.1]">
              Where you <em>are</em> now
            </div>
            <div className="mt-1 text-[12px] text-mute">▲{fit - FIT_AT_START} since you started · 1 of 3 steps done</div>
          </div>
        </div>

        {/* Spider chart */}
        <div className="flex flex-col items-center gap-2">
          <svg width="230" height="176" viewBox="0 0 260 200" fill="none" className="flex-none overflow-visible" role="img" aria-label="Your scores at the start, now, and the alumni targets">
            {RINGS.map((pts) => (
              <polygon key={pts} points={pts} stroke="var(--sf2)" strokeWidth="1" />
            ))}
            <path d="M130 100L130 30M130 100L196.6 78.4M130 100L171.2 156.6M130 100L88.8 156.6M130 100L63.4 78.4" stroke="var(--sf2)" strokeWidth="1" />
            <polygon points={toPoints(SCORES_AT_START)} stroke="var(--ink)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinejoin="round" opacity=".45" />
            <polygon points={toPoints(SCORES_NOW)} fill="var(--ink)" fillOpacity=".14" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
            {areas.map((a) => (
              <polygon
                key={a.id}
                points={toPoints(GAPS[a.id].al)}
                stroke={GAPS[a.id].color}
                strokeWidth={focus === a.id ? 2.6 : 1.6}
                strokeDasharray="6 5"
                strokeLinejoin="round"
                opacity={focus && focus !== a.id ? 0.25 : 1}
                style={{ transition: 'opacity .25s, stroke-width .25s' }}
              />
            ))}
            {LABELS.map((l) => (
              <text key={l.cat} x={l.x} y={l.y} textAnchor={l.anchor} fontFamily="DM Sans, sans-serif" fontSize="11" fill="var(--mute)">
                {CATEGORIES[l.cat]}
              </text>
            ))}
          </svg>
          <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-[11px] text-mute">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 flex-none border-t-2 border-dashed border-ink opacity-50" />
              Started
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-3.5 flex-none bg-ink" />
              Now
            </div>
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5" style={{ opacity: focus && focus !== a.id ? 0.25 : 1 }}>
                <div className="w-3.5 flex-none border-t-2 border-dashed" style={{ borderColor: GAPS[a.id].color }} />
                Target · {a.title}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {areas.map((a) => {
              const on = focus === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setFocus(on ? null : a.id)}
                  className={`flex h-8 items-center rounded-full px-3 text-[12px] font-semibold transition-colors ${on ? 'text-plum' : 'bg-sf text-ink shadow-ring'}`}
                  style={on ? { background: GAPS[a.id].color } : undefined}
                >
                  {a.title}
                </button>
              )
            })}
          </div>
          <div className="text-[10px] text-mute opacity-80">{focus ? `Showing target for ${areas.find((a) => a.id === focus)?.title}` : 'Tap an area to highlight its target'}</div>
        </div>

        {/* Progress per category */}
        <div className="flex flex-col gap-3 rounded-[20px] bg-sf px-4 py-3.5 shadow-ring">
          <div className="text-[11px] font-semibold tracking-[.06em] text-mute uppercase">Progress per category</div>
          {rows.map((r) => {
            const improved = r.gain === bestGain && r.gain > 0
            const biggest = !improved && r.gap === bigGap && r.gap > 0
            return (
              <div key={r.c} className="flex flex-col gap-[5px]">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{r.c}</span>
                    {improved && <span className="rounded-full bg-acc px-[7px] py-0.5 text-[10px] font-semibold text-acc-ink">Most improved</span>}
                    {biggest && <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold text-acc">Biggest gap</span>}
                  </div>
                  <span className="text-[12px] text-mute">
                    {r.from} → {r.to} · target {r.target} <b className="text-acc">▲{r.gain}</b>
                  </span>
                </div>
                {/* Dotted = target, purple = now, faint = where you started */}
                <div className="relative h-2 overflow-hidden rounded bg-sf2">
                  <div className="absolute inset-y-0 left-0 opacity-50" style={{ width: `${r.target}%`, background: 'repeating-linear-gradient(90deg,var(--mute) 0 3px,transparent 3px 6px)' }} />
                  <div className="absolute inset-y-0 left-0 rounded bg-acc" style={{ width: `${r.to}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded bg-ink opacity-35" style={{ width: `${r.from}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* What moved the scores */}
        <div className="flex flex-col rounded-[20px] bg-sf px-4 py-3.5 shadow-ring">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[.06em] text-mute uppercase">What moved the scores</div>
          {MILESTONES.map((m) => (
            <div key={m.t} className="flex gap-3" style={{ opacity: m.done ? 1 : 0.85 }}>
              <div className="flex w-[18px] flex-none flex-col items-center">
                <div
                  className="flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 text-acc-ink"
                  style={{ borderColor: m.done ? 'var(--acc)' : 'var(--mute)', background: m.done ? 'var(--acc)' : 'transparent' }}
                >
                  {m.done && <Icon name="check" size={10} strokeWidth={3} />}
                </div>
                <div className="min-h-3.5 w-px flex-1 bg-line" />
              </div>
              <div className="min-w-0 flex-1 pb-3.5">
                <div className="text-[13px] leading-[1.3] font-semibold">{m.t}</div>
                <div className="mt-0.5 text-[12px] text-mute">
                  {m.d} · <span className="font-semibold text-acc">{m.ch}</span>
                </div>
                {m.cta && (
                  <button
                    type="button"
                    onClick={() => {
                      if (requested) return
                      setRequested(true)
                      onRequest()
                    }}
                    className="mt-2 inline-flex h-8 items-center rounded-full bg-cta px-3.5 text-[12px] font-semibold text-cta-ink"
                  >
                    {requested ? 'Requested ✓' : m.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </FullPage>
  )
}
