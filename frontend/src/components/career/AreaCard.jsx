// One career area on screen 08: title, reason, salary chart, key numbers, and a "See gaps" panel.
// Tapping the card picks or un-picks the area. Tapping "See gaps" opens the panel without picking.
import { CATEGORIES, MY_SCORES, salaryAt, worstCategory } from '../../data/careerData.js'
import { CheckCircle, OwnTag, Ring, SmallX } from './bits.jsx'
import SalaryChart from './SalaryChart.jsx'

export default function AreaCard({ area, gap, on, open, onToggle, onToggleGaps, onRemove, cardRef }) {
  const worst = worstCategory(gap.al)
  const endK = Math.round(salaryAt(area.start, area.g, 5))

  // Clicks on "See gaps" or the remove button must not also pick the card.
  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div
      ref={cardRef}
      onClick={onToggle}
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      className="relative flex cursor-pointer items-start gap-3 rounded-[24px] bg-sf px-4 py-3.5 transition-[box-shadow,transform] select-none active:scale-[.985]"
      style={{ boxShadow: on ? '0 0 0 2px var(--acc)' : 'var(--ring)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-[21px] leading-[1.15]">{area.title}</div>
          {area.custom && <OwnTag>Added by you</OwnTag>}
        </div>
        <div className="mt-1 min-h-[34px] text-[12px] leading-[1.4] text-mute">{area.desc}</div>

        <SalaryChart id={area.id} start={area.start} growth={area.g} />

        {/* Three key numbers */}
        <div className="mt-2.5 flex gap-2.5 rounded-xl bg-sf2 px-3 py-2">
          <Stat value={area.range} label="median start" />
          <Stat value={`£${endK}k`} label="at 5 yrs" />
          <Stat value={area.alumni} label="UCL alumni" />
        </div>

        {/* "See gaps" toggle */}
        <button
          type="button"
          onClick={stop(onToggleGaps)}
          className="mt-2.5 flex w-full items-center justify-between gap-2 py-1 text-[12px] font-semibold text-acc"
        >
          <span className="flex items-center gap-2">
            <Ring value={gap.fit} />
            {open ? 'Hide gaps' : 'See gaps'}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div className="mt-1.5 flex flex-col gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-3">
              <Ring value={gap.fit} size={52} inner={40} fontSize={12} />
              <div className="min-w-0 flex-1 text-[12px] leading-[1.4]">
                <div className="font-semibold">fit vs alumni in {gap.vs}</div>
                <div className="text-mute">{gap.why}</div>
              </div>
            </div>

            {/* You vs alumni bars for each category */}
            <div className="flex flex-col gap-[7px]">
              <div className="flex items-center gap-2 text-[9px] tracking-[.04em] text-mute uppercase">
                <span className="w-16 flex-none" />
                <span className="flex flex-1 gap-2.5">
                  <span className="flex items-center gap-1">
                    <span className="h-[3px] w-2.5 rounded-sm bg-blue" />
                    You
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-[3px] w-2.5 rounded-sm bg-mute" />
                    Alumni
                  </span>
                </span>
                <span className="w-[26px] flex-none text-right">Gap</span>
              </div>
              {CATEGORIES.map((cat, i) => {
                const isWorst = i === worst
                const diff = gap.al[i] - MY_SCORES[i]
                const gapText = diff > 0 ? `−${diff}` : diff < 0 ? `+${-diff}` : '='
                return (
                  <div key={cat} className="flex items-center gap-2 text-[11px]">
                    <span className={`w-16 flex-none ${isWorst ? 'font-semibold text-acc' : 'text-mute'}`}>{cat}</span>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="h-1 overflow-hidden rounded-sm bg-sf2">
                        <div className={`h-full rounded-sm transition-[width] ${isWorst ? 'bg-acc' : 'bg-blue'}`} style={{ width: `${MY_SCORES[i]}%` }} />
                      </div>
                      <div className="h-1 overflow-hidden rounded-sm bg-sf2">
                        <div className="h-full rounded-sm bg-mute opacity-70" style={{ width: `${gap.al[i]}%` }} />
                      </div>
                    </div>
                    <span className={`w-[26px] flex-none text-right font-semibold ${isWorst ? 'text-acc' : 'text-mute'}`}>{gapText}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-[3px] rounded-[14px] bg-sf2 px-3 py-2.5">
              <div className="text-[10px] font-semibold tracking-[.06em] text-acc uppercase">Top gap · {CATEGORIES[worst]}</div>
              <div className="text-[13px] leading-[1.3] font-semibold">{gap.gap}</div>
              <div className="text-[12px] leading-[1.4] text-mute">Next: {gap.next}</div>
            </div>
          </div>
        )}
      </div>

      {/* Right column: the pick circle, and a remove button for areas the student added */}
      <div className="flex flex-none flex-col items-center gap-2">
        <CheckCircle on={on} size={26} />
        {area.custom && (
          <button
            type="button"
            onClick={stop(onRemove)}
            aria-label={`Remove ${area.title}`}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-mute hover:bg-sf2"
          >
            <SmallX size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[14px] leading-[1.1] font-semibold whitespace-nowrap">{value}</div>
      <div className="mt-0.5 text-[10px] whitespace-nowrap text-mute">{label}</div>
    </div>
  )
}
