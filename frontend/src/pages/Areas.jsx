// 08 · Areas that may also fit your background
// Career areas suggested from the student's profile. Each card shows the salary curve,
// key numbers, and (on "See gaps") how the student compares with alumni in that area.
// The student picks as many as they like, and can add an area in their own words.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AreaCard from '../components/career/AreaCard.jsx'
import { SmallPlus, StickyFooter } from '../components/career/bits.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import Icon from '../components/Icon.jsx'
import Screen from '../components/Screen.jsx'
import { BackButton } from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { AREA_CHIPS, AREA_LIBRARY, AREAS, gapFor } from '../data/careerData.js'
import { useProfile } from '../profileStore.jsx'

// Finds up to 3 areas in the catalogue that match what the student typed.
// Each tag word found in the text scores 2, the area title found in the text scores 3,
// and each longer word of the text found in the title scores 1.
function findAreas(text) {
  const q = text.trim().toLowerCase()
  if (!q) return []
  return AREA_LIBRARY.map((area) => {
    let score = area.tags.reduce((n, tag) => n + (q.includes(tag) ? 2 : 0), 0)
    if (area.title.toLowerCase().includes(q)) score += 3
    score += q.split(/\s+/).filter((w) => w.length > 3 && area.title.toLowerCase().includes(w)).length
    return { area, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.area)
}

export default function Areas() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const picked = profile.areas.on
  const custom = profile.areas.custom

  const [openId, setOpenId] = useState(null) // the card whose gaps panel is open
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollTo, setScrollTo] = useState(null)
  const newCardRef = useRef(null)

  const allAreas = [...AREAS, ...custom]
  const count = picked.length

  const toggle = (id) => update('areas', { on: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id] })

  const remove = (id) => update('areas', { custom: custom.filter((c) => c.id !== id), on: picked.filter((x) => x !== id) })

  // Adds an area (from the catalogue, or exactly as typed) and picks it.
  const addArea = (area) => {
    const id = 'c' + Date.now()
    const item = { id, title: area.title, desc: area.desc, g: area.g, start: area.start, range: area.range, alumni: area.alumni, custom: true }
    update('areas', { custom: [...custom, item], on: [...picked, id] })
    setSheetOpen(false)
    setScrollTo(id)
  }

  useEffect(() => {
    if (scrollTo && newCardRef.current) {
      newCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollTo(null)
    }
  }, [scrollTo])

  return (
    <Screen>
      <div className="flex flex-1 flex-col px-2">
        <div className="flex h-11 flex-none items-center">
          <BackButton />
        </div>

        <h1 className="mt-[22px] font-display text-[34px] leading-[1.1] font-normal">
          Areas that may also&nbsp;<em>fit</em> your background.
        </h1>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-mute">
          <div className="h-2 w-2 flex-none rounded-full bg-blue" />
          Suggested from your profile · pick as many as feel right, narrow later
        </div>

        <div className="mt-[18px] flex flex-col gap-2.5">
          {allAreas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              gap={gapFor(area, Math.max(0, custom.findIndex((c) => c.id === area.id)))}
              on={picked.includes(area.id)}
              open={openId === area.id}
              onToggle={() => toggle(area.id)}
              onToggleGaps={() => setOpenId(openId === area.id ? null : area.id)}
              onRemove={() => remove(area.id)}
              cardRef={area.id === scrollTo ? newCardRef : null}
            />
          ))}
        </div>

        <div className="mt-3 flex items-start justify-between gap-3 text-[11px] text-mute">
          <span className="min-w-0 flex-1 leading-[1.4]">Salaries: UK grad medians · alumni: UCL LinkedIn, 2015–25</span>
          <button type="button" onClick={() => setSheetOpen(true)} className="flex flex-none items-center gap-[5px] py-0.5 font-semibold whitespace-nowrap text-acc">
            <SmallPlus />
            Add an area
          </button>
        </div>

        <StickyFooter>
          <PrimaryButton disabled={count === 0} onClick={() => navigate('/gaps')}>
            {count === 0 ? 'Select at least one area' : `Continue with ${count} area${count === 1 ? '' : 's'}`}
          </PrimaryButton>
          <Link to="/gaps" className="flex items-center gap-1.5 py-1 text-[14px] font-semibold text-acc">
            Check gap summary first
            <Icon name="chevron-right" size={14} strokeWidth={2.5} />
          </Link>
        </StickyFooter>
      </div>

      {sheetOpen && <AddAreaSheet onClose={() => setSheetOpen(false)} onAdd={addArea} />}
    </Screen>
  )
}

// "Add an area": the student describes the work in their own words and we suggest close matches.
function AddAreaSheet({ onClose, onAdd }) {
  const [text, setText] = useState('')
  const q = text.trim().toLowerCase()
  const matches = findAreas(text)

  // Adds exactly what was typed, with gentle default numbers.
  const addExact = () => {
    const t = text.trim()
    if (!t) return
    onAdd({
      title: t.charAt(0).toUpperCase() + t.slice(1, 40),
      desc: 'Added in your own words — we’ll refine the fit as you save routes and events.',
      g: 10,
      start: 36,
      range: '£32–42k',
      alumni: 0,
    })
  }

  return (
    <BottomSheet open title="Add an area" onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        <div>
          <div className="mb-2 text-[14px] font-semibold">What kind of work are you thinking of?</div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. something in sports, but on the business side"
            className="block min-h-[88px] w-full resize-none rounded-2xl bg-sf2 px-4 py-3.5 text-[16px] leading-[1.45] text-ink outline-none placeholder:text-mute"
          />
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2">
          {AREA_CHIPS.map((chip) => {
            const on = q === chip.toLowerCase()
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setText(chip)}
                className={`rounded-full px-[13px] py-2 text-[13px] font-semibold transition-colors ${on ? 'bg-acc text-acc-ink' : 'bg-sf2 text-ink'}`}
              >
                {chip}
              </button>
            )
          })}
        </div>

        {q && (
          <>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-mute">
              <div className="h-2 w-2 rounded-full bg-blue" />
              Matches from your profile
            </div>
            {matches.map((area) => (
              <button
                key={area.title}
                type="button"
                onClick={() => onAdd(area)}
                className="flex items-center gap-3 rounded-[18px] bg-sf2 px-3.5 py-3 text-left active:scale-[.985]"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[19px] leading-[1.15]">{area.title}</div>
                  <div className="mt-[3px] text-[12px] leading-[1.4] text-mute">{area.desc}</div>
                  <div className="mt-2 flex gap-3 text-[11px] text-mute">
                    <span>
                      <b className="font-semibold text-ink">{area.range}</b> median start
                    </span>
                    <span>
                      <b className="font-semibold text-ink">{area.alumni}</b> UCL alumni
                    </span>
                  </div>
                </div>
                <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-acc text-acc-ink">
                  <SmallPlus size={14} />
                </div>
              </button>
            ))}
            {matches.length === 0 && (
              <div className="text-[13px] leading-[1.45] text-mute">Nothing close in our catalogue yet — you can still add it as written.</div>
            )}
            <button
              type="button"
              onClick={addExact}
              className="flex items-center justify-between gap-2.5 rounded-[18px] border border-dashed border-mute px-3.5 py-3 text-left"
            >
              <div className="min-w-0 text-[13px] leading-[1.4]">
                <div className="font-semibold">None of these — add exactly what I typed</div>
                <div className="mt-0.5 truncate text-mute">“{text.trim()}”</div>
              </div>
              <Icon name="chevron-right" size={16} className="flex-none text-mute" />
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
