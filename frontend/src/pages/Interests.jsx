// 06b · Hobbies grid (step 4 of 6): "Select hobbies & interests."
// Hobbies are grouped by category. The student can search, show more, add their own,
// and pick between 3 and 10. Below that: three optional questions and a free-text note.
// Used for social pairing only, never for jobs.
//
// The picked hobbies are saved in profile.interests.on (e.g. '🧗 Bouldering'), so other screens can use them.
// Hobbies the student adds themselves are saved in profile.interests.custom, grouped by category.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddHobby, HOBBY_STYLES, HobbyChip } from '../components/onboarding/HobbyChips.jsx'
import {
  COUNTRIES,
  DRINK,
  HOBBY_CATEGORIES,
  HOBBY_LIMIT,
  HOBBY_MIN,
  HOBBY_SHOWN,
  RELATIONSHIP,
  hobbyKey,
} from '../components/onboarding/options.js'
import Sheet, { SheetOption, SheetSearch } from '../components/onboarding/Sheet.jsx'
import Screen from '../components/Screen.jsx'
import StepHeader from '../components/StepHeader.jsx'
import { PrimaryButton } from '../components/ui.jsx'
import { useProfile } from '../profileStore.jsx'

const OWN = 'Your own' // the category for hobbies added with "+ Add other interest"

// The three optional pickers. Each answer is saved in profile.interests under its key.
const PICKERS = {
  from: { title: 'Where are you from?', options: COUNTRIES, search: true },
  rel: { title: 'Relationship status', options: RELATIONSHIP },
  drink: { title: 'Do you drink?', options: DRINK },
}

