// 09 · Gap summary
// Compares the student's five scores (Academics, Skills, Teamwork, Experience, Leadership)
// with UCL alumni now working in each area they picked on screen 08,
// then lists the gaps to close, smallest fit first.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ring, StickyFooter } from '../components/career/bits.jsx'
import SpiderChart from '../components/career/SpiderChart.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { AREAS, CATEGORIES, MY_SCORES as SAMPLE_SCORES, gapFor, worstCategory } from '../data/careerData.js'
import { useRouteGaps } from '../live.js'
import { useProfile } from '../profileStore.jsx'

export default function Gaps() {
  const { profile } = useProfile()
  const custom = profile.areas.custom
  const [focus, setFocus] = useState(null) // the area highlighted on the chart (tap a card)

  // The picked areas, each with its gap details.
  // Real gaps for the student's saved routes if the back end has them; otherwise the sample areas.
  const realRoutes = useRouteGaps()
  const samplePicked = [...AREAS, ...custom]
    .filter((a) => profile.areas.on.includes(a.id))
    .map((area) => {
      const gap = gapFor(area, Math.max(0, custom.findIndex((c) => c.id === area.id)))
      return { area, gap, worst: worstCategory(gap.al) }
    })
  const picked = realRoutes ?? samplePicked
  // "You" on the chart: the average of the student's scores across the routes (or the sample scores).
  const MY_SCORES = realRoutes
    ? CATEGORIES.map((_, i) => Math.round(realRoutes.reduce((n, r) => n + r.mine[i], 0) / realRoutes.length))
    : SAMPLE_SCORES
  const avgFit = picked.length ? Math.round(picked.reduce((n, x) => n + x.gap.fit, 0) / picked.length) : 0
  const ranked = [...picked].sort((x, y) => x.gap.fit - y.gap.fit) // lowest fit = biggest impact first
  const fade = (key) => (focus && focus !== key ? 0.4 : 1)

  const areaWord = picked.length === 1 ? picked[0].area.title.toLowerCase() : `your ${picked.length} areas`

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <div className="flex h-11 flex-none items-center">
          <BackButton />
        </div>

        <div className="mt-[22px] flex items-end justify-between gap-3">
          <h1 className="font-display text-[30px] leading-[1.1] font-normal">
            What would <em>strengthen</em> you in {areaWord}
          </h1>
          <Ring value={avgFit} size={64} inner={48} innerBg="var(--bg)" fontSize={13} />
        </div>
        <div className="mt-1 text-right text-[11px] text-mute">average fit across your selected areas</div>
        <div className="mt-2.5 flex items-start gap-2 text-[12px] leading-[1.4] text-mute">
          <div className="mt-[5px] h-2 w-2 flex-none rounded-full bg-blue" />
          <span>
            From your CV, work values and {picked.length} area{picked.length === 1 ? '' : 's'} · vs UCL alumni now working in{' '}
            {picked.map((x) => x.area.title.toLowerCase()).join(', ')}
          </span>
        </div>

        <div className="mt-3.5 flex flex-col gap-3.5">
          {picked.length === 0 ? (
            <div className="rounded-[20px] bg-sf p-[18px] text-[14px] leading-normal text-mute shadow-ring">
              No areas selected yet — go back and pick at least one to see your gaps.
            </div>
          ) : (
            <>
              {/* Spider chart and legend */}
              <div className="flex flex-col items-center gap-2">
                <SpiderChart myScores={MY_SCORES} shapes={picked.map((x) => ({ key: x.area.id, scores: x.gap.al, color: x.gap.color }))} focus={focus} />
                <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-[11px] text-mute">
                  <div className="flex items-center gap-1.5">
                    <div className="h-0.5 w-3.5 flex-none bg-ink" />
                    You
                  </div>
                  {picked.map((x) => (
                    <div key={x.area.id} className="flex items-center gap-1.5 transition-opacity" style={{ opacity: fade(x.area.id) }}>
                      <div className="h-0 w-3.5 flex-none border-t-2 border-dashed" style={{ borderColor: x.gap.color }} />
                      Alumni in {x.area.title}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-mute opacity-80">
                  {focus ? 'Tap the card again to show all areas' : 'Tap an area card to highlight it on the graph'}
                </div>
              </div>

              {/* One card per area: tap to highlight it on the chart */}
              <div className="grid grid-cols-2 gap-2">
                {picked.map((x) => (
                  <button
                    key={x.area.id}
                    type="button"
                    onClick={() => setFocus(focus === x.area.id ? null : x.area.id)}
                    aria-pressed={focus === x.area.id}
                    className="flex items-center gap-2.5 rounded-[18px] bg-sf p-3 text-left transition-[box-shadow,opacity] select-none active:scale-[.98]"
                    style={{
                      boxShadow: focus === x.area.id ? `0 0 0 2px ${x.gap.color}` : 'var(--ring)',
                      opacity: focus && focus !== x.area.id ? 0.55 : 1,
                    }}
                  >
                    <Ring value={x.gap.fit} color={x.gap.color} size={40} inner={30} fontSize={10} />
                    <div className="min-w-0 flex-1 text-[12px] leading-[1.3]">
                      <div className="font-semibold text-pretty">{x.area.title}</div>
                      <div className="mt-0.5 text-[11px] text-mute">Biggest gap: {CATEGORIES[x.worst]}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Score table */}
              <div className="flex flex-col gap-1.5 rounded-[18px] bg-sf px-3.5 py-3 text-[12px] shadow-ring">
                <div className="flex items-center gap-1.5 text-[10px] tracking-[.04em] text-mute uppercase">
                  <span className="flex-1">Score</span>
                  <span className="w-[34px] text-right text-ink">You</span>
                  {picked.map((x) => (
                    <span key={x.area.id} className="w-[52px] truncate text-right" style={{ color: x.gap.color, opacity: fade(x.area.id) }}>
                      {x.area.title.split(' ')[0]}
                    </span>
                  ))}
                </div>
                {CATEGORIES.map((cat, i) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className="flex-1 text-mute">{cat}</span>
                    <span className="w-[34px] text-right font-semibold">{MY_SCORES[i]}</span>
                    {picked.map((x) => (
                      <span
                        key={x.area.id}
                        className="w-[52px] text-right transition-opacity"
                        style={{
                          color: i === x.worst ? x.gap.color : 'var(--mute)',
                          fontWeight: i === x.worst ? 700 : 500,
                          opacity: fade(x.area.id),
                        }}
                      >
                        {x.gap.al[i]}
                      </span>
                    ))}
                  </div>
                ))}
                <div className="mt-0.5 text-[10px] text-mute">Bold = biggest gap in that area</div>
              </div>

              {/* Gaps to close, ranked */}
              <div>
                <div className="text-[12px] font-semibold tracking-[.08em] text-mute uppercase">
                  {ranked.length} gap{ranked.length === 1 ? '' : 's'} to close · ranked by impact
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {ranked.map((x, i) => (
                    <div key={x.area.id} className="flex items-start gap-3 rounded-[20px] bg-sf px-3.5 py-[11px] shadow-ring">
                      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-[10px] bg-hero text-[13px] font-semibold text-white">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] leading-[1.3] font-semibold">{x.gap.gap}</div>
                        <div className="mt-[3px] flex flex-wrap items-center gap-1.5 text-[13px] leading-[1.45] text-mute">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-none rounded-full" style={{ background: x.gap.color }} />
                            {x.area.title}
                          </span>
                          <span>·</span>
                          <span>{x.gap.next}</span>
                        </div>
                      </div>
                      <Icon name="chevron-right" size={18} className="mt-1.5 flex-none text-mute" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <StickyFooter>
          <PrimaryButton to="/home">Save my plan</PrimaryButton>
          <Link to="/areas" className="py-1 text-[14px] text-mute">
            Back to areas
          </Link>
        </StickyFooter>
      </div>
    </Screen>
  )
}
