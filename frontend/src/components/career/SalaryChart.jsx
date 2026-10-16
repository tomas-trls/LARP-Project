// The little "Median salary, first 5 years" line chart on each area card (08).
// It starts at the area's median starting salary and grows by g% a year.
import { salaryAt } from '../../data/careerData.js'

// The chart is drawn on a 280 x 64 grid. x positions are the 6 points (start, y1 ... y5).
// A salary of £25k sits at the bottom line (y = 50); every £1.875k higher is 1 unit up.
const XS = [2, 50.8, 99.6, 148.4, 197.2, 246]
const GRID_YS = [50, 36.7, 23.3, 10]
const X_LABELS = ['start', 'y1', 'y2', 'y3', 'y4', 'y5']

export default function SalaryChart({ id, start, growth }) {
  const ys = XS.map((_, i) => +(50 - (salaryAt(start, growth, i) - 25) / 1.875).toFixed(1))
  const points = XS.map((x, i) => `${x.toFixed(1)},${ys[i]}`).join(' L')
  const line = 'M' + points
  const fill = `${line} L246.0,50.0 L2.0,50.0 Z` // the same line, closed along the bottom, for the shaded area
  const endK = Math.round(salaryAt(start, growth, 5))
  const gradientId = `salary-${id}`

  return (
    <div className="relative mt-2">
      <div className="flex items-baseline justify-between text-[10px] text-mute">
        <span>Median salary, first 5 years</span>
        <span className="font-semibold text-blue">+{growth}% / yr</span>
      </div>
      <svg width="100%" viewBox="0 0 280 64" preserveAspectRatio="none" className="mt-0.5 block h-16 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--acc)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {GRID_YS.map((y) => (
          <line key={y} x1="2" x2="246" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
        ))}
        <path d={fill} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx="246" cy={ys[5]} r="3.5" fill="var(--acc)" stroke="var(--sf)" strokeWidth="2" />
        <text x="253" y={+(ys[5] + 3).toFixed(1)} fontSize="10" fontWeight="600" fill="var(--ink)">
          £{endK}k
        </text>
        <text x="3" y={+(ys[0] - 6).toFixed(1)} fontSize="9" fill="var(--mute)">
          £{start}k
        </text>
        {XS.map((x, i) => (
          <text key={x} x={x} y="62" fontSize="8" fill="var(--mute)" textAnchor="middle">
            {X_LABELS[i]}
          </text>
        ))}
      </svg>
    </div>
  )
}