export default function Interests() {
  const navigate = useNavigate()
  const { profile, update } = useProfile()
  const ints = profile.interests
  const custom = ints.custom ?? {} // { categoryName: ['🎻 Violin', ...] }

  const [query, setQuery] = useState('') // the search box
  const [expanded, setExpanded] = useState([]) // categories opened with "Show more"
  const [adding, setAdding] = useState(null) // the category whose "+ Add" form is open
  const [bounce, setBounce] = useState(null) // the chip that was just switched on
  const bounceTimer = useRef(null)
  const [picker, setPicker] = useState(null) // 'from' | 'rel' | 'drink' | null
  const [pickerQuery, setPickerQuery] = useState('')

  const setInts = (patch) => update('interests', patch)
  const count = ints.on.length
  const full = count >= HOBBY_LIMIT
  const isOn = (name) => ints.on.some((x) => hobbyKey(x) === hobbyKey(name))

  // Switch a hobby on or off. Nothing new can be switched on once 10 are picked.
  function toggle(name) {
    if (isOn(name)) {
      setInts({ on: ints.on.filter((x) => hobbyKey(x) !== hobbyKey(name)) })
      return
    }
    if (full) return
    setInts({ on: [...ints.on, name] })
    setBounce(name)
    clearTimeout(bounceTimer.current)
    bounceTimer.current = setTimeout(() => setBounce(null), 300)
  }

  // Add a hobby the student typed to a category, and switch it on (if there is room).
  function addHobby(category, name) {
    const list = custom[category] ?? []
    const exists = list.some((x) => hobbyKey(x) === hobbyKey(name))
    setInts({
      custom: { ...custom, [category]: exists ? list : [...list, name] },
      on: isOn(name) || full ? ints.on : [...ints.on, name],
    })
    if (!expanded.includes(category)) setExpanded([...expanded, category])
    setAdding(null)
  }

  function removeHobby(category, name) {
    setInts({
      custom: { ...custom, [category]: (custom[category] ?? []).filter((x) => x !== name) },
      on: ints.on.filter((x) => hobbyKey(x) !== hobbyKey(name)),
    })
  }

  // Build what each category shows: its hobbies plus any added ones, filtered by the search,
  // and cut to 7 unless "Show more" was tapped (or the student is searching).
  const q = query.trim().toLowerCase()
  const categories = [...((custom[OWN] ?? []).length ? [{ name: OWN, items: [] }] : []), ...HOBBY_CATEGORIES]
    .map((cat) => {
      const items = [
        ...cat.items.map((name) => ({ name, mine: false })),
        ...(custom[cat.name] ?? []).map((name) => ({ name, mine: true })),
      ].filter((h) => !q || hobbyKey(h.name).includes(q))
      const open = expanded.includes(cat.name) || Boolean(q)
      return {
        name: cat.name,
        shown: open ? items : items.slice(0, HOBBY_SHOWN),
        hasMore: !q && items.length > HOBBY_SHOWN,
        open,
        visible: items.length > 0 || adding === cat.name,
      }
    })
    .filter((cat) => cat.visible)

  // The small line under the title.
  const countLine = full
    ? `You’ve picked ${HOBBY_LIMIT} · remove one to swap`
    : count === HOBBY_LIMIT - 1
      ? 'You can choose 1 more interest'
      : `${count} selected · choose up to ${HOBBY_LIMIT}`

  // One row of the "A bit about you" card. Unanswered optional rows use the quieter colour.
  function pickerRow(id, label, optional = false, last = false) {
    const value = PICKERS[id].options[ints[id] ?? 0]
    const quiet = optional && !ints[id]
    return (
      <button
        type="button"
        key={id}
        onClick={() => {
          setPicker(id)
          setPickerQuery('')
        }}
        className={`flex w-full items-center justify-between px-[18px] py-3.5 text-left text-[14px] select-none ${last ? '' : 'border-b border-line'}`}
      >
        <span>
          {label}
          {optional && <span className="text-mute"> · optional</span>}
        </span>
        <span className={quiet ? 'text-mute' : 'text-ink'}>{value} ›</span>
      </button>
    )
  }

  const sheet = picker && PICKERS[picker]
  const pq = pickerQuery.trim().toLowerCase()
  const options = sheet ? sheet.options.map((label, i) => ({ label, i })).filter(({ label }) => !pq || label.toLowerCase().includes(pq)) : []

  return (
    <Screen>
      <style>{HOBBY_STYLES}</style>
      <div className="flex flex-1 flex-col px-2">
        <StepHeader step={4} />
        <h1 className="mt-[22px] font-display text-[34px] leading-[1.08] font-normal">
          Select hobbies
          <br />& <em>interests.</em>
        </h1>
        <p className="mt-2 text-[14px] text-mute">{countLine}</p>

        {/* Search box */}
        <div className="mt-3.5 flex h-11 items-center gap-2.5 rounded-[14px] bg-sf px-3.5 text-mute shadow-ring">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search interests"
            aria-label="Search interests"
            className="h-11 min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
          />
          {q && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-sf2 text-[12px] text-ink">
              ×
            </button>
          )}
        </div>

        {/* One block per category */}
        <div className="mt-3 flex flex-col">
          {categories.map((cat) => (
            <div key={cat.name} className="flex flex-col gap-2.5 border-b border-line pt-3.5 pb-4">
              <div className="text-[15px] font-bold">{cat.name}</div>
              <div className="flex flex-wrap gap-2">
                {cat.shown.map((h) => (
                  <HobbyChip
                    key={h.name}
                    name={h.name}
                    on={isOn(h.name)}
                    locked={!isOn(h.name) && full}
                    bounce={bounce === h.name}
                    onToggle={() => toggle(h.name)}
                    onRemove={h.mine ? () => removeHobby(cat.name, h.name) : null}
                  />
                ))}
                {cat.name !== OWN && (
                  <AddHobby
                    open={adding === cat.name}
                    onOpen={() => setAdding(cat.name)}
                    onClose={() => setAdding(null)}
                    onAdd={(name) => addHobby(cat.name, name)}
                  />
                )}
              </div>
              {cat.hasMore && (
                <button
                  type="button"
                  onClick={() => setExpanded(cat.open ? expanded.filter((x) => x !== cat.name) : [...expanded, cat.name])}
                  className="py-0.5 text-center text-[13px] font-semibold text-acc select-none"
                >
                  {cat.open ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          ))}
          {categories.length === 0 && q && <div className="py-6 text-center text-[14px] text-mute">Nothing matches — add it as your own below.</div>}

          {/* Add a hobby that fits no category */}
          <div className="flex flex-wrap items-center gap-2 pt-3.5 pb-1">
            <AddHobby wide open={adding === OWN} onOpen={() => setAdding(OWN)} onClose={() => setAdding(null)} onAdd={(name) => addHobby(OWN, name)} />
          </div>
        </div>

        {/* Three optional questions; each opens a picker sheet */}
        <div className="mt-[18px] text-[12px] font-semibold tracking-[.06em] text-mute uppercase">A bit about you</div>
        <div className="mt-2.5 overflow-hidden rounded-[20px] bg-sf shadow-ring">
          {pickerRow('from', 'Where are you from?')}
          {pickerRow('rel', 'Relationship status', true)}
          {pickerRow('drink', 'Do you drink?', true, true)}
        </div>

        {/* A free-text note */}
        <div className="mt-3.5 min-h-[84px] rounded-[20px] bg-sf px-[18px] py-3.5 shadow-ring">
          <textarea
            value={ints.note ?? ''}
            onChange={(e) => setInts({ note: e.target.value })}
            placeholder='Anything else we should know? e.g. "New to London, looking for a Sunday football group."'
            aria-label="Anything else we should know?"
            className="m-0 block min-h-14 w-full resize-none border-none bg-transparent p-0 text-[14px] leading-normal text-ink outline-none placeholder:text-mute"
          />
        </div>

        {/* The main button stays at the bottom of the screen while the list scrolls */}
        <div className="sticky bottom-0 -mx-6 mt-auto bg-gradient-to-t from-bg from-70% to-transparent px-6 pt-3.5 pb-2">
          <PrimaryButton disabled={count < HOBBY_MIN} onClick={() => navigate('/onboarding/career')} className={count < HOBBY_MIN ? '!opacity-55' : ''}>
            {count < HOBBY_MIN ? `Pick at least ${HOBBY_MIN}` : `Continue · ${count} interest${count === 1 ? '' : 's'}`}
          </PrimaryButton>
        </div>
      </div>

      {sheet && (
        <Sheet title={sheet.title} onClose={() => setPicker(null)} maxHeight="72%">
          {sheet.search && <SheetSearch value={pickerQuery} onChange={setPickerQuery} placeholder="Search countries" />}
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            {options.map(({ label, i }) => (
              <SheetOption
                key={label}
                label={label}
                selected={(ints[picker] ?? 0) === i}
                onPick={() => {
                  setInts({ [picker]: i })
                  setPicker(null)
                }}
              />
            ))}
            {options.length === 0 && <div className="px-0.5 py-[18px] text-[14px] text-mute">No matches — try a different spelling.</div>}
          </div>
        </Sheet>
      )}
    </Screen>
  )
}
