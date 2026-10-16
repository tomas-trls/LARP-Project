// 07b · Work values (onboarding step 6 of 6)
// Two parts, from the UCL Careers values activity:
//   1. "pick": the student picks their top 5 out of 14 values (plus any they add themselves)
//   2. "rate": they rate just those 5 on a 1-5 scale ("Not at all" to "Essential")
// Suggested routes are weighted by what they score highest.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet.jsx'
import { OwnTag, SmallPlus, SmallX, StickyFooter } from '../components/career/bits.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { RATING_LABELS, TOP_VALUES, WORK_VALUES } from '../data/careerData.js'
import { saveWorkValues } from '../live.js'
import { useProfile } from '../profileStore.jsx'

export default function WorkValues() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const ratings = profile.values.ratings // { valueKey: 1..5 }
  const custom = profile.values.custom // [{ id, title, desc }]
  const top = profile.values.top ?? ['0', '1', '2'] // keys of the picked values, in the order picked
  const topFull = top.length >= TOP_VALUES

  const [stage, setStage] = useState('pick') // 'pick' or 'rate'
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollTo, setScrollTo] = useState(null) // id of a value just added, so we can scroll to it
  const newCardRef = useRef(null)

  // Every value as { key, title, desc, custom }. Built-in values use their position as the key.
  const values = [
    ...WORK_VALUES.map(([title, desc], i) => ({ key: String(i), title, desc, custom: false })),
    ...custom.map((c) => ({ key: c.id, title: c.title, desc: c.desc, custom: true })),
  ]
  const topValues = top.map((key) => values.find((v) => v.key === key)).filter(Boolean)
  const rated = top.filter((key) => ratings[key] != null).length
  const allRated = top.length === TOP_VALUES && rated === top.length

  // Pick or un-pick a value. Un-picking also clears its rating. Nothing happens once 5 are picked.
  const toggleTop = (key) => {
    if (top.includes(key)) {
      const nextRatings = { ...ratings }
      delete nextRatings[key]
      update('values', { top: top.filter((k) => k !== key), ratings: nextRatings })
    } else if (!topFull) {
      update('values', { top: [...top, key] })
    }
  }

  // Tapping the same circle again clears the rating.
  const rate = (key, value) => {
    const next = { ...ratings }
    if (next[key] === value) delete next[key]
    else next[key] = value
    update('values', { ratings: next })
  }

  // A value the student adds is picked straight away if there is room in the top 5.
  const addValue = (title, desc) => {
    const id = 'c' + Date.now()
    update('values', {
      custom: [...custom, { id, title: title.slice(0, 30), desc }],
      top: topFull ? top : [...top, id],
    })
    setSheetOpen(false)
    setScrollTo(id)
  }

  // Go between the two parts, starting at the top of the page each time.
  const goTo = (next) => {
    setStage(next)
    window.scrollTo({ top: 0 })
  }

  // After adding a value, scroll it into view.
  useEffect(() => {
    if (scrollTo && newCardRef.current) {
      newCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollTo(null)
    }
  }, [scrollTo])

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        {/* On the rating part, Back returns to picking instead of leaving the page. */}
        <StepHeader step={6} onBack={stage === 'rate' ? () => goTo('pick') : undefined} />

        <h1 className="mt-[22px] font-display text-[34px] leading-[1.1] font-normal">
          What do you <em>value</em> in your dream work environment?
        </h1>

        {stage === 'pick' ? (
          <>
            <p className="mt-2 text-[14px] leading-normal text-mute">Pick your top 5. You’ll rate just those next.</p>

            {/* Two columns of value cards. Picked cards turn purple with a tick. */}
            <div className="mt-[18px] grid grid-cols-2 gap-2">
              {values.map((v) => {
                const on = top.includes(v.key)
                const locked = !on && topFull
                return (
                  <button
                    type="button"
                    key={v.key}
                    ref={v.key === scrollTo ? newCardRef : null}
                    onClick={locked ? undefined : () => toggleTop(v.key)}
                    aria-pressed={on}
                    className="relative box-border flex min-h-24 flex-col gap-1 rounded-[18px] px-3.5 pt-3.5 pb-3 text-left transition-[background,opacity] duration-200 select-none active:scale-[.97]"
                    style={{
                      background: on ? 'var(--acc)' : 'var(--sf)',
                      color: on ? 'var(--acc-ink)' : 'var(--ink)',
                      boxShadow: on ? 'none' : 'var(--ring)',
                      opacity: locked ? 0.45 : 1,
                      cursor: locked ? 'default' : 'pointer',
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-display text-[18px] leading-[1.1]">{v.title}</div>
                      {on && (
                        <div
                          className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#361A54] text-white"
                          style={{ animation: 'arPop .22s cubic-bezier(.2,.8,.3,1.2)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5 9-10" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {v.desc && (
                      <div className="text-[11px] leading-[1.35]" style={{ color: on ? 'rgba(54,26,84,.7)' : 'var(--mute)' }}>
                        {v.desc}
                      </div>
                    )}
                    {v.custom && (
                      <span className="mt-auto self-start rounded-full bg-white/25 px-1.5 py-0.5 text-[9px] font-semibold tracking-[.04em] uppercase">Your own</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[14px] leading-normal text-mute">Rate your top 5. Your routes are weighted by what you score highest.</p>

            {/* The scale labels stay at the top while the list scrolls */}
            <div className="sticky top-0 z-[2] mt-1 bg-bg pt-3.5 pb-2.5">
              <div className="relative rounded-2xl bg-sf px-4 pt-2 pb-2.5 shadow-ring">
                <div className="absolute top-1/2 right-[calc(16px+10%)] left-[calc(16px+10%)] h-px bg-line" />
                <div className="relative grid grid-cols-5 items-center justify-items-center text-center text-[10px] leading-[1.2] text-mute">
                  {RATING_LABELS.map((label, i) => (
                    <span key={label} className={`bg-sf px-[3px] py-0.5 ${i === 4 ? 'font-semibold text-ink' : ''}`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {topValues.map((v) => (
                <div key={v.key} className="relative flex flex-col gap-1.5 rounded-[20px] bg-sf px-4 pt-3.5 pb-2 shadow-ring">
                  <div className="pr-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-display text-[20px] leading-[1.1]">{v.title}</div>
                      {v.custom && <OwnTag>Your own</OwnTag>}
                    </div>
                    {v.desc && <div className="mt-[3px] text-[12px] leading-[1.4] text-mute">{v.desc}</div>}
                  </div>
                  {/* The x takes this value out of the top 5, so another can be picked */}
                  <button
                    type="button"
                    onClick={() => toggleTop(v.key)}
                    aria-label={`Swap ${v.title} for another value`}
                    title="Swap this one"
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-mute hover:bg-sf2"
                  >
                    <SmallX size={13} />
                  </button>
                  <div className="grid grid-cols-5 items-center justify-items-center" role="radiogroup" aria-label={v.title}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const on = ratings[v.key] === n
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={RATING_LABELS[n - 1]}
                          onClick={() => rate(v.key, n)}
                          className="flex h-11 w-11 items-center justify-center select-none active:scale-[.88]"
                        >
                          <span
                            className="h-[30px] w-[30px] rounded-full transition-colors duration-100"
                            style={{
                              background: on ? 'var(--acc)' : 'transparent',
                              border: `1.5px solid ${on ? 'var(--acc)' : 'var(--mute)'}`,
                              animation: on ? 'wvPop .15s ease-out' : 'none',
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => goTo('pick')} className="mt-3 flex items-center gap-1.5 self-start py-1.5 text-[13px] font-semibold text-acc">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              Change my top 5
            </button>
          </>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-mute">
          <span>UCL Careers values activity</span>
          <button type="button" onClick={() => setSheetOpen(true)} className="flex items-center gap-[5px] py-2 font-semibold text-acc">
            <SmallPlus />
            Add your own
          </button>
        </div>

        <StickyFooter>
          {stage === 'pick' ? (
            <>
              <div className="flex items-center gap-1.5 text-[12px] text-mute">
                <span className="font-semibold text-ink">
                  {top.length} of {TOP_VALUES} picked
                </span>
                <span>·</span>
                <span>{topFull ? 'Now rate them' : `Pick ${TOP_VALUES - top.length} more`}</span>
              </div>
              <PrimaryButton disabled={!topFull} onClick={() => goTo('rate')}>
                Rate my top 5
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[12px] text-mute">
                <span className="font-semibold text-ink">
                  {rated} of {top.length} rated
                </span>
                <span>·</span>
                <span>{allRated ? 'All set' : `${top.length - rated} left to rate`}</span>
              </div>
              <PrimaryButton
                disabled={!allRated}
                onClick={() => {
                  // Send the picks to the back end, most important (highest rating) first.
                  saveWorkValues([...topValues].sort((a, b) => (ratings[b.key] ?? 0) - (ratings[a.key] ?? 0)).map((v) => v.title))
                  navigate('/areas')
                }}
              >
                See my suggested routes
              </PrimaryButton>
            </>
          )}
        </StickyFooter>
      </div>

      {/* Remounts each time it opens, so the form starts empty */}
      {sheetOpen && <AddValueSheet onClose={() => setSheetOpen(false)} onAdd={addValue} />}
    </Screen>
  )
}

// The "Add your own value" form: a name (up to 30 letters) and an optional short description.
function AddValueSheet({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const ok = name.trim().length > 0
  const submit = () => ok && onAdd(name.trim(), desc.trim())
  const onEnter = (e) => e.key === 'Enter' && submit()
  const field = 'h-12 w-full rounded-[14px] bg-sf2 px-3.5 text-[15px] text-ink outline-none placeholder:text-mute'

  return (
    <BottomSheet
      open
      title="Add your own value"
      onClose={onClose}
      footer={
        <PrimaryButton disabled={!ok} onClick={submit} className="h-[52px] text-[15px]">
          Add
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <input autoFocus value={name} maxLength={30} placeholder="e.g. Remote working" onChange={(e) => setName(e.target.value.slice(0, 30))} onKeyDown={onEnter} className={field} />
          <div className="flex justify-between px-1 text-[11px] text-mute">
            <span>What matters to you at work</span>
            <span>{name.length}/30</span>
          </div>
        </div>
        <input value={desc} maxLength={80} placeholder="Short description (optional)" onChange={(e) => setDesc(e.target.value)} onKeyDown={onEnter} className={field} />
      </div>
    </BottomSheet>
  )
}
