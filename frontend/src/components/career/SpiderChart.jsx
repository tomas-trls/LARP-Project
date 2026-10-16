// The five-sided "spider" chart on screen 09: your scores (solid white shape)
// against alumni in each chosen area (dashed coloured shapes).
//
// The chart is drawn on a 260 x 200 grid with its centre at (130, 100).
// A score of 100 reaches 70 units from the centre.
import { CATEGORIES } from '../../data/careerData.js'

// Drawing order of the corners, going clockwise from the top:
// Academics, Experience, Skills, Teamwork, Leadership (positions in CATEGORIES: 0, 3, 1, 2, 4).
const AXIS_ORDER = [0, 3, 1, 2, 4]
const ANGLES = [-90, -18, 54, 126, 198]

// Turns 5 scores into the "x,y x,y ..." points of a polygon.
function toPoints(scores) {
  return AXIS_ORDER.map((cat, k) => {
    const r = scores[cat] * 0.7
    const t = (ANGLES[k] * Math.PI) / 180
    return `${(130 + r * Math.cos(t)).toFixed(1)},${(100 + r * Math.sin(t)).toFixed(1)}`
  }).join(' ')
}

// The faint background rings at 100, 75, 50 and 25.
const RINGS = [100, 75, 50, 25].map((v) => toPoints([v, v, v, v, v]))

// Where each category name sits around the chart.
const LABELS = [
  { cat: 0, x: 130, y: 20, anchor: 'middle' },
  { cat: 3, x: 203, y: 78, anchor: 'start' },
  { cat: 1, x: 176, y: 172, anchor: 'start' },
  { cat: 2, x: 84, y: 172, anchor: 'end' },
  { cat: 4, x: 57, y: 78, anchor: 'end' },
]

// shapes = [{ key, scores, color }], focus = the key of the highlighted area (or null)
export default function SpiderChart({ myScores, shapes, focus }) {
  return (
    <svg width="230" height="176" viewBox="0 0 260 200" fill="none" className="flex-none overflow-visible" role="img" aria-label="Your scores compared with alumni">
      {RINGS.map((pts) => (
        <polygon key={pts} points={pts} stroke="var(--sf2)" strokeWidth="1" />
      ))}
      <path d="M130 100L130 30M130 100L196.6 78.4M130 100L171.2 156.6M130 100L88.8 156.6M130 100L63.4 78.4" stroke="var(--sf2)" strokeWidth="1" />

      {/* You */}
      <polygon points={toPoints(myScores)} fill="var(--ink)" fillOpacity=".14" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" opacity={focus ? 0.9 : 1} />

      {/* Alumni in each area. The focused one gets thicker, the others fade. */}
      {shapes.map((s) => {
        const isFocus = focus === s.key
        const dim = focus && !isFocus
        return (
          <polygon
            key={s.key}
            points={toPoints(s.scores)}
            stroke={s.color}
            strokeWidth={isFocus ? 2.6 : 1.6}
            strokeDasharray={isFocus ? '5 3' : '4 3'}
            strokeLinejoin="round"
            opacity={dim ? 0.25 : 1}
            style={{ transition: 'opacity .25s, stroke-width .25s' }}
          />
        )
      })}

      {LABELS.map((l) => (
        <text key={l.cat} x={l.x} y={l.y} textAnchor={l.anchor} fontSize="11" fill="var(--mute)">
          {CATEGORIES[l.cat]}
        </text>
      ))}
    </svg>
  )
}
