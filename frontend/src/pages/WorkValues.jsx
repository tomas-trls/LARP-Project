// 07b · Work values (onboarding step 6 of 6)
// The student rates 14 values from the UCL Careers values activity on a 1-5 scale
// ("Not at all" to "Essential") and can add values of their own.
// Suggested routes are weighted by what they score highest.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet.jsx'
import { OwnTag, SmallPlus, SmallX, StickyFooter } from '../components/career/bits.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { RATING_LABELS, WORK_VALUES } from '../data/careerData.js'
import { useProfile } from '../profileStore.jsx'

export default function WorkValues() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const ratings = profile.values.ratings // { valueKey: 1..5 }
  const custom = profile.values.custom // [{ id, title, desc }]

  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollTo, setScrollTo] = useState(null) // id of a value just added, so we can scroll to it
  const newCardRef = useRef(null)

  // Every value as { key, title, desc, custom }. Built-in values use their position as the key.
  const values = [
    ...WORK_VALUES.map(([title, desc], i) => ({ key: String(i), title, desc, custom: false })),
    ...custom.map((c) => ({ key: c.id, title: c.title, desc: c.desc, custom: true })),
  ]
  const rated = values.filter((v) => ratings[v.key] != null).length
  const allRated = rated === values.length

  // Tapping the same circle again clears the rating.
  const rate = (key, value) => {
    const next = { ...ratings }
    if (next[key] === value) delete next[key]
    else next[key] = value
    update('values', { ratings: next })
  }

  const addValue = (title, desc) => {
    const id = 'c' + Date.now()
    update('values', { custom: [...custom, { id, title: title.slice(0, 30), desc }] })
    setSheetOpen(false)
    setScrollTo(id)
  }

  const removeValue = (id) => {
    const next = { ...ratings }
    delete next[id]
    update('values', { ratings: next, custom: custom.filter((c) => c.id !== id) })
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
        <StepHeader step={6} />

        <h1 className="mt-[22px] font-display text-[34px] leading-[1.1] font-normal">
          What do you <em>value</em> in your dream work environment?
        </h1>
        <p className="mt-2 text-[14px] leading-normal text-mute">Rate each one. Your routes are weighted by what you score highest.</p>

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
          {values.map((v) => (
            <div key={v.key} ref={v.key === scrollTo ? newCardRef : null} className="relative flex flex-col gap-1.5 rounded-[20px] bg-sf px-4 pt-3.5 pb-2 shadow-ring">
              <div className="pr-7">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-display text-[20px] leading-[1.1]">{v.title}</div>
                  {v.custom && <OwnTag>Your own</OwnTag>}
                </div>
                {v.desc && <div className="mt-[3px] text-[12px] leading-[1.4] text-mute">{v.desc}</div>}
              </div>
              {v.custom && (
                <button
                  type="button"
                  onClick={() => removeValue(v.key)}
                  aria-label={`Remove ${v.title}`}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-mute hover:bg-sf2"
                >
                  <SmallX size={13} />
                </button>
              )}
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

        <div className="mt-3 flex items-center justify-between text-[11px] text-mute">
          <span>UCL Careers values activity</span>
          <button type="button" onClick={() => setSheetOpen(true)} className="flex items-center gap-[5px] py-2 font-semibold text-acc">
            <SmallPlus />
            Add your own
          </button>
        </div>

        <StickyFooter>
          <div className="flex items-center gap-1.5 text-[12px] text-mute">
            <span className="font-semibold text-ink">
              {rated} of {values.length} rated
            </span>
            <span>·</span>
            <span>{allRated ? 'All set' : `${values.length - rated} left to rate`}</span>
          </div>
          <PrimaryButton disabled={!allRated} onClick={() => navigate('/areas')}>
            See my suggested routes
          </PrimaryButton>
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
